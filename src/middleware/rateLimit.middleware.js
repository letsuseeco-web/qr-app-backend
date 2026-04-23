const rateLimit = require("express-rate-limit");

// 🔹 Global limiter
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  message: {
    success: false,
    message: "Too many requests, try again later"
  }
});

// 🔹 Strict limiter (for auth / QR)
exports.strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter
  message: {
    success: false,
    message: "Too many attempts, try later"
  }
});