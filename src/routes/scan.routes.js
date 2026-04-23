const express = require("express");
const router = express.Router();

const { scanQR } = require("../modules/qr/scan.controller");

router.get("/:qr_code", scanQR);

module.exports = router;