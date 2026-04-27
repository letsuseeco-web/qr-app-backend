const pool = require("../db");

exports.ensureWallet = async (client, user_id) => {
  if (!client) {
    throw new Error("DB client is required");
  }

  const result = await client.query(
    `INSERT INTO wallets (user_id, balance)
     VALUES ($1, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [user_id]
  );

  return result.rows[0];
};

exports.addTransaction = async ({
  client,
  user_id,
  type,
  source,
  amount
}) => {
  if (!client) {
    throw new Error("DB client is required");
  }

  if (!user_id || !type || !amount) {
    throw new Error("Missing transaction fields");
  }

  if (!["credit", "debit"].includes(type)) {
    throw new Error("Invalid transaction type");
  }

  amount = Number(amount);

  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  // Ensure wallet exists
  await exports.ensureWallet(client, user_id);

  const walletRes = await client.query(
    `SELECT balance
     FROM wallets
     WHERE user_id = $1
     FOR UPDATE`,
    [user_id]
  );

  let balance = Number(walletRes.rows[0].balance);

  if (type === "debit") {
    if (balance < amount) {
      throw new Error("Insufficient balance");
    }

    balance -= amount;
  } else {
    balance += amount;
  }

  await client.query(
    `UPDATE wallets
     SET balance = $1
     WHERE user_id = $2`,
    [balance, user_id]
  );

  await client.query(
    `INSERT INTO transactions
     (user_id, type, source, amount, balance_after)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, type, source, amount, balance]
  );

  await client.query(
    `INSERT INTO wallet_transactions
     (user_id, type, amount, source, balance_after)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, type, amount, source, balance]
  );

  return {
    user_id,
    type,
    amount,
    source,
    balance_after: balance
  };
};