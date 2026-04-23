CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('FREE', 'PREMIUM')),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  source VARCHAR(100) NOT NULL,
  balance_after NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_plans_plan_status
  ON user_plans (plan, status);

INSERT INTO plans (name, price, duration_days, is_active)
VALUES
  ('FREE', 0, 0, TRUE),
  ('PREMIUM', 0, 30, TRUE)
ON CONFLICT (name) DO NOTHING;
