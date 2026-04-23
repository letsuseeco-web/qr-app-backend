const pool = require("../../db");

exports.getPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.user_id,
         p.amount,
         p.status,
         p.payment_id,
         p.order_id,
         p.gateway,
         p.created_at,
         u.name AS user_name,
         u.phone AS user_phone,
         u.user_code
       FROM payments p
       LEFT JOIN users u
         ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
