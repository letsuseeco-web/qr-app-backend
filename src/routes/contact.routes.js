const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { contactSchema } = require("../validators/contact.validator");

const {
  addContact,
  getContacts,
  updateContact,
  deleteContact
} = require("../modules/contact/contact.controller");

// 🔐 Protected routes
router.post("/", verifyUser, validate(contactSchema), addContact);
router.get("/", verifyUser, getContacts);
router.put("/:contact_id", verifyUser, validate(contactSchema), updateContact);
router.delete("/:contact_id", verifyUser, deleteContact);

module.exports = router;
