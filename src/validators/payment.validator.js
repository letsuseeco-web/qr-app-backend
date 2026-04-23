const Joi = require("joi");

exports.createRechargeOrderSchema = Joi.object({
  amount: Joi.number().positive().required(),
  order_id: Joi.string().trim().min(3).max(120).required(),
  gateway: Joi.string().trim().min(2).max(50).required()
});

exports.verifyRechargeSchema = Joi.object({
  order_id: Joi.string().trim().min(3).max(120).required(),
  payment_id: Joi.string().trim().min(3).max(120).allow(null, ""),
  gateway: Joi.string().trim().min(2).max(50).required(),
  success: Joi.boolean().required()
});
