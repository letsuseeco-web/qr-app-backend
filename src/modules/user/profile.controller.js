const pool = require("../../db");
const { sendSuccess, sendError } = require("../../utils/response.util");

async function getProfileData(client, userId) {
  const userResult = await client.query(
    `SELECT id, phone, name, referral_code, referred_by, created_at, user_code
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const profileResult = await client.query(
    `SELECT gender, date_of_birth
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return {
    ...userResult.rows[0],
    gender: profileResult.rows[0]?.gender || null,
    date_of_birth: profileResult.rows[0]?.date_of_birth || null
  };
}

exports.getProfile = async (req, res) => {
  try {
    const profile = await getProfileData(pool, req.user.user_id);

    if (!profile) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, profile);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.updateProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id;
    const { name, gender, date_of_birth } = req.body;

    await client.query("BEGIN");

    const userUpdate = await client.query(
      `UPDATE users
       SET name = $1
       WHERE id = $2
       RETURNING id`,
      [name, userId]
    );

    if (userUpdate.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, "User not found", 404);
    }

    await client.query(
      `INSERT INTO user_profiles (user_id, gender, date_of_birth)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth`,
      [userId, gender || null, date_of_birth || null]
    );

    const profile = await getProfileData(client, userId);

    await client.query("COMMIT");

    return sendSuccess(res, profile);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};

exports.getMedicalProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT blood_group, conditions, allergies
       FROM medical_records
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    return sendSuccess(res, result.rows[0] || {
      blood_group: null,
      conditions: null,
      allergies: null
    });
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.updateMedicalProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { blood_group, conditions, allergies } = req.body;

    const result = await pool.query(
      `INSERT INTO medical_records (user_id, blood_group, conditions, allergies)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         blood_group = EXCLUDED.blood_group,
         conditions = EXCLUDED.conditions,
         allergies = EXCLUDED.allergies
       RETURNING blood_group, conditions, allergies`,
      [userId, blood_group || null, conditions || null, allergies || null]
    );

    return sendSuccess(res, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
