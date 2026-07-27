const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { appPool } = require('../config/db');
const { generateTokens, revokeRefreshToken } = require('../utils/tokenUtils');

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    console.warn('⚠️ Refresh token endpoint called without refresh token');
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    console.log('🔄 Refreshing access token...');

    // ── Step 1: Verify JWT signature and expiry ───────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        console.warn('⚠️ Refresh token JWT has expired');
        return res.status(403).json({
          message: 'Refresh token has expired. Please log in again.',
          code: 'REFRESH_TOKEN_EXPIRED',
        });
      }
      console.warn('⚠️ Invalid refresh token JWT:', jwtErr.message);
      return res.status(403).json({
        message: 'Invalid refresh token. Please log in again.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // ── Step 2: Look up token record in the active `refresh_tokens` table ──
    const tokenResult = await appPool.query(
      `SELECT * FROM "refresh_tokens"
       WHERE "Jti" = $1 AND "Revoked" = FALSE AND "ExpiresAt" > NOW()`,
      [decoded.jti]
    );

    if (tokenResult.rows.length === 0) {
      // Check whether the record exists at all (revoked or expired) to give
      // a more precise error message.
      const anyResult = await appPool.query(
        `SELECT * FROM "refresh_tokens" WHERE "Jti" = $1`,
        [decoded.jti]
      );

      if (anyResult.rows.length > 0) {
        const record = anyResult.rows[0];
        if (record.Revoked) {
          console.warn('⚠️ Refresh token has been revoked (logout or rotation)');
          return res.status(403).json({
            message: 'Refresh token has been revoked. Please log in again.',
            code: 'REFRESH_TOKEN_REVOKED',
          });
        }
        if (new Date(record.ExpiresAt) <= new Date()) {
          console.warn('⚠️ Refresh token has expired in database');
          return res.status(403).json({
            message: 'Refresh token has expired. Please log in again.',
            code: 'REFRESH_TOKEN_EXPIRED',
          });
        }
      }

      // JWT is valid but NO matching DB record — most common cause:
      // the database was reset/truncated after login.
      console.warn('⚠️ Invalid or expired refresh token provided');
      console.warn('   JWT signature is valid but no matching record found in `refresh_tokens` table');
      console.warn('   This typically happens after a database reset/truncation');
      return res.status(403).json({
        message: 'Invalid or expired refresh token. The session may have been invalidated. Please log in again.',
        code: 'REFRESH_TOKEN_NOT_FOUND',
        details: 'JWT signature is valid but no matching record was found in the database. This typically happens after a database reset or truncation.',
      });
    }

    const tokenRecord = tokenResult.rows[0];

    // ── Step 3: Verify bcrypt hash (tamper detection) ─────────────────────
    const isValid = await bcryptjs.compare(refreshToken, tokenRecord.TokenHash);
    if (!isValid) {
      console.warn('⚠️ Refresh token hash mismatch — possible tampering');
      return res.status(403).json({
        message: 'Invalid refresh token. Please log in again.',
        code: 'REFRESH_TOKEN_HASH_MISMATCH',
      });
    }

    // ── Step 4: Fetch user to generate new tokens ─────────────────────────
    const userResult = await appPool.query(
      `
        SELECT
          u."UserId",
          u."Email",
          u."UserTypeId",
          u."RoleId",
          u."CompanyId",
          u."HierarchyLevel",
          r."RoleName"
        FROM "Users" u
        LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
        WHERE u."UserId" = $1
        LIMIT 1
      `,
      [decoded.userId]
    );

    const dbUser = userResult.rows[0];
    if (!dbUser) {
      console.error('❌ User not found during token refresh:', decoded.userId);
      return res.status(403).json({ message: 'User not found' });
    }

    // ── Step 5: Rotate — revoke old, issue new ───────────────────────────
    await revokeRefreshToken(decoded.jti);
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(dbUser);

    console.log('✅ Tokens refreshed successfully');
    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (err) {
    console.error('❌ Token refresh error:', err);
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

// Logout endpoint: revoke all user's refresh tokens
const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Revoke all refresh tokens for this user
    const { revokeAllUserTokens } = require('../utils/tokenUtils');
    await revokeAllUserTokens(userId);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Logout failed' });
  }
};

module.exports = { refreshAccessToken, logout };
