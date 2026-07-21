const { appPool } = require('../config/db');

/**
 * Login History Service
 * 
 * Tracks all login attempts with device info, location, and security analysis.
 */

/**
 * Parse device information from user agent
 */
const parseUserAgent = (userAgent) => {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  if (!userAgent) return { browser, os, deviceType };

  // Parse browser
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';
  else if (/opera|opr/i.test(userAgent)) browser = 'Opera';

  // Parse OS
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'MacOS';
  else if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

  // Parse device type
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

  return { browser, os, deviceType };
};

/**
 * Log login attempt
 */
const logLoginAttempt = async (loginData) => {
  const {
    userId = null,
    email,
    loginStatus, // 'success', 'failed', 'locked', 'suspended', 'mfa_required'
    ipAddress,
    userAgent,
    deviceId = null,
    failureReason = null,
    mfaUsed = false,
    mfaMethod = null,
    sessionId = null
  } = loginData;

  const { browser, os, deviceType } = parseUserAgent(userAgent);

  // Check for suspicious patterns
  const isSuspicious = userId ? await detectSuspiciousLogin(userId, ipAddress, deviceId) : false;
  const suspiciousReason = isSuspicious ? await getSuspiciousReason(userId, ipAddress) : null;

  try {
    const result = await appPool.query(
      `INSERT INTO "LoginHistory" (
        "UserId", "Email", "LoginStatus", "IpAddress", "UserAgent",
        "DeviceType", "DeviceId", "Browser", "OperatingSystem",
        "FailureReason", "MfaUsed", "MfaMethod", "SessionId",
        "IsSuspicious", "SuspiciousReason", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING "LoginId"`,
      [
        userId,
        email,
        loginStatus,
        ipAddress,
        userAgent,
        deviceType,
        deviceId,
        browser,
        os,
        failureReason,
        mfaUsed,
        mfaMethod,
        sessionId,
        isSuspicious,
        suspiciousReason
      ]
    );

    return {
      loginId: result.rows[0].LoginId,
      isSuspicious
    };
  } catch (error) {
    console.error('Login history logging failed:', error);
    return { loginId: null, isSuspicious: false };
  }
};

/**
 * Detect suspicious login patterns
 */
const detectSuspiciousLogin = async (userId, ipAddress, deviceId) => {
  // Check multiple failed attempts in last hour
  const failedAttempts = await appPool.query(
    `SELECT COUNT(*) as "Count"
     FROM "LoginHistory"
     WHERE "UserId" = $1
       AND "LoginStatus" = 'failed'
       AND "CreatedAt" > NOW() - INTERVAL '1 hour'`,
    [userId]
  );

  if (parseInt(failedAttempts.rows[0]?.Count || 0) >= 3) {
    return true;
  }

  // Check for logins from multiple IPs in short time
  const recentIPs = await appPool.query(
    `SELECT COUNT(DISTINCT "IpAddress") as "Count"
     FROM "LoginHistory"
     WHERE "UserId" = $1
       AND "LoginStatus" = 'success'
       AND "CreatedAt" > NOW() - INTERVAL '15 minutes'`,
    [userId]
  );

  if (parseInt(recentIPs.rows[0]?.Count || 0) >= 3) {
    return true;
  }

  // Check for rapid succession logins
  const rapidLogins = await appPool.query(
    `SELECT COUNT(*) as "Count"
     FROM "LoginHistory"
     WHERE "UserId" = $1
       AND "CreatedAt" > NOW() - INTERVAL '5 minutes'`,
    [userId]
  );

  if (parseInt(rapidLogins.rows[0]?.Count || 0) >= 10) {
    return true;
  }

  return false;
};

/**
 * Get suspicious reason
 */
const getSuspiciousReason = async (userId, ipAddress) => {
  const reasons = [];

  const failedCount = await appPool.query(
    `SELECT COUNT(*) as "Count"
     FROM "LoginHistory"
     WHERE "UserId" = $1
       AND "LoginStatus" = 'failed'
       AND "CreatedAt" > NOW() - INTERVAL '1 hour'`,
    [userId]
  );

  if (parseInt(failedCount.rows[0]?.Count || 0) >= 3) {
    reasons.push('Multiple failed attempts in last hour');
  }

  const ipCount = await appPool.query(
    `SELECT COUNT(DISTINCT "IpAddress") as "Count"
     FROM "LoginHistory"
     WHERE "UserId" = $1
       AND "LoginStatus" = 'success'
       AND "CreatedAt" > NOW() - INTERVAL '15 minutes'`,
    [userId]
  );

  if (parseInt(ipCount.rows[0]?.Count || 0) >= 3) {
    reasons.push('Logins from multiple IPs');
  }

  return reasons.join('; ');
};

/**
 * Get login history for user
 */
const getUserLoginHistory = async (userId, limit = 50, offset = 0) => {
  const result = await appPool.query(
    `SELECT 
       "LoginId",
       "LoginStatus",
       "IpAddress",
       "DeviceType",
       "Browser",
       "OperatingSystem",
       "MfaUsed",
       "IsSuspicious",
       "SuspiciousReason",
       "CreatedAt"
     FROM "LoginHistory"
     WHERE "UserId" = $1
     ORDER BY "CreatedAt" DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
};

/**
 * Get failed login attempts for security monitoring
 */
const getFailedLoginAttempts = async (startDate, endDate, limit = 100) => {
  const result = await appPool.query(
    `SELECT 
       "LoginId",
       "UserId",
       "Email",
       "IpAddress",
       "DeviceType",
       "Browser",
       "FailureReason",
       "CreatedAt"
     FROM "LoginHistory"
     WHERE "LoginStatus" = 'failed'
       AND "CreatedAt" BETWEEN $1 AND $2
     ORDER BY "CreatedAt" DESC
     LIMIT $3`,
    [startDate, endDate, limit]
  );

  return result.rows;
};

/**
 * Get suspicious login attempts
 */
const getSuspiciousLogins = async (startDate, endDate) => {
  const result = await appPool.query(
    `SELECT 
       lh."LoginId",
       lh."UserId",
       u."Name" as "UserName",
       lh."Email",
       lh."IpAddress",
       lh."DeviceType",
       lh."SuspiciousReason",
       lh."CreatedAt"
     FROM "LoginHistory" lh
     LEFT JOIN "Users" u ON lh."UserId" = u."UserId"
     WHERE lh."IsSuspicious" = TRUE
       AND lh."CreatedAt" BETWEEN $1 AND $2
     ORDER BY lh."CreatedAt" DESC`,
    [startDate, endDate]
  );

  return result.rows;
};

/**
 * Get login statistics
 */
const getLoginStats = async (startDate, endDate) => {
  const result = await appPool.query(
    `SELECT 
       "LoginStatus",
       COUNT(*) as "Count",
       COUNT(DISTINCT "UserId") as "UniqueUsers"
     FROM "LoginHistory"
     WHERE "CreatedAt" BETWEEN $1 AND $2
     GROUP BY "LoginStatus"`,
    [startDate, endDate]
  );

  return result.rows;
};

/**
 * Update logout time for session
 */
const logLogout = async (sessionId) => {
  const result = await appPool.query(
    `UPDATE "LoginHistory"
     SET "LogoutAt" = NOW(),
         "LoginDuration" = EXTRACT(EPOCH FROM (NOW() - "CreatedAt"))::INT
     WHERE "SessionId" = $1
       AND "LogoutAt" IS NULL
     RETURNING "LoginId"`,
    [sessionId]
  );

  return result.rows.length > 0;
};

/**
 * Cleanup old login history
 */
const cleanupOldLoginHistory = async (retentionDays = 180) => {
  const result = await appPool.query(
    `DELETE FROM "LoginHistory"
     WHERE "CreatedAt" < NOW() - INTERVAL '${retentionDays} days'
     RETURNING "LoginId"`
  );

  return {
    deletedCount: result.rowCount,
    message: `Cleaned up ${result.rowCount} login records older than ${retentionDays} days`
  };
};

module.exports = {
  logLoginAttempt,
  getUserLoginHistory,
  getFailedLoginAttempts,
  getSuspiciousLogins,
  getLoginStats,
  logLogout,
  cleanupOldLoginHistory,
  detectSuspiciousLogin,
};
