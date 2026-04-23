const Joi = require("joi");

// 🔹 Signup validation
exports.signupSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  name: Joi.string().min(2).max(50).trim().required(),
  referral_input: Joi.string()
    .pattern(/^REF[0-9A-Z]+$/)
    .optional()
});

exports.loginSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
});

exports.sendOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
});

exports.verifyOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  otp: Joi.string().pattern(/^[0-9]{4,6}$/).required(),
  name: Joi.string().min(2).max(50).trim().optional(),
  referral_input: Joi.string()
    .pattern(/^REF[0-9A-Z]+$/)
    .optional()
});

exports.updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required(),
  gender: Joi.string().valid("male", "female", "other").allow(null, "").optional(),
  date_of_birth: Joi.date().iso().allow(null).optional()
});

exports.updateMedicalSchema = Joi.object({
  blood_group: Joi.string().max(5).allow(null, "").optional(),
  conditions: Joi.string().max(2000).allow(null, "").optional(),
  allergies: Joi.string().max(2000).allow(null, "").optional()
});
