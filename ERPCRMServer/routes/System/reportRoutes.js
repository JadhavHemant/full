const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  getSuperAdminDashboard,
  getEmployeeActivity,
  getRecentNotifications,
  getReportOverview,
  triggerCrmDigestReport,
} = require("../../controllers/System/reportController");

const router = express.Router();

router.get("/dashboard", verifyAccessToken, getSuperAdminDashboard);
router.get("/employee-activity", verifyAccessToken, getEmployeeActivity);
router.get("/notifications", verifyAccessToken, getRecentNotifications);
router.get("/overview", verifyAccessToken, getReportOverview);
router.post("/crm-digest/run", verifyAccessToken, triggerCrmDigestReport);

module.exports = router;
