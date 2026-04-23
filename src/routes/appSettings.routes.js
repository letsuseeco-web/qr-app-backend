const express = require("express");

const { getAppSettings } = require("../modules/settings/appSettings.controller");

const router = express.Router();

router.get("/settings", getAppSettings);

module.exports = router;
