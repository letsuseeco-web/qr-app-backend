const Joi = require("joi");

exports.paymentSettingsSchema = Joi.object({
  payment_gateway: Joi.string().trim().min(2).max(50).required(),
  razorpay_key_id: Joi.string().allow("").max(255).required(),
  razorpay_secret: Joi.string().allow("").max(255).required()
});
