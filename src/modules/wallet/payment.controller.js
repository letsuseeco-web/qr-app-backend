const Razorpay = require("razorpay");
const crypto = require("crypto");
const pool = require("../../db");
const { addTransaction } = require("../../utils/wallet.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

const PAYMENT_SETTINGS_KEY = "payment_settings";

/**
 * Load Razorpay credentials from settings table
 */
async function getPaymentSettings(client = pool) {
  const result = await client.query(
    `SELECT value
     FROM settings
     WHERE key = $1
     LIMIT 1`,
    [PAYMENT_SETTINGS_KEY]
  );

  const settings = result.rows[0]?.value;

  if (!settings?.razorpay_key_id || !settings?.razorpay_secret) {
    throw new Error("Razorpay payment settings not configured");
  }

  return settings;
}

/**
 * Create Razorpay Instance
 */
async function getRazorpayInstance() {
  const settings = await getPaymentSettings();

  return new Razorpay({
    key_id: settings.razorpay_key_id,
    key_secret: settings.razorpay_secret
  });
}

/**
 * Create Recharge Order
 */
exports.createRechargeOrder = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return sendError(res, "Valid amount is required", 400);
    }

    const parsedAmount = Number(amount);

    if (parsedAmount < 10) {
      return sendError(res, "Minimum recharge amount is ₹10", 400);
    }

    if (parsedAmount > 50000) {
      return sendError(res, "Maximum recharge amount is ₹50,000", 400);
    }

    const razorpay = await getRazorpayInstance();
    const settings = await getPaymentSettings();

    const order = await razorpay.orders.create({
      amount: parsedAmount * 100, // paise
      currency: "INR",
      receipt: `wallet_${user_id}_${Date.now()}`
    });

    const paymentResult = await pool.query(
      `INSERT INTO payments
       (user_id, amount, status, order_id, gateway)
       VALUES ($1, $2, 'pending', $3, 'razorpay')
       RETURNING *`,
      [user_id, parsedAmount, order.id]
    );

    return sendSuccess(res, {
      key_id: settings.razorpay_key_id,
      order,
      payment: paymentResult.rows[0]
    });

  } catch (err) {
    console.error("CREATE RECHARGE ORDER ERROR:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Verify Razorpay Payment and Credit Wallet
 */
exports.verifyRecharge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      await client.query("ROLLBACK");
      return sendError(res, "Missing payment verification fields", 400);
    }

    const settings = await getPaymentSettings(client);

    const expectedSignature = crypto
      .createHmac("sha256", settings.razorpay_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await client.query("ROLLBACK");

      await client.query(
        `UPDATE payments
         SET status = 'failed',
             payment_id = $1
         WHERE order_id = $2`,
        [razorpay_payment_id, razorpay_order_id]
      );

      return sendError(res, "Invalid payment signature", 400);
    }

    const paymentResult = await client.query(
      `SELECT *
       FROM payments
       WHERE order_id = $1
         AND user_id = $2
       FOR UPDATE`,
      [razorpay_order_id, user_id]
    );

    if (!paymentResult.rows.length) {
      await client.query("ROLLBACK");
      return sendError(res, "Payment record not found", 404);
    }

    const payment = paymentResult.rows[0];

    if (payment.status === "success") {
      await client.query("COMMIT");

      return sendSuccess(res, {
        message: "Payment already verified",
        payment
      });
    }

    await addTransaction({
      client,
      user_id,
      type: "credit",
      source: "wallet_recharge",
      amount: payment.amount
    });

    const updatedPayment = await client.query(
      `UPDATE payments
       SET status = 'success',
           payment_id = $1
       WHERE id = $2
       RETURNING *`,
      [razorpay_payment_id, payment.id]
    );

    await client.query("COMMIT");

    return sendSuccess(res, {
      message: "Wallet recharged successfully",
      payment: updatedPayment.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("VERIFY RECHARGE ERROR:", err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};