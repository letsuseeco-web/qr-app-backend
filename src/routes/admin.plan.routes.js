const express = require("express");

const { verifyAdmin } = require("../middleware/admin.middleware");
const { validate } = require("../middleware/validation.middleware");
const { updatePlanSchema } = require("../validators/plan.validator");
const {
  getPlans,
  updatePlan
} = require("../modules/admin/admin.plan.controller");

const router = express.Router();

router.get("/", verifyAdmin, getPlans);
router.put("/:id", verifyAdmin, validate(updatePlanSchema), updatePlan);

module.exports = router;
