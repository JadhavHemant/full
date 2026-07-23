const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { appPool } = require("../../config/db");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// @desc    Setup 2FA for user
// @route   POST /api/auth/2fa/setup
// @access  Private
const setup2FA = async (req, res) => {
  try {
    const userId = req.user?.UserId;
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ERP System (${req.user?.Email || 'User'})`,
      issuer: 'ERP System',
    });

    // Store secret temporarily (not enabled yet)
    await appPool.query(
      `INSERT INTO "User2FA" ("UserId", "SecretKey", "IsEnabled")
       VALUES ($1, $2, FALSE)
       ON CONFLICT ("UserId")
       DO UPDATE SET "SecretKey" = $2, "UpdatedAt" = CURRENT_TIMESTAMP`,
      [userId, secret.base32]
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    res.status(500).json({ message: "Failed to setup 2FA", error: error.message });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.UserId;

    // Get secret
    const result = await appPool.query(
      `SELECT "SecretKey" FROM "User2FA" WHERE "UserId" = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "2FA not setup. Please setup 2FA first." });
    }

    const secret = result.rows[0].SecretKey;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Enable 2FA
    await appPool.query(
      `UPDATE "User2FA" SET "IsEnabled" = TRUE, "LastUsedAt" = CURRENT_TIMESTAMP, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "UserId" = $1`,
      [userId]
    );

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({ message: "Failed to verify 2FA", error: error.message });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user?.UserId;

    // Verify password first
    const userResult = await appPool.query(
      `SELECT "Password" FROM "Users" WHERE "UserId" = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Note: In production, use bcrypt to compare hashed passwords
    // This is a simplified version
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].Password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Disable 2FA
    await appPool.query(
      `UPDATE "User2FA" SET "IsEnabled" = FALSE, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "UserId" = $1`,
      [userId]
    );

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({ message: "Failed to disable 2FA", error: error.message });
  }
};

// @desc    Generate backup codes
// @route   POST /api/auth/2fa/backup-codes
// @access  Private
const generateBackupCodes = async (req, res) => {
  try {
    const userId = req.user?.UserId;
    
    // Generate 10 backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Store hashed backup codes
    const bcrypt = require("bcryptjs");
    const hashedCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    await appPool.query(
      `UPDATE "User2FA" SET "BackupCodes" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "UserId" = $2`,
      [JSON.stringify(hashedCodes), userId]
    );

    res.json({ 
      message: "Backup codes generated successfully",
      backupCodes // Return plain codes only once
    });
  } catch (error) {
    console.error("Error generating backup codes:", error);
    res.status(500).json({ message: "Failed to generate backup codes", error: error.message });
  }
};

// @desc    Verify 2FA token during login
// @route   POST /api/auth/login/2fa
// @access  Public
const verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    // Get 2FA secret
    const result = await appPool.query(
      `SELECT "SecretKey", "BackupCodes" FROM "User2FA" WHERE "UserId" = $1 AND "IsEnabled" = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "2FA not enabled for this user" });
    }

    const { SecretKey, BackupCodes } = result.rows[0];

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: SecretKey,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      // Update last used
      await appPool.query(
        `UPDATE "User2FA" SET "LastUsedAt" = CURRENT_TIMESTAMP WHERE "UserId" = $1`,
        [userId]
      );
      return res.json({ verified: true, message: "2FA verified successfully" });
    }

    // Check backup codes
    if (BackupCodes) {
      const bcrypt = require("bcryptjs");
      const codes = JSON.parse(BackupCodes);
      
      for (let i = 0; i < codes.length; i++) {
        const isMatch = await bcrypt.compare(token, codes[i]);
        if (isMatch) {
          // Remove used backup code
          codes.splice(i, 1);
          await appPool.query(
            `UPDATE "User2FA" SET "BackupCodes" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "UserId" = $2`,
            [JSON.stringify(codes), userId]
          );
          return res.json({ verified: true, message: "2FA verified with backup code", usedBackupCode: true });
        }
      }
    }

    res.status(400).json({ message: "Invalid verification code" });
  } catch (error) {
    console.error("Error verifying 2FA login:", error);
    res.status(500).json({ message: "Failed to verify 2FA", error: error.message });
  }
};

// @desc    Get 2FA status
// @route   GET /api/auth/2fa/status
// @access  Private
const get2FAStatus = async (req, res) => {
  try {
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `SELECT "IsEnabled", "LastUsedAt", "CreatedAt" FROM "User2FA" WHERE "UserId" = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ isEnabled: false });
    }

    res.json({
      isEnabled: result.rows[0].IsEnabled,
      lastUsedAt: result.rows[0].LastUsedAt,
      createdAt: result.rows[0].CreatedAt,
    });
  } catch (error) {
    console.error("Error fetching 2FA status:", error);
    res.status(500).json({ message: "Failed to fetch 2FA status", error: error.message });
  }
};

module.exports = {
  setup2FA,
  verify2FA,
  disable2FA,
  generateBackupCodes,
  verify2FALogin,
  get2FAStatus,
};