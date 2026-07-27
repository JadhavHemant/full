const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  getDetailedAuditLogs,
  exportAuditLogs,
  getComplianceReport,
  setupAuditLogDetails,
} = require("../../../controllers/InventoryApis/advancedAuditController");

router.use(verifyAccessToken);

// Detailed audit logs with before/after values
router.get("/detailed", getDetailedAuditLogs);

// Export audit logs as CSV
router.get("/export", exportAuditLogs);

// Compliance report
router.get("/compliance-report", getComplianceReport);

// Setup AuditLogDetails table (admin only)
router.post("/setup-details", setupAuditLogDetails);

module.exports = router;
