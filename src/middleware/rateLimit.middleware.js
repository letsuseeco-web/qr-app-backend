const rateLimit = require("express-rate-limit");

// GLOBAL LIMITER
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max:
    process.env.NODE_ENV === "production"
      ? 1000
      : 5000,

  message: {
    success: false,
    message: "Too many requests, try again later"
  }
});

// STRICT LIMITER
exports.strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max:
    process.env.NODE_ENV === "production"
      ? 30
      : 500,

  message: {
    success: false,
    message: "Too many attempts, try later"
  }
});