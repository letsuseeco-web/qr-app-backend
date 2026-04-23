const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  family: 4 // 👈 YE LINE ADD KARO (IMPORTANT)
});

async function getUserIdSqlType() {
  const result = await pool.query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name = 'id'
     LIMIT 1`
  );

  const column = result.rows[0];

  if (!column) {
    throw new Error("users.id column not found");
  }

  if (column.udt_name === "uuid") {
    return "UUID";
  }

  if (column.udt_name === "int8") {
    return "BIGINT";
  }

  return "INTEGER";
}

async function initializeDatabase() {
  const userIdSqlType = await getUserIdSqlType();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('FREE', 'PREMIUM')),
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days >= 0),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      id SERIAL PRIMARY KEY,
      user_id ${userIdSqlType} NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id ${userIdSqlType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      source VARCHAR(100) NOT NULL,
      balance_after NUMERIC(12, 2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
    ON wallet_transactions (user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGSERIAL PRIMARY KEY,
      user_id ${userIdSqlType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
      payment_id VARCHAR(120),
      order_id VARCHAR(120) NOT NULL UNIQUE,
      gateway VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at
    ON payments (user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_plans_plan_status
    ON user_plans (plan, status)
  `);

  await pool.query(`
    INSERT INTO plans (name, price, duration_days, is_active)
    VALUES
      ('FREE', 0, 0, TRUE),
      ('PREMIUM', 0, 30, TRUE)
    ON CONFLICT (name) DO NOTHING
  `);
}

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;
