const jwt = require('jsonwebtoken');
const { appPool } = require('../config/db');
const { generateTokens, verifyRefreshToken, revokeRefreshToken } = require('../utils/tokenUtils');

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    console.warn('⚠️ Refresh token endpoint called without refresh token');
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    console.log('🔄 Refreshing access token...');
    // Verify and validate the refresh token
    const payload = await verifyRefreshToken(refreshToken);
    
    if (!payload) {
      console.warn('⚠️ Invalid or expired refresh token provided');
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    // Fetch user to generate new tokens
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
      [payload.userId]
    );

    const dbUser = userResult.rows[0];
    if (!dbUser) {
      console.error('❌ User not found during token refresh:', payload.userId);
      return res.status(403).json({ message: 'User not found' });
    }

    // IMPLEMENT TOKEN ROTATION: Revoke old refresh token and issue new ones
    await revokeRefreshToken(payload.jti);

    // Generate new access + refresh tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(dbUser);

    console.log('✅ Tokens refreshed successfully');
    // Return both tokens (client should update its stored refresh token)
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
