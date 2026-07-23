const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { hierarchyAccess } = require("../../middleware/hierarchyAccessControl");
const {
  getSuperAdminDashboard,
  getEmployeeActivity,
  getRecentNotifications,
  getReportOverview,
  triggerCrmDigestReport,
} = require("../../controllers/System/reportController");
const { getStockAgingReport, getABCAnalysis, getSlowMovingStock, getVendorPerformance } = require("../../controllers/InventoryApis/advancedReportsController");

const router = express.Router();

router.get("/dashboard", verifyAccessToken, getSuperAdminDashboard);
router.get("/employee-activity", verifyAccessToken, getEmployeeActivity);
router.get("/notifications", verifyAccessToken, getRecentNotifications);
router.get("/overview", verifyAccessToken, getReportOverview);
router.post("/crm-digest/run", verifyAccessToken, triggerCrmDigestReport);

// Advanced Inventory Reports with Hierarchy Access
router.get("/stock-aging", verifyAccessToken, hierarchyAccess, getStockAgingReport);
router.get("/abc-analysis", verifyAccessToken, hierarchyAccess, getABCAnalysis);
router.get("/slow-moving", verifyAccessToken, hierarchyAccess, getSlowMovingStock);
router.get("/vendor-performance", verifyAccessToken, hierarchyAccess, getVendorPerformance);

module.exports = router;