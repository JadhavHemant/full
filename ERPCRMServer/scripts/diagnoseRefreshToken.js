'use strict';

/**
 * Refresh Token Diagnostic Script
 *
 * Investigates why the "Invalid or expired refresh token" error occurs.
 * Checks:
 *   1. Whether the `refresh_tokens` table exists and has the required columns
 *   2. Whether there are any refresh token records in the table
 *   3. Whether tokens are expired or revoked
 *   4. Whether the JWT can be verified (signature + expiry)
 *   5. Whether the bcrypt hash matches
 *   6. Whether there is a mismatch between the two token tables
 *
 * Usage:  node scripts/diagnoseRefreshToken.js
 *         node scripts/diagnoseRefreshToken.js <refresh-token-string>
 */

const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { appPool } = require('../config/db');
require('dotenv').config();

const diagnose = async () => {
  const client = await appPool.connect();
  let refreshTokenArg = process.argv[2] || null;

  let tableExists = false;
  let countResult = null;

  try {
    console.log('\n🔍 Refresh Token Diagnostic Report\n');
    console.log('='.repeat(60));

    // ── 1. Check table existence and schema ──────────────────────────────
    console.log('\n1️⃣  Checking `refresh_tokens` table (lowercase)...\n');

    const tableCheck = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
       ) AS "exists"`
    );

    tableExists = tableCheck.rows[0]?.exists;
    console.log(`   Table exists: ${tableExists ? '✅ YES' : '❌ NO'}`);

    if (tableExists) {
      const columns = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'refresh_tokens'
         ORDER BY ordinal_position`
      );
      console.log('   Columns:');
      columns.rows.forEach(col => {
        const required = ['UserId', 'Token', 'TokenHash', 'Jti', 'ExpiresAt', 'Revoked'].includes(col.column_name);
        console.log(`     ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})${required ? ' ⭐ required' : ''}`);
      });

      const requiredCols = ['UserId', 'Token', 'TokenHash', 'Jti', 'ExpiresAt', 'Revoked'];
      const actualCols = columns.rows.map(r => r.column_name);
      const missing = requiredCols.filter(c => !actualCols.includes(c));
      if (missing.length > 0) {
        console.log(`\n   ❌ MISSING required columns: ${missing.join(', ')}`);
        console.log('   💡 Run: node addJtiColumn.js');
      } else {
        console.log('\n   ✅ All required columns present');
      }
    }

    // ── 2. Check PascalCase RefreshTokens table ───────────────────────────
    console.log('\n2️⃣  Checking `"RefreshTokens"` table (PascalCase)...\n');

    const pascalCheck = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'RefreshTokens'
       ) AS "exists"`
    );
    const pascalExists = pascalCheck.rows[0]?.exists;
    console.log(`   Table exists: ${pascalExists ? '✅ YES' : '❌ NO'}`);

    if (pascalExists) {
      const pascalCount = await client.query(`SELECT COUNT(*) FROM "RefreshTokens"`);
      console.log(`   Records: ${pascalCount.rows[0].count}`);
      console.log('   ⚠️  This table is used by authService.js (NOT actively used by routes).');
      console.log('   The active system uses the lowercase `refresh_tokens` table.');
    }

    // ── 3. Count tokens in the active table ───────────────────────────────
    console.log('\n3️⃣  Checking token records in `refresh_tokens`...\n');

    if (tableExists) {
      countResult = await client.query(
        `SELECT
           COUNT(*) AS "total",
           COUNT(CASE WHEN "Revoked" = TRUE THEN 1 END) AS "revoked",
           COUNT(CASE WHEN "Revoked" = FALSE THEN 1 END) AS "active",
           COUNT(CASE WHEN "Revoked" = FALSE AND "ExpiresAt" > NOW() THEN 1 END) AS "valid",
           COUNT(CASE WHEN "Revoked" = FALSE AND "ExpiresAt" <= NOW() THEN 1 END) AS "expired"
         FROM "refresh_tokens"`
      );
      const stats = countResult.rows[0];
      console.log(`   Total tokens:   ${stats.total}`);
      console.log(`   Active (not revoked): ${stats.active}`);
      console.log(`   Valid (active + not expired): ${stats.valid}`);
      console.log(`   Expired:        ${stats.expired}`);
      console.log(`   Revoked:        ${stats.revoked}`);

      if (Number(stats.total) === 0) {
        console.log('\n   ❌ NO refresh tokens in the database!');
        console.log('   💡 This is likely the cause of "Invalid or expired refresh token".');
        console.log('   The database was probably reset/truncated, but the browser');
        console.log('   still holds an old refresh token cookie.');
        console.log('   👉 Solution: Clear browser cookies and log in again.');
      }

      // Show sample tokens
      const sample = await client.query(
        `SELECT "Id", "UserId", "Jti", "ExpiresAt", "Revoked", "CreatedAt"
         FROM "refresh_tokens"
         ORDER BY "CreatedAt" DESC
         LIMIT 5`
      );
      if (sample.rows.length > 0) {
        console.log('\n   Recent tokens:');
        sample.rows.forEach(t => {
          const expired = new Date(t.ExpiresAt) < new Date();
          console.log(`     Id: ${t.Id} | UserId: ${t.UserId} | Jti: ${t.Jti?.substring(0, 16)}... | Expired: ${expired ? '❌' : '✅'} | Revoked: ${t.Revoked ? '❌' : '✅'} | Created: ${t.CreatedAt}`);
        });
      }
    }

    // ── 4. If a refresh token string is provided, diagnose it ─────────────
    if (refreshTokenArg) {
      console.log('\n4️⃣  Diagnosing provided refresh token...\n');
      console.log(`   Token (first 40 chars): ${refreshTokenArg.substring(0, 40)}...`);
      console.log(`   Token length: ${refreshTokenArg.length}`);

      // 4a. Verify JWT signature
      let decoded = null;
      try {
        decoded = jwt.verify(refreshTokenArg, process.env.REFRESH_TOKEN_SECRET);
        console.log('\n   ✅ JWT signature valid');
      } catch (err) {
        console.log(`\n   ❌ JWT verification failed: ${err.message}`);
        if (err.name === 'TokenExpiredError') {
          console.log('   💡 The refresh token has expired (7-day lifetime).');
          console.log('   👉 Solution: Log in again to get a new refresh token.');
        }
      }

      if (decoded) {
        console.log(`   Payload: userId=${decoded.userId}, email=${decoded.email}, jti=${decoded.jti}`);
        console.log(`   JWT exp: ${new Date(decoded.exp * 1000).toISOString()}`);

        // 4b. Look up in DB
        const dbResult = await client.query(
          `SELECT * FROM "refresh_tokens" WHERE "Jti" = $1`,
          [decoded.jti]
        );

        if (dbResult.rows.length === 0) {
          console.log('\n   ❌ Token NOT FOUND in `refresh_tokens` table!');
          console.log('   💡 The JWT is valid but there is no matching database record.');
          console.log('   This happens when:');
          console.log('     - The database was reset/truncated after login');
          console.log('     - The token was stored in the wrong table (PascalCase vs lowercase)');
          console.log('     - The token was manually deleted');
          console.log('   👉 Solution: Clear browser cookies and log in again.');
        } else {
          const record = dbResult.rows[0];
          console.log(`\n   ✅ Token found in DB (Id: ${record.Id})`);
          console.log(`   Revoked: ${record.Revoked ? '❌ YES' : '✅ NO'}`);
          console.log(`   ExpiresAt: ${record.ExpiresAt}`);
          console.log(`   Expired: ${new Date(record.ExpiresAt) < new Date() ? '❌ YES' : '✅ NO'}`);

          if (record.Revoked) {
            console.log('\n   ❌ Token has been REVOKED!');
            console.log('   💡 This happens after logout or token rotation.');
            console.log('   👉 Solution: Log in again to get a new refresh token.');
          }

          if (new Date(record.ExpiresAt) < new Date()) {
            console.log('\n   ❌ Token has EXPIRED in the database!');
          }

          // 4c. Verify bcrypt hash
          if (!record.Revoked && new Date(record.ExpiresAt) >= new Date()) {
            const hashValid = await bcryptjs.compare(refreshTokenArg, record.TokenHash);
            if (hashValid) {
              console.log('\n   ✅ Bcrypt hash matches — token is fully valid');
            } else {
              console.log('\n   ❌ Bcrypt hash MISMATCH — possible token tampering!');
            }
          }
        }
      }
    } else {
      console.log('\n4️⃣  To diagnose a specific token, pass it as an argument:');
      console.log('   node scripts/diagnoseRefreshToken.js <your-refresh-token>');
    }

    // ── 5. Summary ────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY\n');

    if (!tableExists) {
      console.log('❌ The `refresh_tokens` table does not exist.');
      console.log('   Run the server once to create it via initModels(), or run:');
      console.log('   node -e "require(\'./Models/initModels\').initModels()"');
    } else if (countResult && Number(countResult.rows[0].total) === 0) {
      console.log('❌ The `refresh_tokens` table exists but is EMPTY.');
      console.log('   The database was likely reset. All browser cookies with old');
      console.log('   refresh tokens are now invalid.');
      console.log('   👉 Clear browser cookies and log in again.');
    } else {
      console.log('✅ The `refresh_tokens` table exists and has records.');
      console.log('   If you still see the error, the specific token may be:');
      console.log('     - Expired (7-day lifetime)');
      console.log('     - Revoked (after logout or token rotation)');
      console.log('     - Not matching the stored hash (tampering)');
      console.log('   Pass the token as an argument for detailed diagnosis.');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  } catch (err) {
    console.error('\n❌ Diagnostic error:', err.message);
    console.error(err);
  } finally {
    client.release();
    await appPool.end();
  }
};

diagnose().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
