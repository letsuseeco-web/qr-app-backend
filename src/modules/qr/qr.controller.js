const pool = require("../../db");
const { logActivation, logUserQR } = require("../../utils/logger.util");
const { getSettingsMap } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

async function getOwnedQR(client, userId, qrCode) {
  const result = await client.query(
    `SELECT *
     FROM qr_codes
     WHERE qr_code = $1
       AND assigned_to_user = $2
     LIMIT 1`,
    [qrCode, userId]
  );

  return result.rows[0] || null;
}

exports.activateQR = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;
    const { qr_code, pin } = req.body;
    const settings = await getSettingsMap(client, ["qr", "limits"]);
    const maxAttempts = Number(settings.qr.activation_attempt_limit || 5);
    const lockMinutes = Number(settings.qr.activation_lock_minutes || 15);
    const maxQrPerUser = Number(settings.limits.max_qr_per_user || 10);

    const assignedCountResult = await client.query(
      `SELECT COUNT(*) AS count
       FROM qr_codes
       WHERE assigned_to_user = $1
         AND ownership_status = 'assigned'`,
      [user_id]
    );

    const assignedCount = Number(assignedCountResult.rows[0]?.count || 0);

    if (assignedCount >= maxQrPerUser) {
      await client.query("ROLLBACK");
      return sendError(res, "Maximum QR limit reached", 400);
    }

    const qrResult = await client.query(
      `SELECT *
       FROM qr_codes
       WHERE qr_code = $1
       LIMIT 1`,
      [qr_code]
    );

    if (qrResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, "QR not found", 404);
    }

    const qr = qrResult.rows[0];

    if (qr.locked_until && new Date(qr.locked_until) > new Date()) {
      await client.query("ROLLBACK");
      return sendError(res, "QR is temporarily locked. Try later.", 403);
    }

    if (qr.pin !== pin) {
      const attempts = Number(qr.failed_attempts || 0) + 1;
      const lockTime = attempts >= maxAttempts
        ? new Date(Date.now() + lockMinutes * 60000)
        : null;

      await client.query(
        `UPDATE qr_codes
         SET failed_attempts = $1,
             locked_until = $2
         WHERE qr_code = $3`,
        [attempts, lockTime, qr_code]
      );

      await logActivation(client, qr_code, false);
      await client.query("COMMIT");

      return sendError(res, "Invalid PIN", 400, {
        data: {
          attempts
        }
      });
    }

    if (qr.ownership_status !== "unused") {
      await client.query("ROLLBACK");
      return sendError(res, "QR already used", 400);
    }

    const updated = await client.query(
      `UPDATE qr_codes
       SET ownership_status = 'assigned',
           assigned_to_user = $1,
           activated_at = NOW(),
           failed_attempts = 0,
           locked_until = NULL
       WHERE qr_code = $2
       RETURNING *`,
      [user_id, qr_code]
    );

    await logActivation(client, qr_code, true);
    await logUserQR(user_id, qr_code, "ACTIVATED");
    await client.query("COMMIT");

    return sendSuccess(res, updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
};

exports.getMyQRs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         q.qr_code,
         q.ownership_status,
         q.operational_status,
         q.user_tag,
         q.failed_attempts,
         q.locked_until,
         q.created_at,
         q.activated_at,
         q.reward,
         q.batch_id,
         COALESCE(COUNT(qcm.contact_id), 0) AS contact_count
       FROM qr_codes q
       LEFT JOIN qr_contact_mapping qcm
         ON qcm.qr_code = q.qr_code
       WHERE q.assigned_to_user = $1
       GROUP BY q.qr_code
       ORDER BY q.created_at DESC`,
      [req.user.user_id]
    );

    return sendSuccess(res, result.rows);
  } catch (error) {
    console.error(error);
    return sendError(res, error.message, 500);
  }
};

exports.getMyQRDetails = async (req, res) => {
  try {
    const { qr_code } = req.params;

    const qr = await getOwnedQR(pool, req.user.user_id, qr_code);

    if (!qr) {
      return sendError(res, "QR not found", 404);
    }

    const contactsResult = await pool.query(
      `SELECT ec.id, ec.name, ec.phone, ec.relation, qcm.is_primary
       FROM qr_contact_mapping qcm
       JOIN emergency_contacts ec
         ON ec.id = qcm.contact_id
       WHERE qcm.qr_code = $1
       ORDER BY ec.created_at ASC`,
      [qr_code]
    );

    return sendSuccess(res, {
      qr,
      contacts: contactsResult.rows
    });
  } catch (error) {
    console.error(error);
    return sendError(res, error.message, 500);
  }
};

exports.updateQRTag = async (req, res) => {
  try {
    const { qr_code } = req.params;
    const { user_tag } = req.body;

    const result = await pool.query(
      `UPDATE qr_codes
       SET user_tag = $1
       WHERE qr_code = $2
         AND assigned_to_user = $3
       RETURNING *`,
      [user_tag || null, qr_code, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "QR not found", 404);
    }

    await logUserQR(req.user.user_id, qr_code, "TAG_UPDATED");

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error(error);
    return sendError(res, error.message, 500);
  }
};

exports.updateQRStatus = async (req, res) => {
  try {
    const { qr_code } = req.params;
    const { operational_status } = req.body;

    const result = await pool.query(
      `UPDATE qr_codes
       SET operational_status = $1
       WHERE qr_code = $2
         AND assigned_to_user = $3
       RETURNING *`,
      [operational_status, qr_code, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "QR not found", 404);
    }

    await logUserQR(req.user.user_id, qr_code, `STATUS_${operational_status.toUpperCase()}`);

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error(error);
    return sendError(res, error.message, 500);
  }
};

exports.getQRHistory = async (req, res) => {
  try {
    const { qr_code } = req.params;
    const qr = await getOwnedQR(pool, req.user.user_id, qr_code);

    if (!qr) {
      return sendError(res, "QR not found", 404);
    }

    const [activationLogs, scanLogs, lostLogs, userLogs] = await Promise.all([
      pool.query(
        `SELECT id, qr_code, success, attempted_at
         FROM activation_logs
         WHERE qr_code = $1
         ORDER BY attempted_at DESC`,
        [qr_code]
      ),
      pool.query(
        `SELECT id, qr_code, ip_address, device_info, scanned_at, location
         FROM scan_logs
         WHERE qr_code = $1
         ORDER BY scanned_at DESC`,
        [qr_code]
      ),
      pool.query(
        `SELECT id, qr_code, status, reward, created_at
         FROM lost_logs
         WHERE qr_code = $1
         ORDER BY created_at DESC`,
        [qr_code]
      ),
      pool.query(
        `SELECT id, user_id, qr_code, action, created_at
         FROM user_qr_logs
         WHERE user_id = $1
           AND qr_code = $2
         ORDER BY created_at DESC`,
        [req.user.user_id, qr_code]
      )
    ]);

    return sendSuccess(res, {
      activations: activationLogs.rows,
      scans: scanLogs.rows,
      lost_events: lostLogs.rows,
      user_actions: userLogs.rows
    });
  } catch (error) {
    console.error(error);
    return sendError(res, error.message, 500);
  }
};
