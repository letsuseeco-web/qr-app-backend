const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/admin.middleware");

const {
  getAllUsers,
  getUserDetails
} = require("../modules/user/admin.user.controller");

// 🔒 Protect with admin middleware
router.get("/", verifyAdmin, getAllUsers);
router.get("/:user_id", verifyAdmin, getUserDetails);

module.exports = router;