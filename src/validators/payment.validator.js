const Joi = require("joi");

/**
 * Create Razorpay Recharge Order
 */
exports.createRechargeOrderSchema = Joi.object({
  amount: Joi.number()
    .min(10)
    .max(50000)
    .required()
    .messages({
      "number.base": "Amount must be a number",
      "number.min": "Minimum recharge amount is ₹10",
      "number.max": "Maximum recharge amount is ₹50,000",
      "any.required": "Amount is required"
    })
});

/**
 * Verify Razorpay Payment
 */
exports.verifyRechargeSchema = Joi.object({
  razorpay_order_id: Joi.string()
    .trim()
    .min(3)
    .max(120)
    .required(),

  razorpay_payment_id: Joi.string()
    .trim()
    .min(3)
    .max(120)
    .required(),

  razorpay_signature: Joi.string()
    .trim()
    .min(10)
    .max(255)
    .required()
});