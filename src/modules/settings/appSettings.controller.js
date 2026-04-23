const pool = require("../../db");
const { getSafeAppSettings } = require("../../utils/settings.util");
const { sendSuccess, sendError } = require("../../utils/response.util");

exports.getAppSettings = async (req, res) => {
  try {
    const settings = await getSafeAppSettings(pool);
    return sendSuccess(res, settings);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};
