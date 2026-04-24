const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");
const { strictLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  activateQR,
  getMyQRs,
  getMyQRDetails,
  updateQRTag,
  updateQRStatus,
  getQRHistory
} = require("../modules/qr/qr.controller");
const {
  activateQRSchema,
  updateQRTagSchema,
  updateQRStatusSchema
} = require("../validators/qr.validator");

// ✅ Correct pipeline: limiter → auth → validation → controller
router.post(
  "/activate",
  strictLimiter,
  verifyUser,
  validate(activateQRSchema),
  activateQR
);
router.get("/my", verifyUser, getMyQRs);
router.get("/:qr_code", verifyUser, getMyQRDetails);
router.get("/:qr_code/history", verifyUser, getQRHistory);
router.put("/:qr_code/tag", verifyUser, validate(updateQRTagSchema), updateQRTag);
router.put("/:qr_code/status", verifyUser, validate(updateQRStatusSchema), updateQRStatus);

module.exports = router;
