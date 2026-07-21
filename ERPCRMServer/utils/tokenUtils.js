const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const { appPool } = require('../config/db');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Hash a refresh token for secure storage
const hashToken = async (token) => {
  return bcryptjs.hash(token, 10);
};

// Generate a unique jti (JWT ID) for token rotation tracking
const generateJti = () => {
  return crypto.randomBytes(16).toString('hex');
};

const generateTokens = async (user) => {
  const jti = generateJti();
  const payload = {
    userId: user.UserId,
    email: user.Email,
    userTypeId: user.UserTypeId,
    roleId: user.RoleId,
    roleName: user.RoleName ?? null,
    companyId: user.CompanyId,
    hierarchyLevel: user.HierarchyLevel ?? 0,
    jti: jti, // Add jti for token rotation and revocation
  };

  // Generate access token (short-lived)
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000) + 's',
  });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  
  // Hash the refresh token before storing (security best practice)
  const hashedToken = await hashToken(refreshToken);

  // Store hashed token, not raw token
  await appPool.query(
    'INSERT INTO refresh_tokens ("UserId", "Token", "TokenHash", "Jti", "ExpiresAt", "CreatedAt", "Revoked") VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)',
    [user.UserId, refreshToken, hashedToken, jti, expiresAt]
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ Tokens generated for user ${user.UserId} (jti: ${jti})`);
  }

  return { accessToken, refreshToken };
};

// Verify access token and check for revocation
const verifyAccessToken = async (token) => {
  try {
    if (!token || typeof token !== 'string') {
      console.error('❌ Invalid token format:', typeof token);
      return null;
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Check if token is in revocation list (optional: for immediate logout)
    const revocationResult = await appPool.query(
      'SELECT 1 FROM token_revocation_list WHERE "Jti" = $1 AND "ExpiresAt" > NOW()',
      [decoded.jti]
    );
    
    if (revocationResult.rows.length > 0) {
      console.warn('⚠️ Token is revoked:', decoded.jti);
      return null; // Token is revoked
    }
    
    return decoded;
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    return null;
  }
};

// Verify refresh token against hashed value in DB
const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    
    // Find token record by jti
    const result = await appPool.query(
      'SELECT * FROM refresh_tokens WHERE "Jti" = $1 AND "Revoked" = FALSE AND "ExpiresAt" > NOW()',
      [decoded.jti]
    );

    if (result.rows.length === 0) {
      return null; // Token not found or expired/revoked
    }

    const tokenRecord = result.rows[0];
    
    // Verify hashed token matches
    const isValid = await bcryptjs.compare(token, tokenRecord.TokenHash);
    
    if (!isValid) {
      // Token hash doesn't match - possible tampering
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
};

// Revoke a refresh token (mark as revoked instead of deleting)
const revokeRefreshToken = async (jti) => {
  try {
    await appPool.query(
      'UPDATE refresh_tokens SET "Revoked" = TRUE WHERE "Jti" = $1',
      [jti]
    );
    return true;
  } catch (err) {
    console.error('Error revoking token:', err);
    return false;
  }
};

// Add token to revocation list (for immediate access token invalidation if needed)
const revokeAccessToken = async (jti) => {
  try {
    const expiresAt = new Date(Date.now() + (15 * 60 * 1000)); // Same as access token expiry
    await appPool.query(
      'INSERT INTO token_revocation_list ("Jti", "ExpiresAt", "CreatedAt") VALUES ($1, $2, NOW()) ON CONFLICT ("Jti") DO NOTHING',
      [jti, expiresAt]
    );
    return true;
  } catch (err) {
    console.error('Error adding token to revocation list:', err);
    return false;
  }
};

// Revoke all user's refresh tokens (logout all devices)
const revokeAllUserTokens = async (userId) => {
  try {
    await appPool.query(
      'UPDATE refresh_tokens SET "Revoked" = TRUE WHERE "UserId" = $1 AND "Revoked" = FALSE',
      [userId]
    );
    return true;
  } catch (err) {
    console.error('Error revoking all user tokens:', err);
    return false;
  }
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateTokens,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAccessToken,
  revokeAllUserTokens,
  hashToken,
  generateJti,
};
