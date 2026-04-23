const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { strictLimiter } = require("../middleware/rateLimit.middleware");
const {
  getWallet,
  getWalletTransactions,
  getWalletPayments
} = require("../modules/wallet/wallet.controller");
const {
  createRechargeOrder,
  verifyRecharge
} = require("../modules/wallet/payment.controller");
const {
  createRechargeOrderSchema,
  verifyRechargeSchema
} = require("../validators/payment.validator");

router.get("/", verifyUser, getWallet);
router.get("/transactions", verifyUser, getWalletTransactions);
router.get("/payments", verifyUser, getWalletPayments);

router.post(
  "/recharge/order",
  strictLimiter,
  verifyUser,
  validate(createRechargeOrderSchema),
  createRechargeOrder
);

router.post(
  "/recharge/verify",
  strictLimiter,
  verifyUser,
  validate(verifyRechargeSchema),
  verifyRecharge
);

module.exports = router;
