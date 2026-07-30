const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const {
  setup2FA,
  verify2FA,
  disable2FA,
  generateBackupCodes,
  verify2FALogin,
  get2FAStatus,
} = require("../../controllers/auth/twoFactorController");

// All routes require authentication except verify2FALogin
router.use(verifyAccessToken);

// 2FA Setup & Management
router.post("/2fa/setup", checkPermission("users", "edit"), setup2FA);
router.post("/2fa/verify", checkPermission("users", "edit"), verify2FA);
router.post("/2fa/disable", checkPermission("users", "edit"), disable2FA);
router.post("/2fa/backup-codes", checkPermission("users", "edit"), generateBackupCodes);
router.get("/2fa/status", checkPermission("users", "view"), get2FAStatus);

// Public route for 2FA verification during login
router.post("/login/2fa", verify2FALogin);

module.exports = router;
