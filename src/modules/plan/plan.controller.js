const pool = require("../../db");
const { addTransaction } = require("../../utils/wallet.util");
const {
  PLAN_STATUS,
  PLAN_TYPES,
  ensureDefaultPlans,
  normalizeUserPlan,
  getActivePlanByName
} = require("../../utils/plan.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

exports.getPublicPlans = async (req, res) => {
  try {
    await ensureDefaultPlans(pool);

    const result = await pool.query(
      `SELECT id, name, price, duration_days, is_active
       FROM plans
       WHERE is_active = TRUE
       ORDER BY id ASC`
    );

    return sendSuccess(res, result.rows);

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.getMyPlan = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;
    const userPlan = await normalizeUserPlan(client, user_id);

    const premiumPlan = await getActivePlanByName(client, PLAN_TYPES.PREMIUM);

    await client.query("COMMIT");

    return sendSuccess(res, {
      current_plan: userPlan,
      premium_plan: premiumPlan
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};

exports.subscribe = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;

    const premiumPlan = await getActivePlanByName(client, PLAN_TYPES.PREMIUM);

    if (!premiumPlan) {
      await client.query("ROLLBACK");
      return sendError(res, "Premium plan is not available", 404);
    }

    const currentPlan = await normalizeUserPlan(client, user_id);
    const now = new Date();
    const isAlreadyActive =
      currentPlan.plan === PLAN_TYPES.PREMIUM &&
      currentPlan.status === PLAN_STATUS.ACTIVE &&
      currentPlan.end_date &&
      new Date(currentPlan.end_date) > now;

    if (isAlreadyActive) {
      await client.query("COMMIT");
      return sendSuccess(res, {
        message: "Premium plan is already active",
        already_subscribed: true,
        plan: currentPlan
      });
    }

    const walletResult = await client.query(
      `SELECT balance
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [user_id]
    );

    if (walletResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, "Wallet not found", 404);
    }

    const balance = Number(walletResult.rows[0].balance || 0);
    const price = Number(premiumPlan.price || 0);

    if (balance < price) {
      await client.query("ROLLBACK");
      return sendError(res, "Insufficient wallet balance", 400);
    }

    await addTransaction({
      client,
      user_id,
      type: "debit",
      source: "subscription",
      amount: price
    });

    const updatedPlan = await client.query(
      `UPDATE user_plans
       SET plan = $1,
           start_date = NOW(),
           end_date = NOW() + ($2 * INTERVAL '1 day'),
           status = $3,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [
        PLAN_TYPES.PREMIUM,
        Number(premiumPlan.duration_days || 0),
        PLAN_STATUS.ACTIVE,
        user_id
      ]
    );

    await client.query("COMMIT");

    return sendSuccess(res, {
      message: "Subscription activated successfully",
      already_subscribed: false,
      plan: updatedPlan.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};

exports.getUserPlan = async (req, res) => {
  return exports.getMyPlan(req, res);
};

exports.activateUserPlan = async (req, res) => {
  return exports.subscribe(req, res);
};

exports.getUserPlanHistory = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentPlan = await normalizeUserPlan(client, req.user.user_id);
    const transactions = await client.query(
      `SELECT id, type, source, amount, balance_after, created_at
       FROM transactions
       WHERE user_id = $1
         AND source = 'subscription'
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );

    await client.query("COMMIT");

    return sendSuccess(res, {
      current_plan: currentPlan,
      subscription_transactions: transactions.rows
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};
