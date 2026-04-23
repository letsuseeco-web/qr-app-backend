const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");

const {
  enableLostMode,
  disableLostMode
} = require("../modules/qr/lost.controller");
const {
  enableLostModeSchema,
  disableLostModeSchema
} = require("../validators/qr.validator");

router.post("/enable", verifyUser, validate(enableLostModeSchema), enableLostMode);
router.post("/disable", verifyUser, validate(disableLostModeSchema), disableLostMode);

module.exports = router;
