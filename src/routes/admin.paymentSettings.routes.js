const express = require("express");

const { verifyAdmin } = require("../middleware/admin.middleware");
const { validate } = require("../middleware/validation.middleware");
const { paymentSettingsSchema } = require("../validators/paymentSettings.validator");
const {
  getPaymentSettings,
  updatePaymentSettings
} = require("../modules/admin/admin.paymentSettings.controller");

const router = express.Router();

router.get("/", verifyAdmin, getPaymentSettings);
router.put("/", verifyAdmin, validate(paymentSettingsSchema), updatePaymentSettings);

module.exports = router;
