const express = require("express");

const { verifyUser } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  getUserPlan,
  activateUserPlan,
  getUserPlanHistory
} = require("../modules/plan/plan.controller");
const { activateUserPlanSchema } = require("../validators/plan.validator");

const router = express.Router();

router.get("/", verifyUser, getUserPlan);
router.post("/activate", verifyUser, validate(activateUserPlanSchema), activateUserPlan);
router.get("/history", verifyUser, getUserPlanHistory);

module.exports = router;
