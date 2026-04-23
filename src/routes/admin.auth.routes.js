const express = require("express");
const router = express.Router();

const { adminLogin } = require("../modules/admin/admin.auth.controller");

router.post("/login", adminLogin);

module.exports = router;