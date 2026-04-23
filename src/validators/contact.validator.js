const Joi = require("joi");

exports.contactSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required(),
  relation: Joi.string().min(2).max(30).trim().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
});