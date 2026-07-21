const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { appPool } = require('../config/db');

/**
 * Password Reset Service
 * 
 * Handles forgot password, reset password, and password reset token management.
 */

const RESET_TOKEN_EXPIRY_HOURS = parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS) || 1;
const MAX_RESET_ATTEMPTS_PER_DAY = parseInt(process.env.MAX_RESET_ATTEMPTS_PER_DAY) || 3;

/**
 * Generate secure reset token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Check reset rate limit
 */
const checkResetRateLimit = async (email) => {
  const result = await appPool.query(
    `SELECT COUNT(*) as "Count"
     FROM "PasswordResets"
     WHERE "UserId" = (SELECT "UserId" FROM "Users" WHERE LOWER("Email") = LOWER($1))
       AND "CreatedAt" > NOW() - INTERVAL '24 hours'`,
    [email]
  );

  const count = parseInt(result.rows[0]?.Count || 0);
  return count < MAX_RESET_ATTEMPTS_PER_DAY;
};

/**
 * Forgot Password - Generate and store reset token
 */
const forgotPassword = async (email, req) => {
  // Check if user exists
  const userResult = await appPool.query(
    `SELECT "UserId", "Email", "Name", "Status", "IsActive"
     FROM "Users"
     WHERE LOWER("Email") = LOWER($1) AND "IsDeleted" = FALSE`,
    [email]
  );

  if (userResult.rows.length === 0) {
    // Return success even if user doesn't exist (security best practice)
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  const user = userResult.rows[0];

  // Check user status
  if (user.Status === 'suspended' || !user.IsActive) {
    throw new Error('Account is not active. Please contact administrator.');
  }

  // Check rate limit
  const canReset = await checkResetRateLimit(email);
  if (!canReset) {
    throw new Error(
      `Too many password reset attempts. Please try again after 24 hours.`
    );
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

  // Store reset token
  await appPool.query(
    `INSERT INTO "PasswordResets" ("UserId", "Token", "ExpiresAt")
     VALUES ($1, $2, $3)`,
    [user.UserId, hashedToken, expiresAt]
  );

  // TODO: Send email with reset link
  // For now, return the token (in production, this should only be sent via email)
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  console.log(`🔑 Password reset link for ${email}:`, resetLink);

  return {
    success: true,
    message: 'Password reset link has been sent to your email.',
    // Remove token from response in production
    ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink }),
  };
};

/**
 * Verify Reset Token
 */
const verifyResetToken = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const result = await appPool.query(
    `SELECT pr."Id", pr."UserId", pr."ExpiresAt", u."Email", u."Status"
     FROM "PasswordResets" pr
     JOIN "Users" u ON pr."UserId" = u."UserId"
     WHERE pr."Token" = $1
       AND pr."ExpiresAt" > NOW()
     ORDER BY pr."CreatedAt" DESC
     LIMIT 1`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  const tokenData = result.rows[0];

  // Check user status
  if (tokenData.Status !== 'active') {
    throw new Error('Account is not active');
  }

  return {
    valid: true,
    userId: tokenData.UserId,
    email: tokenData.Email,
  };
};

/**
 * Reset Password using token
 */
const resetPassword = async (token, newPassword) => {
  // Verify token
  const tokenData = await verifyResetToken(token);
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await appPool.query(
    `UPDATE "Users"
     SET "Password" = $1,
         "PasswordChangedAt" = NOW(),
         "PasswordResetRequired" = FALSE,
         "FailedLoginAttempts" = 0,
         "LockedUntil" = NULL,
         "RefreshTokenVersion" = COALESCE("RefreshTokenVersion", 0) + 1,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $2`,
    [hashedPassword, tokenData.userId]
  );

  // Delete used reset token and all other tokens for this user
  await appPool.query(
    `DELETE FROM "PasswordResets" WHERE "UserId" = $1`,
    [tokenData.userId]
  );

  // Revoke all refresh tokens (force re-login everywhere)
  await appPool.query(
    `UPDATE "RefreshTokens"
     SET "IsRevoked" = TRUE,
         "RevokedAt" = NOW(),
         "RevokedReason" = 'Password reset'
     WHERE "UserId" = $1 AND "IsRevoked" = FALSE`,
    [tokenData.userId]
  );

  return {
    success: true,
    message: 'Password has been reset successfully. Please login with your new password.',
  };
};

/**
 * Admin Force Password Reset
 */
const forcePasswordReset = async (userId, adminUserId) => {
  // Set password reset required flag
  await appPool.query(
    `UPDATE "Users"
     SET "PasswordResetRequired" = TRUE,
         "UpdatedBy" = $1,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $2`,
    [adminUserId, userId]
  );

  return {
    success: true,
    message: 'User will be required to reset password on next login.',
  };
};

/**
 * Check Password History (prevent reuse)
 */
const isPasswordInHistory = async (userId, newPassword, historyCount = 5) => {
  // Get recent password hashes
  const result = await appPool.query(
    `SELECT "Password" FROM "Users" WHERE "UserId" = $1`,
    [userId]
  );

  if (result.rows.length === 0) return false;

  const currentHash = result.rows[0].Password;
  const isMatch = await bcrypt.compare(newPassword, currentHash);

  // In a full implementation, you'd store password history
  // For now, just check against current password
  return isMatch;
};

/**
 * Cleanup expired reset tokens
 */
const cleanupExpiredTokens = async () => {
  const result = await appPool.query(
    `DELETE FROM "PasswordResets"
     WHERE "ExpiresAt" < NOW() - INTERVAL '7 days'
     RETURNING "Id"`
  );

  return {
    deletedCount: result.rowCount,
    message: `Cleaned up ${result.rowCount} expired reset tokens`,
  };
};

module.exports = {
  forgotPassword,
  verifyResetToken,
  resetPassword,
  forcePasswordReset,
  isPasswordInHistory,
  cleanupExpiredTokens,
};
