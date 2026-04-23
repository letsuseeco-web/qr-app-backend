const pool = require("../../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // 🔥 added

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM admins WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const admin = result.rows[0];

    // 🔒 FIX: compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { admin_id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};