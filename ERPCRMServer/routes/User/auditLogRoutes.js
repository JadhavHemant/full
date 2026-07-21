const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
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
router.get("/", verifyAccessToken, getAuditLogs);

// Get audit log by ID
router.get("/:id", verifyAccessToken, getAuditLogById);

// Get audit log statistics
router.get("/stats/summary", verifyAccessToken, getAuditLogStats);

// Cleanup old audit logs (Super Admin only)
router.delete("/cleanup", verifyAccessToken, cleanupAuditLogs);

module.exports = router;