const pool = require("../../db");
const { getSetting } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

// 🔹 Add Contact
exports.addContact = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { name, relation, phone } = req.body;
    const limits = await getSetting(pool, "limits");
    const contactCountResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM emergency_contacts
       WHERE user_id = $1`,
      [user_id]
    );
    const count = Number(contactCountResult.rows[0]?.count || 0);
    const maxContacts = Number(limits.max_contacts_per_user || 10);

    if (count >= maxContacts) {
      return sendError(res, "Maximum contact limit reached", 400);
    }

    const result = await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, relation, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, name, relation, phone]
    );

    return sendSuccess(res, result.rows[0], 201);

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

// 🔹 Get Contacts
exports.getContacts = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await pool.query(
      "SELECT * FROM emergency_contacts WHERE user_id = $1",
      [user_id]
    );

    return sendSuccess(res, result.rows);

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

// 🔹 Update Contact (FIXED)
exports.updateContact = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { contact_id } = req.params;
    const { name, relation, phone } = req.body;

    const result = await pool.query(
      `UPDATE emergency_contacts
       SET name = $1, relation = $2, phone = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, relation, phone, contact_id, user_id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Unauthorized or not found", 403);
    }

    return sendSuccess(res, result.rows[0]);

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

// 🔹 Delete Contact (FIXED)
exports.deleteContact = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { contact_id } = req.params;

    const result = await pool.query(
      "DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING *",
      [contact_id, user_id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Unauthorized or not found", 403);
    }

    return sendSuccess(res, { message: "Contact deleted" });

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
