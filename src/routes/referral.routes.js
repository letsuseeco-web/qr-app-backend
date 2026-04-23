const express = require("express");

const { verifyUser } = require("../middleware/auth.middleware");
const { getReferrals } = require("../modules/user/referral.controller");

const router = express.Router();

router.get("/", verifyUser, getReferrals);

module.exports = router;
