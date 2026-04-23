const pool = require("../../db");
const { logLost, logUserQR } = require("../../utils/logger.util");
const { getSetting } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

// 🔹 Enable Lost Mode
exports.enableLostMode = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { qr_code, reward } = req.body;
    const rewardLimits = await getSetting(pool, "reward_limits");
    const minReward = Number(rewardLimits.min_reward_amount || 0);
    const maxReward = Number(rewardLimits.max_reward_amount || 0);

    if (Number(reward) < minReward || Number(reward) > maxReward) {
      return sendError(
        res,
        `Reward must be between ${minReward} and ${maxReward}`,
        400
      );
    }

    const result = await pool.query(
      `UPDATE qr_codes
       SET operational_status = 'lost',
           reward = $1
       WHERE qr_code = $2 AND assigned_to_user = $3`,
      [reward, qr_code, user_id]
    );

    if (result.rowCount === 0) {
      return sendError(res, "QR not found", 404);
    }

    // 🔥 Log
    await logLost(qr_code, "ENABLED", reward);
    await logUserQR(user_id, qr_code, "LOST_ENABLED");

    return sendSuccess(res, { message: "Lost mode enabled" });

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

// 🔹 Disable Lost Mode (Found)
exports.disableLostMode = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { qr_code } = req.body;

    const result = await pool.query(
      `UPDATE qr_codes
       SET operational_status = 'active',
           reward = 0
       WHERE qr_code = $1 AND assigned_to_user = $2`,
      [qr_code, user_id]
    );

    if (result.rowCount === 0) {
      return sendError(res, "QR not found", 404);
    }

    // 🔥 Log
    await logLost(qr_code, "RESOLVED", 0);
    await logUserQR(user_id, qr_code, "LOST_DISABLED");

    return sendSuccess(res, { message: "Lost mode disabled" });

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.getLostHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ll.id, ll.qr_code, ll.status, ll.reward, ll.created_at
       FROM lost_logs ll
       JOIN qr_codes q
         ON q.qr_code = ll.qr_code
       WHERE q.assigned_to_user = $1
       ORDER BY ll.created_at DESC`,
      [req.user.user_id]
    );

    return sendSuccess(res, result.rows);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
