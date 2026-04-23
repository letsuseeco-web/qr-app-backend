const express = require("express");

const { verifyUser } = require("../middleware/auth.middleware");
const { getLostHistory } = require("../modules/qr/lost.controller");

const router = express.Router();

router.get("/history", verifyUser, getLostHistory);

module.exports = router;
