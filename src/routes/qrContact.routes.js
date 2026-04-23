const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");

const {
  assignContactsToQR,
  getQRContacts
} = require("../modules/qr/qrContact.controller");

router.post("/assign", verifyUser, assignContactsToQR);
router.get("/:qr_code", verifyUser, getQRContacts);

module.exports = router;