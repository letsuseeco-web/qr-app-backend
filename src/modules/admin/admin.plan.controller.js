const pool = require("../../db");
const { ensureDefaultPlans } = require("../../utils/plan.util");

exports.getPlans = async (req, res) => {
  try {
    await ensureDefaultPlans(pool);

    const result = await pool.query(
      `SELECT id, name, price, duration_days, is_active, created_at, updated_at
       FROM plans
       ORDER BY id ASC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, duration_days } = req.body;

    const result = await pool.query(
      `UPDATE plans
       SET price = $1,
           duration_days = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, price, duration_days, is_active, created_at, updated_at`,
      [price, duration_days, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({
      success: true,
      plan: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
