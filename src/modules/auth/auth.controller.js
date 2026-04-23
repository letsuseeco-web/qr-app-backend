const jwt = require("jsonwebtoken");

const pool = require("../../db");
const { generateReferralCode } = require("../../utils/referral.util");
const { addTransaction, ensureWallet } = require("../../utils/wallet.util");
const { generateUserCode } = require("../../utils/user.util");
const { ensureUserPlan } = require("../../utils/plan.util");
const { getSetting } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

const otpStore = new Map();
const loginAttemptsStore = new Map();

function signUserToken(user) {
  return jwt.sign(
    {
      user_id: user.id,
      user_code: user.user_code,
      phone: user.phone
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    referral_code: user.referral_code || null,
    referred_by: user.referred_by || null,
    created_at: user.created_at,
    user_code: user.user_code || null
  };
}

async function getUserByPhone(client, phone) {
  const result = await client.query(
    `SELECT id, phone, name, referral_code, referred_by, created_at, user_code
     FROM users
     WHERE phone = $1
     LIMIT 1`,
    [phone]
  );

  return result.rows[0] || null;
}

async function applyReferralReward(client, referral_input, referralCode, rewards) {
  if (!rewards.referral_enabled || !referral_input) {
    return null;
  }

  if (referral_input === referralCode) {
    throw new Error("You cannot use your own referral code");
  }

  const refUser = await client.query(
    `SELECT id
     FROM users
     WHERE referral_code = $1
     LIMIT 1`,
    [referral_input]
  );

  if (refUser.rows.length === 0) {
    throw new Error("Invalid referral code");
  }

  const countRes = await client.query(
    `SELECT COUNT(*) AS count
     FROM users
     WHERE referred_by = $1`,
    [referral_input]
  );

  const referralCount = Number(countRes.rows[0].count || 0);
  const maxLimit = Number(rewards.max_referrals || 10);

  if (referralCount >= maxLimit) {
    throw new Error("Referral limit reached");
  }

  return refUser.rows[0].id;
}

async function provisionUserRelations(client, userId) {
  await ensureWallet(client, userId);
  await ensureUserPlan(client, userId);
}

async function createUser(client, payload) {
  const { phone, name, referral_input } = payload;
  const rewards = await getSetting(client, "rewards");
  const referralCode = generateReferralCode(phone);
  const userCode = await generateUserCode(client);
  const referrerId = await applyReferralReward(client, referral_input, referralCode, rewards);

  const userResult = await client.query(
    `INSERT INTO users (phone, name, referral_code, referred_by, user_code)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, phone, name, referral_code, referred_by, created_at, user_code`,
    [phone, name, referralCode, referral_input || null, userCode]
  );

  const user = userResult.rows[0];

  await provisionUserRelations(client, user.id);

  if (Number(rewards.new_user_reward || 0) > 0) {
    await addTransaction({
      client,
      user_id: user.id,
      type: "credit",
      source: "signup_bonus",
      amount: rewards.new_user_reward
    });
  }

  if (referrerId && Number(rewards.referrer_reward || 0) > 0) {
    await addTransaction({
      client,
      user_id: referrerId,
      type: "credit",
      source: "referral_bonus",
      amount: rewards.referrer_reward
    });
  }

  return user;
}

async function buildAuthPayload(client, user) {
  await provisionUserRelations(client, user.id);

  return {
    token: signUserToken(user),
    user: sanitizeUser(user)
  };
}

async function sendExistingUserAuthResponse(res, user, status = 200) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const payload = await buildAuthPayload(client, user);
    await client.query("COMMIT");

    return sendSuccess(res, {
      ...payload,
      is_new_user: false
    }, status);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function getAttemptState(phone) {
  return loginAttemptsStore.get(phone) || { count: 0 };
}

function registerFailedAttempt(phone) {
  const current = getAttemptState(phone);
  loginAttemptsStore.set(phone, { count: current.count + 1 });
}

function clearAttempts(phone) {
  loginAttemptsStore.delete(phone);
}

async function assertAttemptsAllowed(phone) {
  const settings = await getSetting(pool, "auth");
  const current = getAttemptState(phone);
  const maxAttempts = Number(settings.max_login_attempts || 5);

  if (current.count >= maxAttempts) {
    throw new Error("Maximum login attempts reached");
  }
}

exports.signup = async (req, res) => {
  const client = await pool.connect();

  try {
    const { phone, name, referral_input } = req.body;

    await client.query("BEGIN");

    const existingUser = await getUserByPhone(client, phone);

    if (existingUser) {
      const payload = await buildAuthPayload(client, existingUser);
      await client.query("COMMIT");
      return sendSuccess(res, {
        ...payload,
        is_new_user: false
      });
    }

    const user = await createUser(client, { phone, name, referral_input });
    const payload = await buildAuthPayload(client, user);

    await client.query("COMMIT");

    return sendSuccess(res, {
      ...payload,
      is_new_user: true
    }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);

    if (err.code === "23505") {
      const existingUser = await getUserByPhone(pool, req.body.phone);

      if (existingUser) {
        return sendExistingUserAuthResponse(res, existingUser);
      }
    }

    return sendError(res, err.message, 400);
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const client = await pool.connect();

  try {
    const { phone } = req.body;
    await assertAttemptsAllowed(phone);

    await client.query("BEGIN");

    const user = await getUserByPhone(client, phone);

    if (!user) {
      await client.query("ROLLBACK");
      registerFailedAttempt(phone);
      return sendError(res, "User not found", 404);
    }

    const payload = await buildAuthPayload(client, user);

    await client.query("COMMIT");
    clearAttempts(phone);

    return sendSuccess(res, payload);
  } catch (err) {
    if (err.message !== "User not found") {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Login rollback failed:", rollbackError.message);
      }
    }

    console.error(err.message);
    return sendError(res, err.message, err.message === "Maximum login attempts reached" ? 429 : 400);
  } finally {
    client.release();
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const authSettings = await getSetting(pool, "auth");
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresInMinutes = Number(authSettings.otp_expiry_minutes || 5);

    otpStore.set(phone, {
      otp,
      expires_at: Date.now() + expiresInMinutes * 60 * 1000
    });

    const response = {
      phone,
      otp_sent: true,
      expires_in_minutes: expiresInMinutes
    };

    if (process.env.NODE_ENV !== "production") {
      response.mock_otp = otp;
    }

    return sendSuccess(res, response);
  } catch (err) {
    console.error(err.message);
    return sendError(res, err.message, 500);
  }
};

exports.verifyOtp = async (req, res) => {
  const client = await pool.connect();

  try {
    const { phone, otp, name, referral_input } = req.body;
    await assertAttemptsAllowed(phone);

    const otpRecord = otpStore.get(phone);

    if (!otpRecord) {
      return sendError(res, "OTP not found", 404);
    }

    if (otpRecord.expires_at < Date.now()) {
      otpStore.delete(phone);
      registerFailedAttempt(phone);
      return sendError(res, "OTP expired", 400);
    }

    if (otpRecord.otp !== otp) {
      registerFailedAttempt(phone);
      return sendError(res, "Invalid OTP", 400);
    }

    await client.query("BEGIN");

    let user = await getUserByPhone(client, phone);
    let isNewUser = false;

    if (!user) {
      if (!name) {
        await client.query("ROLLBACK");
        return sendError(res, "Name is required for new user", 400);
      }

      user = await createUser(client, {
        phone,
        name,
        referral_input
      });
      isNewUser = true;
    } else {
      await provisionUserRelations(client, user.id);
    }

    const payload = await buildAuthPayload(client, user);

    await client.query("COMMIT");

    otpStore.delete(phone);
    clearAttempts(phone);

    return sendSuccess(res, {
      ...payload,
      is_new_user: isNewUser
    }, isNewUser ? 201 : 200);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Verify OTP rollback failed:", rollbackError.message);
    }

    console.error(err.message);

    if (err.code === "23505") {
      const existingUser = await getUserByPhone(pool, req.body.phone);

      if (existingUser) {
        return sendExistingUserAuthResponse(res, existingUser);
      }
    }

    return sendError(res, err.message, err.message === "Maximum login attempts reached" ? 429 : 400);
  } finally {
    client.release();
  }
};

exports.logout = async (req, res) => {
  return sendSuccess(res, {
    logged_out: true
  });
};
