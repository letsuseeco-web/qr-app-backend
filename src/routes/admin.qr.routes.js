const express = require("express");
const router = express.Router();

const { verifyAdmin } = require("../middleware/admin.middleware");
const { getBatchDetails } = require("../modules/admin/admin.qr.controller");

const {
  resetQR,
  toggleQR,
  getAllQRs,
  getQRDetails,
  generateQRBatch,
  getBatches
} = require("../modules/admin/admin.qr.controller");

// Routes
router.get("/", verifyAdmin, getAllQRs);
router.get("/batches", verifyAdmin, getBatches);
router.get("/:qr_code", verifyAdmin, getQRDetails);
router.post("/:qr_code/reset", verifyAdmin, resetQR);
router.post("/:qr_code/toggle", verifyAdmin, toggleQR);

// 🔥 ADD THIS
router.post("/generate-batch", verifyAdmin, generateQRBatch);
router.get("/batch/:batch_id", verifyAdmin, getBatchDetails);

module.exports = router;