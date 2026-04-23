const express = require("express");

const { verifyUser } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  getProfile,
  updateProfile,
  getMedicalProfile,
  updateMedicalProfile
} = require("../modules/user/profile.controller");
const {
  updateProfileSchema,
  updateMedicalSchema
} = require("../validators/user.validator");

const router = express.Router();

router.get("/profile", verifyUser, getProfile);
router.put("/profile", verifyUser, validate(updateProfileSchema), updateProfile);
router.get("/profile/medical", verifyUser, getMedicalProfile);
router.put("/profile/medical", verifyUser, validate(updateMedicalSchema), updateMedicalProfile);

module.exports = router;
