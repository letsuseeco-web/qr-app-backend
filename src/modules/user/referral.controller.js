const pool = require("../../db");
const { sendSuccess, sendError } = require("../../utils/response.util");

exports.getReferrals = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT referral_code
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, "User not found", 404);
    }

    const referralCode = userResult.rows[0].referral_code;

    const [referrals, referralTransactions] = await Promise.all([
      pool.query(
        `SELECT id, name, phone, created_at
         FROM users
         WHERE referred_by = $1
         ORDER BY created_at DESC`,
        [referralCode]
      ),
      pool.query(
        `SELECT id, type, source, amount, balance_after, created_at
         FROM transactions
         WHERE user_id = $1
           AND source = 'referral_bonus'
         ORDER BY created_at DESC`,
        [req.user.user_id]
      )
    ]);

    return sendSuccess(res, {
      referral_code: referralCode || null,
      referrals: referrals.rows,
      rewards: referralTransactions.rows
    });
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
