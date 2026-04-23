const pool = require("../../db");
const { sendSuccess, sendError } = require("../../utils/response.util");

// 🔹 Assign contacts to QR
exports.assignContactsToQR = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;
    const { qr_code, contact_ids } = req.body; // 🔥 FIX

    // 🔹 Validate input
    if (!qr_code || !Array.isArray(contact_ids)) {
      await client.query("ROLLBACK");
      return sendError(res, "Invalid input", 400);
    }

    // 🔹 Verify QR belongs to user
    const qrCheck = await client.query(
      "SELECT * FROM qr_codes WHERE qr_code = $1 AND assigned_to_user = $2",
      [qr_code, user_id]
    );

    if (qrCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, "Unauthorized QR access", 403);
    }

    if (contact_ids.length > 0) {
      const ownedContacts = await client.query(
        `SELECT id
         FROM emergency_contacts
         WHERE user_id = $1
           AND id = ANY($2::uuid[])`,
        [user_id, contact_ids]
      );

      if (ownedContacts.rows.length !== contact_ids.length) {
        await client.query("ROLLBACK");
        return sendError(res, "One or more contacts do not belong to the user", 403);
      }
    }

    // 🔹 Remove old mappings
    await client.query(
      "DELETE FROM qr_contact_mapping WHERE qr_code = $1",
      [qr_code]
    );

    // 🔹 Insert new mappings
    for (let contact_id of contact_ids) {
      await client.query(
        `INSERT INTO qr_contact_mapping (qr_code, contact_id)
         VALUES ($1, $2)`,
        [qr_code, contact_id]
      );
    }

    await client.query("COMMIT");

    return sendSuccess(res, { message: "Contacts assigned to QR" });

  } catch (err) {
    await client.query("ROLLBACK"); // 🔥 FIX
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};

// 🔹 Get contacts for QR
exports.getQRContacts = async (req, res) => {
  try {
    const { qr_code } = req.params;
    const user_id = req.user.user_id;

    const qrCheck = await pool.query(
      `SELECT 1
       FROM qr_codes
       WHERE qr_code = $1
         AND assigned_to_user = $2
       LIMIT 1`,
      [qr_code, user_id]
    );

    if (qrCheck.rows.length === 0) {
      return sendError(res, "Unauthorized QR access", 403);
    }

    const result = await pool.query(
      `SELECT ec.id, ec.name, ec.phone, ec.relation, qcm.is_primary
       FROM qr_contact_mapping qcm
       JOIN emergency_contacts ec ON ec.id = qcm.contact_id
       WHERE qcm.qr_code = $1`,
      [qr_code]
    );

    return sendSuccess(res, result.rows);

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
