'use strict';

/**
 * Quick test: login with a seeded user, get tokens, verify refresh token works.
 */

const jwt = require('jsonwebtoken');
const { appPool } = require('../config/db');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenUtils');
require('dotenv').config();

const TEST_EMAIL = 'owner1a@techcorp.example.com';

(async () => {
  try {
    // 1. Find the user
    const result = await appPool.query(
      'SELECT u.*, r."RoleName" FROM "Users" u ' +
      'LEFT JOIN "Roles" r ON r."Id" = u."RoleId" ' +
      'WHERE LOWER(u."Email") = LOWER($1)',
      [TEST_EMAIL]
    );
    const user = result.rows[0];
    if (!user) {
      console.log('❌ User not found:', TEST_EMAIL);
      process.exit(1);
    }
    console.log('✅ User found:', user.Name, '|', user.Email, '| RoleId:', user.RoleId, '| CompanyId:', user.CompanyId);

    // 2. Generate tokens
    const tokens = await generateTokens(user);
    console.log('✅ Access token:', tokens.accessToken.substring(0, 50) + '...');
    console.log('✅ Refresh token:', tokens.refreshToken.substring(0, 50) + '...');

    // 3. Decode and inspect refresh token
    const decoded = jwt.decode(tokens.refreshToken);
    console.log('   Refresh JTI:', decoded.jti);
    console.log('   Refresh expiry:', new Date(decoded.exp * 1000).toISOString());

    // 4. Verify the refresh token
    const verified = await verifyRefreshToken(tokens.refreshToken);
    if (verified) {
      console.log('✅ Refresh token verification PASSED');
      console.log('   Verified payload:', { userId: verified.userId, email: verified.email, jti: verified.jti });
    } else {
      console.log('❌ Refresh token verification FAILED');
    }

    // 5. Check it's in the database
    const dbCheck = await appPool.query(
      'SELECT "Id", "UserId", "Jti", "Revoked", "ExpiresAt" FROM "refresh_tokens" WHERE "Jti" = $1',
      [decoded.jti]
    );
    if (dbCheck.rows.length > 0) {
      const rec = dbCheck.rows[0];
      console.log('✅ Token found in DB:', { id: rec.Id, userId: rec.UserId, revoked: rec.Revoked, expiresAt: rec.ExpiresAt });
    } else {
      console.log('❌ Token NOT found in refresh_tokens table!');
    }

    await appPool.end();
    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    try { await appPool.end(); } catch (e) {}
    process.exit(1);
  }
})();
