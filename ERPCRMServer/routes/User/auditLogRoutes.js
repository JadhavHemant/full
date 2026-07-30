const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { 
  getAuditLogs, 
  getAuditLogById, 
  cleanupAuditLogs,
  getAuditLogStats
} = require("../../controllers/UserApis/auditLogController");

const router = express.Router();

// All audit log routes require authentication
// Only Super Admin (roleId = 1) can access most audit log endpoints

// Get audit logs with filtering
router.get("/", verifyAccessToken, checkPermission('auditLogs', 'view'), getAuditLogs);

// Get audit log by ID
router.get("/:id", verifyAccessToken, checkPermission('auditLogs', 'view'), getAuditLogById);

// Get audit log statistics
router.get("/stats/summary", verifyAccessToken, checkPermission('auditLogs', 'view'), getAuditLogStats);

// Cleanup old audit logs (Super Admin only)
router.delete("/cleanup", verifyAccessToken, checkPermission('auditLogs', 'delete'), cleanupAuditLogs);

module.exports = router;