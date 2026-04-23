const pool = require("../db");
const axios = require("axios");


// ===============================
// 🔹 ACTIVATION LOG
// ===============================
exports.logActivation = async (client, qr_code, success) => {
  try {
    await client.query(
      `INSERT INTO activation_logs (qr_code, success)
       VALUES ($1, $2)`,
      [qr_code, success]
    );
  } catch (err) {
    console.error("Activation log failed:", err.message);
  }
};


// ===============================
// 🔹 SCAN LOG (IP + DEVICE + LOCATION)
// ===============================
exports.logScan = async (qr_code, ip_address, device_info) => {
  try {
    let location = "Unknown";

    // 🔥 Skip localhost
    if (ip_address && ip_address !== "::1" && ip_address !== "127.0.0.1") {
      try {
        const res = await axios.get(`http://ip-api.com/json/${ip_address}`);

        if (res.data && res.data.status === "success") {
          location = `${res.data.city}, ${res.data.country}`;
        }
      } catch (err) {
        console.warn("Location fetch failed:", err.message);
      }
    }

    await pool.query(
      `INSERT INTO scan_logs (qr_code, ip_address, device_info, location)
       VALUES ($1, $2, $3, $4)`,
      [qr_code, ip_address, device_info, location]
    );

  } catch (err) {
    console.error("Scan log failed:", err.message);
  }
};


// ===============================
// 🔹 ADMIN LOG
// ===============================
exports.logAdmin = async (admin_id, action, target) => {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target)
       VALUES ($1, $2, $3)`,
      [admin_id, action, target]
    );
  } catch (err) {
    console.error("Admin log failed:", err.message);
  }
};


// ===============================
// 🔹 USER QR LOG
// ===============================
exports.logUserQR = async (user_id, qr_code, action) => {
  try {
    await pool.query(
      `INSERT INTO user_qr_logs (user_id, qr_code, action)
       VALUES ($1, $2, $3)`,
      [user_id, qr_code, action]
    );
  } catch (err) {
    console.error("User QR log failed:", err.message);
  }
};


// ===============================
// 🔹 LOST MODE LOG
// ===============================
exports.logLost = async (qr_code, status, reward = 0) => {
  try {
    await pool.query(
      `INSERT INTO lost_logs (qr_code, status, reward)
       VALUES ($1, $2, $3)`,
      [qr_code, status, reward]
    );
  } catch (err) {
    console.error("Lost log failed:", err.message);
  }
};