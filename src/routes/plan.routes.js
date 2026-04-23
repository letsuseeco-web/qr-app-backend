const express = require("express");

const { verifyUser } = require("../middleware/auth.middleware");
const { strictLimiter } = require("../middleware/rateLimit.middleware");
const {
  getPublicPlans,
  getMyPlan,
  subscribe
} = require("../modules/plan/plan.controller");

const router = express.Router();

router.get("/plans", getPublicPlans);
router.get("/plans/me", verifyUser, getMyPlan);
router.post("/subscribe", strictLimiter, verifyUser, subscribe);

module.exports = router;
