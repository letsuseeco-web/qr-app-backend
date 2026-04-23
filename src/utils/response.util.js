exports.sendSuccess = (res, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    data
  });
};

exports.sendError = (res, message, status = 400, extra = {}) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra
  });
};
