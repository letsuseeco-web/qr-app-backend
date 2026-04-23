const express = require("express");
const router = express.Router();

const { verifyAdmin } = require("../middleware/admin.middleware");

const {
  getAllSettings,
  updateSetting
} = require("../modules/settings/settings.controller");

// 🔒 Protect settings with admin access
router.get("/", verifyAdmin, getAllSettings);
router.put("/:key", verifyAdmin, updateSetting);

module.exports = router;