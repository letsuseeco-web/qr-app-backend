const pool = require("../../db");
const { addTransaction } = require("../../utils/wallet.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

exports.createRechargeOrder = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { amount, order_id, gateway } = req.body;

    const existing = await pool.query(
      `SELECT id, user_id, amount, status, payment_id, order_id, gateway, created_at
       FROM payments
       WHERE order_id = $1
         AND user_id = $2
       LIMIT 1`,
      [order_id, user_id]
    );

    if (existing.rows.length > 0) {
      return sendSuccess(res, {
        payment: existing.rows[0],
        message: "Payment order already exists"
      });
    }

    const result = await pool.query(
      `INSERT INTO payments
       (user_id, amount, status, order_id, gateway)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING id, user_id, amount, status, payment_id, order_id, gateway, created_at`,
      [user_id, amount, order_id, gateway]
    );

    return sendSuccess(res, {
      payment: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.verifyRecharge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user_id = req.user.user_id;
    const { order_id, payment_id, gateway, success } = req.body;

    const paymentResult = await client.query(
      `SELECT *
       FROM payments
       WHERE order_id = $1
         AND user_id = $2
       FOR UPDATE`,
      [order_id, user_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, "Payment order not found", 404);
    }

    const payment = paymentResult.rows[0];

    if (payment.status === "success") {
      await client.query("COMMIT");
      return sendSuccess(res, {
        message: "Payment already verified",
        payment
      });
    }

    if (!success) {
      const failedUpdate = await client.query(
        `UPDATE payments
         SET status = 'failed',
             payment_id = COALESCE($1, payment_id),
             gateway = $2
         WHERE id = $3
         RETURNING *`,
        [payment_id || null, gateway, payment.id]
      );

      await client.query("COMMIT");

      return sendError(res, "Payment verification failed", 400, {
        data: {
          payment: failedUpdate.rows[0]
        }
      });
    }

    await addTransaction({
      client,
      user_id,
      type: "credit",
      source: "wallet_recharge",
      amount: payment.amount
    });

    const successUpdate = await client.query(
      `UPDATE payments
       SET status = 'success',
           payment_id = $1,
           gateway = $2
       WHERE id = $3
       RETURNING *`,
      [payment_id || null, gateway, payment.id]
    );

    await client.query("COMMIT");

    return sendSuccess(res, {
      message: "Wallet recharge verified successfully",
      payment: successUpdate.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return sendError(res, err.message, 500);
  } finally {
    client.release();
  }
};
