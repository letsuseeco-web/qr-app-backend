const pool = require("../../db");

exports.getAllSettings = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings");

    const formatted = {};

    result.rows.forEach(row => {
      formatted[row.key] = row.value;
    });

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const result = await pool.query(
      "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *",
      [value, key]
    );

    // 🔥 FIX: check if key exists
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Setting not found" });
    }

    res.json({ message: "Setting updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};