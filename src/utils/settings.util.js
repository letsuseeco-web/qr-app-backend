const DEFAULT_SETTINGS = {
  auth: {
    max_login_attempts: 5,
    otp_expiry_minutes: 5,
    qr_lock_duration_minutes: 15,
    qr_activation_attempt_limit: 5
  },
  wallet: {
    currency: "INR",
    currency_symbol: "₹",
    allow_negative_balance: false
  },
  limits: {
    max_qr_per_user: 10,
    max_contacts_per_user: 10
  },
  reward_limits: {
    max_reward_amount: 10000,
    min_reward_amount: 10
  },
  rewards: {
    signup_bonus: 50,
    new_user_reward: 30,
    referrer_reward: 30,
    referral_enabled: true,
    max_referrals: 10
  },
  qr: {
    pin_length: "4",
    qr_id_length: 8,
    activation_lock_minutes: 5,
    activation_attempt_limit: 3
  },
  general: {
    tagline: "Smart QR Safety",
    website: "https://yourwebsite.com",
    brand_name: "Your Brand",
    company_name: "Your Company",
    support_email: "support@example.com",
    support_phone: "+91XXXXXXXXXX",
    support_whatsapp: "+91XXXXXXXXXX"
  },
  social: {
    twitter: "",
    youtube: "",
    facebook: "",
    linkedin: "",
    instagram: ""
  },
  notifications: {
    sms_enabled: false,
    push_enabled: true,
    scan_notification: true
  }
};

function mergeSetting(defaultValue, currentValue) {
  if (!defaultValue || typeof defaultValue !== "object" || Array.isArray(defaultValue)) {
    return currentValue ?? defaultValue;
  }

  return {
    ...defaultValue,
    ...(currentValue || {})
  };
}

async function getSetting(clientOrPool, key) {
  const result = await clientOrPool.query(
    `SELECT value
     FROM settings
     WHERE key = $1
     LIMIT 1`,
    [key]
  );

  return mergeSetting(DEFAULT_SETTINGS[key], result.rows[0]?.value);
}

async function getSettingsMap(clientOrPool, keys) {
  const result = await clientOrPool.query(
    `SELECT key, value
     FROM settings
     WHERE key = ANY($1::text[])`,
    [keys]
  );

  const loaded = Object.fromEntries(
    result.rows.map((row) => [row.key, row.value])
  );

  return keys.reduce((acc, key) => {
    acc[key] = mergeSetting(DEFAULT_SETTINGS[key], loaded[key]);
    return acc;
  }, {});
}

async function getSafeAppSettings(clientOrPool) {
  const settings = await getSettingsMap(clientOrPool, ["limits", "wallet", "general", "social"]);

  return {
    limits: settings.limits,
    branding: {
      brand_name: settings.general.brand_name,
      company_name: settings.general.company_name,
      tagline: settings.general.tagline,
      website: settings.general.website,
      social: settings.social
    },
    support: {
      email: settings.general.support_email,
      phone: settings.general.support_phone,
      whatsapp: settings.general.support_whatsapp
    },
    wallet: {
      currency: settings.wallet.currency,
      currency_symbol: settings.wallet.currency_symbol
    }
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  getSetting,
  getSettingsMap,
  getSafeAppSettings
};
