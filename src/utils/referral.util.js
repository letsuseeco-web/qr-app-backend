exports.generateReferralCode = (phone) => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return "REF" + phone.slice(-4) + random;
};