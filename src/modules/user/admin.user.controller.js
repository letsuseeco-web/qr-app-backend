const pool = require("../../db");
const { logAdmin } = require("../../utils/logger.util");
const { PLAN_STATUS, PLAN_TYPES } = require("../../utils/plan.util");

async function backfillMissingUserPlans() {
  await pool.query(
    `INSERT INTO user_plans (user_id, plan, status)
     SELECT u.id, $1, $2
     FROM users u
     LEFT JOIN user_plans up
       ON up.user_id = u.id
     WHERE up.user_id IS NULL`,
    [PLAN_TYPES.FREE, PLAN_STATUS.ACTIVE]
  );
}

exports.getAllUsers = async (req, res) => {
  try {
    await backfillMissingUserPlans();

    const result = await pool.query(
      `SELECT
         u.id,
         u.user_code,
         u.name,
         u.phone,
         w.balance,
         u.created_at,
         COALESCE(up.plan, 'FREE') AS plan
       FROM users u
       LEFT JOIN wallets w
         ON u.id = w.user_id
       LEFT JOIN user_plans up
         ON up.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    await logAdmin(null, "VIEW_ALL_USERS", "ALL");

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { user_id } = req.params;
    await backfillMissingUserPlans();

    const userRes = await pool.query(
      `SELECT
         u.id,
         u.user_code,
         u.name,
         u.phone,
         u.referral_code,
         u.referred_by,
         u.created_at,
         COALESCE(up.plan, 'FREE') AS plan,
         up.end_date AS plan_end_date,
         ref.name AS referred_by_name
       FROM users u
       LEFT JOIN user_plans up
         ON up.user_id = u.id
       LEFT JOIN users ref
         ON u.referred_by = ref.referral_code
       WHERE u.id = $1`,
      [user_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];
    user.referred_by_name = user.referred_by_name || "Direct User";

    const wallet = await pool.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [user_id]
    );

    const qrs = await pool.query(
      `SELECT
         qr_code,
         user_tag,
         operational_status,
         ownership_status,
         activated_at
       FROM qr_codes
       WHERE assigned_to_user = $1`,
      [user_id]
    );

    const contacts = await pool.query(
      "SELECT name, relation, phone FROM emergency_contacts WHERE user_id = $1",
      [user_id]
    );

    const profile = await pool.query(
      `SELECT gender, date_of_birth
       FROM user_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [user_id]
    );

    const medical = await pool.query(
      `SELECT blood_group, conditions, allergies
       FROM medical_records
       WHERE user_id = $1
       LIMIT 1`,
      [user_id]
    );

    const referrals = await pool.query(
      `SELECT name, phone, created_at
       FROM users
       WHERE referred_by = (
         SELECT referral_code FROM users WHERE id = $1
       )
       ORDER BY created_at DESC`,
      [user_id]
    );

    const transactions = await pool.query(
      `SELECT type, source, amount, balance_after, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user_id]
    );

    await logAdmin(null, "VIEW_USER_DETAILS", user_id);

    res.json({
      user,
      profile: profile.rows[0] || null,
      medical: medical.rows[0] || null,
      wallet: wallet.rows[0] || { balance: 0 },
      qr_codes: qrs.rows,
      contacts: contacts.rows,
      transactions: transactions.rows,
      referrals: referrals.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
