const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { appPool } = require('../config/db');

/**
 * Enhanced Authentication Service
 * 
 * Provides comprehensive authentication functionality including:
 * - Login with device tracking
 * - Token rotation and refresh
 * - Password management
 * - Account locking
 * - Remember me functionality
 */

// Configuration
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const REMEMBER_ME_EXPIRY = process.env.REMEMBER_ME_EXPIRY || '30d';
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5;
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES) || 30;

/**
 * Generate JWT tokens
 */
const generateTokens = (user, deviceInfo = {}, rememberMe = false) => {
  const payload = {
    UserId: user.UserId,
    Email: user.Email,
    RoleId: user.RoleId,
    CompanyId: user.CompanyId,
    TokenVersion: user.RefreshTokenVersion || 0,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshTokenExpiry = rememberMe ? REMEMBER_ME_EXPIRY : REFRESH_TOKEN_EXPIRY;
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh', deviceId: deviceInfo.deviceId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: refreshTokenExpiry }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
};

/**
 * Extract device information from request
 */
const extractDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  // Generate device fingerprint
  const deviceId = crypto
    .createHash('sha256')
    .update(`${userAgent}${ip}`)
    .digest('hex')
    .substring(0, 32);

  // Parse device type from user agent
  let deviceType = 'desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet/i.test(userAgent)) deviceType = 'tablet';

  // Parse browser
  let browser = 'Unknown';
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';

  // Parse OS
  let os = 'Unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac/i.test(userAgent)) os = 'MacOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/ios/i.test(userAgent)) os = 'iOS';

  return {
    userAgent,
    ip,
    deviceId,
    deviceType,
    browser,
    os,
  };
};

/**
 * Check if account is locked
 */
const isAccountLocked = async (userId) => {
  const result = await appPool.query(
    `SELECT "LockedUntil", "FailedLoginAttempts" 
     FROM "Users" 
     WHERE "UserId" = $1`,
    [userId]
  );

  if (result.rows.length === 0) return { locked: false };

  const user = result.rows[0];
  if (user.LockedUntil && new Date(user.LockedUntil) > new Date()) {
    const minutesRemaining = Math.ceil(
      (new Date(user.LockedUntil) - new Date()) / (1000 * 60)
    );
    return { 
      locked: true, 
      minutesRemaining,
      failedAttempts: user.FailedLoginAttempts 
    };
  }

  return { locked: false };
};

/**
 * Increment failed login attempts
 */
const incrementFailedAttempts = async (userId) => {
  const result = await appPool.query(
    `UPDATE "Users" 
     SET "FailedLoginAttempts" = COALESCE("FailedLoginAttempts", 0) + 1,
         "LockedUntil" = CASE 
           WHEN COALESCE("FailedLoginAttempts", 0) + 1 >= $1 
           THEN NOW() + INTERVAL '${LOCK_DURATION_MINUTES} minutes'
           ELSE "LockedUntil"
         END,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $2
     RETURNING "FailedLoginAttempts", "LockedUntil"`,
    [MAX_FAILED_ATTEMPTS, userId]
  );

  return result.rows[0];
};

/**
 * Reset failed login attempts on successful login
 */
const resetFailedAttempts = async (userId, deviceInfo) => {
  await appPool.query(
    `UPDATE "Users" 
     SET "FailedLoginAttempts" = 0,
         "LockedUntil" = NULL,
         "LastLoginAt" = NOW(),
         "LastLoginIP" = $1,
         "LastLoginDevice" = $2,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $3`,
    [deviceInfo.ip, deviceInfo.userAgent, userId]
  );
};

/**
 * Store refresh token in database
 */
const storeRefreshToken = async (userId, refreshToken, deviceInfo, rememberMe) => {
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await appPool.query(
    `INSERT INTO "RefreshTokens" (
      "UserId", "Token", "TokenVersion", "ExpiresAt", "IpAddress", 
      "UserAgent", "DeviceId", "DeviceType", "RememberMe"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      userId,
      refreshToken,
      deviceInfo.tokenVersion || 0,
      expiresAt,
      deviceInfo.ip,
      deviceInfo.userAgent,
      deviceInfo.deviceId,
      deviceInfo.deviceType,
      rememberMe,
    ]
  );
};

/**
 * Login Service
 */
const login = async (email, password, req, rememberMe = false) => {
  const deviceInfo = extractDeviceInfo(req);

  // Get user by email
  const userResult = await appPool.query(
    `SELECT u."UserId", u."Email", u."Password", u."Name", u."RoleId", 
            u."CompanyId", u."Status", u."IsActive", u."EmailVerified",
            u."RefreshTokenVersion", u."FailedLoginAttempts", u."LockedUntil",
            r."RoleName"
     FROM "Users" u
     LEFT JOIN "Roles" r ON u."RoleId" = r."Id"
     WHERE LOWER(u."Email") = LOWER($1) AND u."IsDeleted" = FALSE`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = userResult.rows[0];

  // Check if account is locked
  const lockStatus = await isAccountLocked(user.UserId);
  if (lockStatus.locked) {
    throw new Error(
      `Account is locked due to ${lockStatus.failedAttempts} failed login attempts. ` +
      `Please try again in ${lockStatus.minutesRemaining} minutes.`
    );
  }

  // Check account status
  if (user.Status === 'suspended') {
    throw new Error('Account is suspended. Please contact administrator.');
  }

  if (user.Status === 'inactive' || !user.IsActive) {
    throw new Error('Account is inactive. Please contact administrator.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.Password);
  if (!isPasswordValid) {
    await incrementFailedAttempts(user.UserId);
    throw new Error('Invalid credentials');
  }

  // Check email verification (optional - can be enforced based on business rules)
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.EmailVerified) {
    throw new Error('Please verify your email before logging in.');
  }

  // Reset failed attempts on successful login
  await resetFailedAttempts(user.UserId, deviceInfo);

  // Generate tokens
  const tokens = generateTokens(
    { ...user, RefreshTokenVersion: user.RefreshTokenVersion || 0 },
    deviceInfo,
    rememberMe
  );

  // Store refresh token
  await storeRefreshToken(
    user.UserId,
    tokens.refreshToken,
    { ...deviceInfo, tokenVersion: user.RefreshTokenVersion || 0 },
    rememberMe
  );

  // Update remember me flag
  if (rememberMe) {
    await appPool.query(
      `UPDATE "Users" SET "RememberMe" = TRUE WHERE "UserId" = $1`,
      [user.UserId]
    );
  }

  return {
    ...tokens,
    user: {
      UserId: user.UserId,
      Email: user.Email,
      Name: user.Name,
      RoleId: user.RoleId,
      RoleName: user.RoleName,
      CompanyId: user.CompanyId,
    },
  };
};

/**
 * Refresh Token Service
 */
const refreshAccessToken = async (refreshToken, req) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const deviceInfo = extractDeviceInfo(req);

    // Check if token exists and is not revoked
    const tokenResult = await appPool.query(
      `SELECT "TokenId", "UserId", "IsRevoked", "ExpiresAt", "TokenVersion"
       FROM "RefreshTokens"
       WHERE "Token" = $1`,
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.IsRevoked) {
      throw new Error('Refresh token has been revoked');
    }

    if (new Date(tokenRecord.ExpiresAt) < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Get user and check token version
    const userResult = await appPool.query(
      `SELECT "UserId", "Email", "RoleId", "CompanyId", "RefreshTokenVersion", 
              "Status", "IsActive"
       FROM "Users"
       WHERE "UserId" = $1 AND "IsDeleted" = FALSE`,
      [decoded.UserId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Check if token version matches (invalidates all tokens on logout-all)
    if (tokenRecord.TokenVersion !== (user.RefreshTokenVersion || 0)) {
      throw new Error('Refresh token has been invalidated');
    }

    // Check user status
    if (user.Status !== 'active' || !user.IsActive) {
      throw new Error('User account is not active');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        UserId: user.UserId,
        Email: user.Email,
        RoleId: user.RoleId,
        CompanyId: user.CompanyId,
        TokenVersion: user.RefreshTokenVersion || 0,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Update last used timestamp
    await appPool.query(
      `UPDATE "RefreshTokens" 
       SET "LastUsedAt" = NOW() 
       WHERE "TokenId" = $1`,
      [tokenRecord.TokenId]
    );

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
};

/**
 * Logout Service (revoke single refresh token)
 */
const logout = async (refreshToken) => {
  await appPool.query(
    `UPDATE "RefreshTokens" 
     SET "IsRevoked" = TRUE,
         "RevokedAt" = NOW(),
         "RevokedReason" = 'User logout'
     WHERE "Token" = $1`,
    [refreshToken]
  );

  return { success: true, message: 'Logged out successfully' };
};

/**
 * Logout from all devices (increment token version)
 */
const logoutAllDevices = async (userId) => {
  // Increment token version to invalidate all tokens
  await appPool.query(
    `UPDATE "Users" 
     SET "RefreshTokenVersion" = COALESCE("RefreshTokenVersion", 0) + 1,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $1`,
    [userId]
  );

  // Revoke all refresh tokens
  await appPool.query(
    `UPDATE "RefreshTokens" 
     SET "IsRevoked" = TRUE,
         "RevokedAt" = NOW(),
         "RevokedReason" = 'Logout from all devices'
     WHERE "UserId" = $1 AND "IsRevoked" = FALSE`,
    [userId]
  );

  return { success: true, message: 'Logged out from all devices' };
};

/**
 * Change Password Service
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Get current password hash
  const result = await appPool.query(
    `SELECT "Password" FROM "Users" WHERE "UserId" = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.Password);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and set password changed timestamp
  await appPool.query(
    `UPDATE "Users" 
     SET "Password" = $1,
         "PasswordChangedAt" = NOW(),
         "PasswordResetRequired" = FALSE,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $2`,
    [hashedPassword, userId]
  );

  return { success: true, message: 'Password changed successfully' };
};

/**
 * Get Active Sessions for a user
 */
const getActiveSessions = async (userId) => {
  const result = await appPool.query(
    `SELECT "TokenId", "DeviceType", "Browser", "OperatingSystem" as "OS",
            "IpAddress", "CreatedAt", "LastUsedAt"
     FROM "RefreshTokens"
     WHERE "UserId" = $1 
       AND "IsRevoked" = FALSE 
       AND "ExpiresAt" > NOW()
     ORDER BY "LastUsedAt" DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Revoke specific session
 */
const revokeSession = async (userId, tokenId) => {
  const result = await appPool.query(
    `UPDATE "RefreshTokens" 
     SET "IsRevoked" = TRUE,
         "RevokedAt" = NOW(),
         "RevokedReason" = 'Revoked by user'
     WHERE "TokenId" = $1 AND "UserId" = $2
     RETURNING "TokenId"`,
    [tokenId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Session not found or already revoked');
  }

  return { success: true, message: 'Session revoked successfully' };
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  changePassword,
  getActiveSessions,
  revokeSession,
  extractDeviceInfo,
  generateTokens,
};
