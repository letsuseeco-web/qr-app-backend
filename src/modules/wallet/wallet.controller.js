const pool = require("../../db");
const { getSetting } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

// Get wallet
exports.getWallet = async (req, res) => {
  try {
    const user_id = req.user.user_id; // 🔥 from token

    const wallet = await pool.query(
      "SELECT * FROM wallets WHERE user_id = $1",
      [user_id]
    );

    const transactions = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id]
    );

    const walletSettings = await getSetting(pool, "wallet");

    return sendSuccess(res, {
      wallet: wallet.rows[0] || null,
      transactions: transactions.rows,
      settings: {
        currency: walletSettings.currency,
        currency_symbol: walletSettings.currency_symbol
      }
    });

  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, type, amount, source, balance_after, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );

    return sendSuccess(res, result.rows);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};

exports.getWalletPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, amount, status, payment_id, order_id, gateway, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );

    return sendSuccess(res, result.rows);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
