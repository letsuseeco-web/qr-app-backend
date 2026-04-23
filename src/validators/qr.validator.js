const Joi = require("joi");

exports.activateQRSchema = Joi.object({
  qr_code: Joi.string().alphanum().length(8).required(), // 🔥 updated
  pin: Joi.string().pattern(/^[0-9]{4}$/).required() // 🔥 updated
});

exports.updateQRTagSchema = Joi.object({
  user_tag: Joi.string().trim().max(100).allow("").required()
});

exports.updateQRStatusSchema = Joi.object({
  operational_status: Joi.string().valid("active", "sleep").required()
});

exports.enableLostModeSchema = Joi.object({
  qr_code: Joi.string().trim().required(),
  reward: Joi.number().min(0).required()
});

exports.disableLostModeSchema = Joi.object({
  qr_code: Joi.string().trim().required()
});
