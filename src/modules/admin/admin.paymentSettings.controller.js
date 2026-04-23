const pool = require("../../db");

const PAYMENT_SETTINGS_KEY = "payment_settings";

const DEFAULT_PAYMENT_SETTINGS = {
  payment_gateway: "razorpay",
  razorpay_key_id: "",
  razorpay_secret: ""
};

async function ensurePaymentSettings() {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO NOTHING`,
    [PAYMENT_SETTINGS_KEY, DEFAULT_PAYMENT_SETTINGS]
  );
}

exports.getPaymentSettings = async (req, res) => {
  try {
    await ensurePaymentSettings();

    const result = await pool.query(
      `SELECT value
       FROM settings
       WHERE key = $1
       LIMIT 1`,
      [PAYMENT_SETTINGS_KEY]
    );

    const value = result.rows[0]?.value || DEFAULT_PAYMENT_SETTINGS;

    res.json({
      payment_gateway: value.payment_gateway || "razorpay",
      razorpay_key_id: value.razorpay_key_id || "",
      razorpay_secret: value.razorpay_secret || ""
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const {
      payment_gateway,
      razorpay_key_id,
      razorpay_secret
    } = req.body;

    const value = {
      payment_gateway,
      razorpay_key_id,
      razorpay_secret
    };

    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING value`,
      [PAYMENT_SETTINGS_KEY, value]
    );

    res.json({
      success: true,
      payment_settings: result.rows[0]?.value || value
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
