const PLAN_TYPES = {
  FREE: "FREE",
  PREMIUM: "PREMIUM"
};

const PLAN_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED"
};

async function ensureDefaultPlans(client) {
  await client.query(
    `INSERT INTO plans (name, price, duration_days, is_active)
     VALUES
       ('FREE', 0, 0, TRUE),
       ('PREMIUM', 0, 30, TRUE)
     ON CONFLICT (name) DO NOTHING`
  );
}

async function ensureUserPlan(client, user_id) {
  await ensureDefaultPlans(client);

  const inserted = await client.query(
    `INSERT INTO user_plans (user_id, plan, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [user_id, PLAN_TYPES.FREE, PLAN_STATUS.ACTIVE]
  );

  return inserted.rows[0];
}

async function normalizeUserPlan(client, user_id) {
  const currentPlan = await ensureUserPlan(client, user_id);

  const isExpiredPremium =
    currentPlan.plan === PLAN_TYPES.PREMIUM &&
    currentPlan.end_date &&
    new Date(currentPlan.end_date) <= new Date();

  if (!isExpiredPremium) {
    return currentPlan;
  }

  const updated = await client.query(
    `UPDATE user_plans
     SET plan = $1,
         start_date = NULL,
         end_date = NULL,
         status = $2,
         updated_at = NOW()
     WHERE user_id = $3
     RETURNING *`,
    [PLAN_TYPES.FREE, PLAN_STATUS.ACTIVE, user_id]
  );

  return updated.rows[0];
}

async function getActivePlanByName(client, name) {
  const result = await client.query(
    `SELECT *
     FROM plans
     WHERE name = $1
       AND is_active = TRUE
     LIMIT 1`,
    [name]
  );

  return result.rows[0] || null;
}

module.exports = {
  PLAN_STATUS,
  PLAN_TYPES,
  ensureDefaultPlans,
  ensureUserPlan,
  normalizeUserPlan,
  getActivePlanByName
};
