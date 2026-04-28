const express = require("express");
const cors = require("cors");

const app = express();

const qrRoutes = require("./routes/qr.routes");
const scanRoutes = require("./routes/scan.routes");
const settingsRoutes = require("./routes/settings.routes");
const adminQRRoutes = require("./routes/admin.qr.routes");
const adminUserRoutes = require("./routes/admin.user.routes");
const walletRoutes = require("./routes/wallet.routes");
const authRoutes = require("./routes/auth.routes");
const lostRoutes = require("./routes/lost.routes");
const contactRoutes = require("./routes/contact.routes");
const qrContactRoutes = require("./routes/qrContact.routes");
const adminAuthRoutes = require("./routes/admin.auth.routes");
const adminLogsRoutes = require("./routes/admin.logs.routes");
const planRoutes = require("./routes/plan.routes");
const adminPlanRoutes = require("./routes/admin.plan.routes");
const adminPaymentRoutes = require("./routes/admin.payment.routes");
const adminPaymentSettingsRoutes = require("./routes/admin.paymentSettings.routes");
const userRoutes = require("./routes/user.routes");
const referralRoutes = require("./routes/referral.routes");
const appSettingsRoutes = require("./routes/appSettings.routes");
const userPlanRoutes = require("./routes/userPlan.routes");
const lostHistoryRoutes = require("./routes/lostHistory.routes");

const { globalLimiter } = require("./middleware/rateLimit.middleware");

app.use(cors({
  origin: [
    "https://qr-app-admin.vercel.app",
    "https://qr-app-admin-e6t4bn7ba-letsuseeco-webs-projects.vercel.app",
    "https://qr-app-admin.vercel.app",
    "http://localhost:5173",
	"http://localhost:3000" 
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
// Apply globally
app.use(globalLimiter);

app.use("/qr", qrRoutes);
app.use("/scan", scanRoutes);
app.use("/settings", settingsRoutes);
app.use("/app", appSettingsRoutes);
app.use("/admin/qr", adminQRRoutes);
app.use("/admin/users", adminUserRoutes);
app.use("/wallet", walletRoutes);
app.use("/auth", authRoutes);
app.use("/qr/lost", lostRoutes);
app.use("/lost", lostHistoryRoutes);
app.use("/contacts", contactRoutes);
app.use("/qr-contacts", qrContactRoutes);
app.use("/user", userRoutes);
app.use("/user/plan", userPlanRoutes);
app.use("/referrals", referralRoutes);
app.use("/admin/auth", adminAuthRoutes);
app.use("/admin/logs", adminLogsRoutes);
app.use("/", planRoutes);
app.use("/admin/plans", adminPlanRoutes);
app.use("/admin/payments", adminPaymentRoutes);
app.use("/admin/payment-settings", adminPaymentSettingsRoutes);

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

module.exports = app;
