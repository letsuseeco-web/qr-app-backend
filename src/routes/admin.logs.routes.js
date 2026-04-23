const express = require("express");
const router = express.Router();

const { verifyAdmin } = require("../middleware/admin.middleware");
const pool = require("../db");


// 📊 Scan Logs
router.get("/scans", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM scan_logs ORDER BY scanned_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Scan logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// 🔐 Activation Logs
router.get("/activations", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM activation_logs ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Activation logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// 🚨 Lost Logs
router.get("/lost", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM lost_logs ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lost logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ⚙️ Admin Logs
router.get("/admin", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM admin_logs ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// 👤 User QR Logs
router.get("/user-qr", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_qr_logs ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("User QR logs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;