const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  sendOtp,
  verifyOtp,
  logout
} = require("../modules/auth/auth.controller");
const { verifyUser } = require("../middleware/auth.middleware");
const { strictLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema
} = require("../validators/user.validator");


router.post("/signup", strictLimiter, validate(signupSchema), signup);
router.post("/login", strictLimiter, validate(loginSchema), login);
router.post("/send-otp", strictLimiter, validate(sendOtpSchema), sendOtp);
router.post("/verify-otp", strictLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/logout", verifyUser, logout);

module.exports = router;
