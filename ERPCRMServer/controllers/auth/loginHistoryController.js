'use strict';

/**
 * Login History Controller
 *
 * Endpoints:
 *   GET    /api/auth/login-history           — own history (or admin: any user)
 *   GET    /api/auth/active-sessions         — own active refresh tokens
 *   DELETE /api/auth/sessions/:tokenId       — revoke a specific session
 *   GET    /api/auth/login-history/failed    — admin: recent failed attempts
 *   GET    /api/auth/login-history/suspicious— admin: suspicious logins
 *   GET    /api/auth/login-history/stats     — admin: login statistics
 */

const { appPool } = require('../../config/db');
const { revokeRefreshToken } = require('../../utils/tokenUtils');

const isSuperAdmin   = (u) => (u?.roleId || u?.RoleId) === 1;
const isPrivileged   = (u) => (u?.roleId || u?.RoleId) <= 2;
const getUserId      = (req) => req.user?.userId || req.user?.UserId;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/login-history
// ─────────────────────────────────────────────────────────────────────────────

const getLoginHistory = async (req, res) => {
  try {
    const requestingId   = getUserId(req);
    const { userId, limit = 50, offset = 0, status, startDate, endDate } = req.query;

    // Non-admins can only see their own history
    const targetUserId = (isPrivileged(req.user) && userId)
      ? parseInt(userId, 10)
      : requestingId;

    if (!isPrivileged(req.user) && userId && parseInt(userId) !== requestingId) {
      return res.status(403).json({ message: 'Cannot view another user\'s login history' });
    }

    const params = [targetUserId];
    let query = `
      SELECT "LoginId", "LoginStatus", "IpAddress", "DeviceType", "Browser",
             "OperatingSystem", "MfaUsed", "IsSuspicious", "SuspiciousReason",
             "FailureReason", "SessionId", "CreatedAt", "LogoutAt", "LoginDuration"
      FROM "LoginHistory"
      WHERE "UserId" = $1
    `;
    let p = 2;

    if (status) { query += ` AND "LoginStatus" = $${p++}`; params.push(status); }
    if (startDate) { query += ` AND "CreatedAt" >= $${p++}`; params.push(startDate); }
    if (endDate)   { query += ` AND "CreatedAt" <= $${p++}`; params.push(endDate); }

    query += ` ORDER BY "CreatedAt" DESC LIMIT $${p++} OFFSET $${p++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await appPool.query(query, params);

    const countResult = await appPool.query(
      `SELECT COUNT(*) FROM "LoginHistory" WHERE "UserId" = $1`, [targetUserId]
    );

    return res.status(200).json({
      loginHistory: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (e) {
    console.error('getLoginHistory error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/active-sessions
// ─────────────────────────────────────────────────────────────────────────────

const getActiveSessions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await appPool.query(`
      SELECT "Id" AS "TokenId", "DeviceType", "UserAgent", "IpAddress",
             "CreatedAt", "ExpiresAt", "LastUsedAt", "RememberMe"
      FROM refresh_tokens
      WHERE "UserId" = $1
        AND "Revoked"   = FALSE
        AND "ExpiresAt" > NOW()
      ORDER BY "LastUsedAt" DESC
    `, [userId]);

    return res.status(200).json({ sessions: result.rows });
  } catch (e) {
    console.error('getActiveSessions error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/sessions/:tokenId
// ─────────────────────────────────────────────────────────────────────────────

const revokeSession = async (req, res) => {
  try {
    const userId  = getUserId(req);
    const tokenId = parseInt(req.params.tokenId, 10);

    // Verify the session belongs to the requesting user (or requester is admin)
    const tokenResult = await appPool.query(`
      SELECT "Id", "UserId", "Jti" FROM refresh_tokens WHERE "Id" = $1
    `, [tokenId]);

    if (!tokenResult.rows.length) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const token = tokenResult.rows[0];
    if (token.UserId !== userId && !isPrivileged(req.user)) {
      return res.status(403).json({ message: 'Cannot revoke another user\'s session' });
    }

    await revokeRefreshToken(token.Jti);
    return res.status(200).json({ message: 'Session revoked successfully' });
  } catch (e) {
    console.error('revokeSession error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/login-history/failed  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

const getFailedLogins = async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end   = endDate   || new Date().toISOString();

    const result = await appPool.query(`
      SELECT lh."LoginId", lh."UserId", lh."Email", lh."IpAddress",
             lh."DeviceType", lh."Browser", lh."FailureReason", lh."CreatedAt",
             u."Name" AS "UserName"
      FROM "LoginHistory" lh
      LEFT JOIN "Users" u ON u."UserId" = lh."UserId"
      WHERE lh."LoginStatus" = 'failed'
        AND lh."CreatedAt" BETWEEN $1 AND $2
      ORDER BY lh."CreatedAt" DESC
      LIMIT $3
    `, [start, end, parseInt(limit)]);

    return res.status(200).json({ failedLogins: result.rows });
  } catch (e) {
    console.error('getFailedLogins error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/login-history/suspicious  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

const getSuspiciousLogins = async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end   = endDate   || new Date().toISOString();

    const result = await appPool.query(`
      SELECT lh."LoginId", lh."UserId", lh."Email", lh."IpAddress",
             lh."DeviceType", lh."SuspiciousReason", lh."CreatedAt",
             u."Name" AS "UserName"
      FROM "LoginHistory" lh
      LEFT JOIN "Users" u ON u."UserId" = lh."UserId"
      WHERE lh."IsSuspicious" = TRUE
        AND lh."CreatedAt" BETWEEN $1 AND $2
      ORDER BY lh."CreatedAt" DESC
    `, [start, end]);

    return res.status(200).json({ suspiciousLogins: result.rows });
  } catch (e) {
    console.error('getSuspiciousLogins error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/login-history/stats  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

const getLoginStats = async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end   = endDate   || new Date().toISOString();

    const byStatus = await appPool.query(`
      SELECT "LoginStatus", COUNT(*) AS "Count", COUNT(DISTINCT "UserId") AS "UniqueUsers"
      FROM "LoginHistory"
      WHERE "CreatedAt" BETWEEN $1 AND $2
      GROUP BY "LoginStatus"
    `, [start, end]);

    const byDay = await appPool.query(`
      SELECT DATE("CreatedAt") AS "Date",
             COUNT(*) FILTER (WHERE "LoginStatus" = 'success') AS "Successes",
             COUNT(*) FILTER (WHERE "LoginStatus" = 'failed')  AS "Failures"
      FROM "LoginHistory"
      WHERE "CreatedAt" BETWEEN $1 AND $2
      GROUP BY DATE("CreatedAt")
      ORDER BY "Date"
    `, [start, end]);

    return res.status(200).json({
      period: { startDate: start, endDate: end },
      byStatus:  byStatus.rows,
      byDay:     byDay.rows,
    });
  } catch (e) {
    console.error('getLoginStats error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLoginHistory,
  getActiveSessions,
  revokeSession,
  getFailedLogins,
  getSuspiciousLogins,
  getLoginStats,
};
