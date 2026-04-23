const pool = require("../../db");
const { logAdmin } = require("../../utils/logger.util");

// 🔹 QR Generator (8 char alphanumeric)
function generateQR() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// 🔹 Get all QR codes
exports.getAllQRs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.qr_code,
        q.ownership_status,
        q.operational_status,
        q.created_at,
        q.batch_id,

        u.name as user_name,
        u.phone as user_phone

      FROM qr_codes q
      LEFT JOIN users u 
        ON q.assigned_to_user = u.id

      ORDER BY q.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Reset QR
exports.resetQR = async (req, res) => {
  try {
    const { qr_code } = req.params;

    const result = await pool.query(
      `UPDATE qr_codes
       SET ownership_status = 'unused',
           assigned_to_user = NULL,
           activated_at = NULL,
           failed_attempts = 0,
           locked_until = NULL
       WHERE qr_code = $1
       RETURNING *`,
      [qr_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "QR not found" });
    }

    await logAdmin(req.admin?.admin_id || null, "RESET_QR", qr_code);

    res.json({ message: "QR reset successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Toggle QR
exports.toggleQR = async (req, res) => {
  try {
    const { qr_code } = req.params;

    const qrResult = await pool.query(
      "SELECT operational_status FROM qr_codes WHERE qr_code = $1",
      [qr_code]
    );

    if (qrResult.rows.length === 0) {
      return res.status(404).json({ message: "QR not found" });
    }

    const currentStatus = qrResult.rows[0].operational_status;

    const newStatus =
      currentStatus === "disabled_by_admin"
        ? "active"
        : "disabled_by_admin";

    await pool.query(
      `UPDATE qr_codes
       SET operational_status = $1
       WHERE qr_code = $2`,
      [newStatus, qr_code]
    );

    await logAdmin(req.admin?.admin_id || null, "TOGGLE_QR", qr_code);

    res.json({
      message: `QR ${newStatus}`,
      status: newStatus
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Get QR details
exports.getQRDetails = async (req, res) => {
  try {
    const { qr_code } = req.params;

    const qrResult = await pool.query(
      "SELECT * FROM qr_codes WHERE qr_code = $1",
      [qr_code]
    );

    if (qrResult.rows.length === 0) {
      return res.status(404).json({ message: "QR not found" });
    }

    const qr = qrResult.rows[0];

    let user = null;

    if (qr.assigned_to_user) {
      const userResult = await pool.query(
        "SELECT id, name, phone FROM users WHERE id = $1",
        [qr.assigned_to_user]
      );

      user = userResult.rows[0] || null;
    }

    res.json({ qr, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 🔥 Generate QR Batch (UPDATED WITH BATCH LOGIC)
exports.generateQRBatch = async (req, res) => {
  const client = await pool.connect();

  try {
    const { count } = req.body;

    if (!count || count <= 0) {
      return res.status(400).json({ message: "Invalid count" });
    }

    await client.query("BEGIN");

    // 🔥 NEW: Batch number logic
    const lastBatch = await client.query(`
      SELECT batch_no FROM batches 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    let nextNumber = 1;

    if (lastBatch.rows.length > 0) {
      const last = lastBatch.rows[0].batch_no;
      const num = parseInt(last.split("_")[1]);
      nextNumber = num + 1;
    }

    const batchNo = `BATCH_${String(nextNumber).padStart(4, "0")}`;

    // 🔥 insert batch
    await client.query(
      `INSERT INTO batches (batch_no, total) VALUES ($1, $2)`,
      [batchNo, count]
    );

    const createdQRs = [];

    for (let i = 0; i < count; i++) {
      let qr_code;
      let exists = true;

      while (exists) {
        qr_code = generateQR();

        const check = await client.query(
          "SELECT 1 FROM qr_codes WHERE qr_code = $1",
          [qr_code]
        );

        exists = check.rows.length > 0;
      }

      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      // 🔥 UPDATED INSERT (with batch_id)
      await client.query(
        `INSERT INTO qr_codes 
        (qr_code, pin, ownership_status, operational_status, batch_id)
        VALUES ($1, $2, 'unused', 'active', $3)`,
        [qr_code, pin, batchNo]
      );

      createdQRs.push({ qr_code, pin });
    }

    await client.query("COMMIT");

    return res.json({
      message: `${count} QR codes generated`,
      batch: batchNo,
      data: createdQRs
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// 🔥 UPDATED Get Batches (REAL DATA)
exports.getBatches = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.batch_no as id,
        b.custom_tag as tag,

        COUNT(q.qr_code) as total,

        COALESCE(SUM(CASE 
          WHEN q.ownership_status = 'unused' THEN 1 
          ELSE 0 
        END), 0) as unused,

        COALESCE(SUM(CASE 
          WHEN q.ownership_status != 'unused' THEN 1 
          ELSE 0 
        END), 0) as active,

        COALESCE(SUM(CASE 
          WHEN q.operational_status = 'disabled_by_admin' THEN 1 
          ELSE 0 
        END), 0) as disabled,

        COALESCE(SUM(CASE 
          WHEN q.ownership_status = 'lost' THEN 1 
          ELSE 0 
        END), 0) as lost

      FROM batches b
      LEFT JOIN qr_codes q 
        ON q.batch_id = b.batch_no

      GROUP BY b.batch_no, b.custom_tag, b.created_at
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("🔥 GET BATCHES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// 🔥 Get Batch Details (PRINT PAGE FIX)
exports.getBatchDetails = async (req, res) => {
  try {
    const { batch_id } = req.params;

    const result = await pool.query(
      `SELECT qr_code, pin, ownership_status
       FROM qr_codes
       WHERE batch_id = $1`,
      [batch_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No QRs found for this batch"
      });
    }

    res.json({
      success: true,
      batch_id,
      qrs: result.rows
    });

  } catch (err) {
    console.error("🔥 GET BATCH DETAILS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};