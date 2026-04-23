const Joi = require("joi");

exports.updatePlanSchema = Joi.object({
  price: Joi.number().min(0).required(),
  duration_days: Joi.number().integer().min(0).required()
});

exports.activateUserPlanSchema = Joi.object({
  plan: Joi.string().valid("PREMIUM").required()
});
