const pool = require("../../db");
const { logScan } = require("../../utils/logger.util");
const { normalizeUserPlan } = require("../../utils/plan.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

exports.scanQR = async (req, res) => {
  const client = await pool.connect();

  try {
    const { qr_code } = req.params;

    // 🔥 GET IP
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    // 🔥 GET DEVICE
    const device = req.headers["user-agent"];

    // 🔹 1. Find QR
    const qrResult = await client.query(
      "SELECT * FROM qr_codes WHERE qr_code = $1",
      [qr_code]
    );

    if (qrResult.rows.length === 0) {
      return sendError(res, "QR not found", 404, {
        data: {
          status: "invalid"
        }
      });
    }

    const qr = qrResult.rows[0];

    // 🔥 2. LOG WITH FULL DATA
    await logScan(qr_code, ip, device);

    // 🔹 3. If QR not assigned
    if (qr.ownership_status === "unused") {
      return sendSuccess(res, {
        status: "unassigned",
        message: "QR not activated yet"
      });
    }

    // 🔹 4. Sleep mode
    if (qr.operational_status === "sleep") {
      return sendSuccess(res, {
        status: "inactive",
        message: "QR is in sleep mode"
      });
    }

    // 🔹 5. Lost mode
    if (qr.operational_status === "lost") {
      return sendSuccess(res, {
        status: "lost",
        message: "This item is marked as LOST. Please contact owner.",
        reward: qr.reward
      });
    }

    // 🔹 6. Disabled
    if (qr.operational_status === "disabled_by_admin") {
      return sendSuccess(res, {
        status: "disabled",
        message: "This QR is disabled"
      });
    }

    // 🔹 7. User
    await client.query("BEGIN");

    const userPlan = await normalizeUserPlan(client, qr.assigned_to_user);

    const userResult = await client.query(
      `SELECT u.id, u.name, u.phone
       FROM users u
       WHERE u.id = $1`,
      [qr.assigned_to_user]
    );

    const user = userResult.rows[0] || null;
    const shouldHidePhone = userPlan.plan === "PREMIUM";

    // 🔹 8. Contacts
    const contactsResult = await client.query(
      `SELECT ec.name, ec.phone, ec.relation
       FROM qr_contact_mapping qcm
       JOIN emergency_contacts ec ON ec.id = qcm.contact_id
       WHERE qcm.qr_code = $1`,
      [qr.qr_code]
    );

    const contacts = contactsResult.rows.map((contact) => ({
      ...contact,
      phone: shouldHidePhone ? null : contact.phone,
      whatsapp_phone: contact.phone
    }));

    // 🔹 9. Medical
    const medicalResult = await client.query(
      `SELECT blood_group, conditions, allergies 
       FROM medical_records 
       WHERE user_id = $1`,
      [qr.assigned_to_user]
    );

    const medical = medicalResult.rows[0] || null;

    await client.query("COMMIT");

    // 🔹 10. Final response
    return sendSuccess(res, {
      status: "active",
      plan: {
        name: userPlan.plan,
        status: userPlan.status,
        end_date: userPlan.end_date
      },
      user: {
        name: user?.name || null,
        phone: shouldHidePhone ? null : user?.phone || null
      },
      contacts,
      medical
    });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Scan rollback failed:", rollbackError.message);
    }
    console.error(error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
};
