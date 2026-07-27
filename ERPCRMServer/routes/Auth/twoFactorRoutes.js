const express = require("express");
<<<<<<< HEAD
const speakeasy = require("speakeasy");
=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
const router = express.Router();
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
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
router.post("/2fa/setup", setup2FA);
router.post("/2fa/verify", verify2FA);
router.post("/2fa/disable", disable2FA);
router.post("/2fa/backup-codes", generateBackupCodes);
router.get("/2fa/status", get2FAStatus);

// Public route for 2FA verification during login
router.post("/login/2fa", verify2FALogin);

module.exports = router;