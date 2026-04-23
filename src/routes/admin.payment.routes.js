const express = require("express");

const { verifyAdmin } = require("../middleware/admin.middleware");
const { getPayments } = require("../modules/admin/admin.payment.controller");

const router = express.Router();

router.get("/", verifyAdmin, getPayments);

module.exports = router;
