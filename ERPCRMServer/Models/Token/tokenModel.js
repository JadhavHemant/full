const { appPool } = require('../../config/db');

const createTokenTable = async () => {
  // Create refresh_tokens table with support for JTI (token rotation) and hashed token storage
  const refreshTokensQuery = `
    CREATE TABLE IF NOT EXISTS "refresh_tokens" (
      "Id" SERIAL PRIMARY KEY,
      "UserId" INT REFERENCES "Users"("UserId"),
      "Token" TEXT,
      "TokenHash" TEXT,
      "Jti" VARCHAR(255),
      "ExpiresAt" TIMESTAMP NOT NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "Revoked" BOOLEAN DEFAULT FALSE
    );
  `;
  await appPool.query(refreshTokensQuery);
  
  // Ensure columns exist for backward compatibility with existing tables
  const alterQueries = [
    `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "TokenHash" TEXT`,
    `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "Jti" VARCHAR(255)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON "refresh_tokens"("Jti")`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON "refresh_tokens"("UserId")`,
  ];
  for (const query of alterQueries) {
    try { await appPool.query(query); } catch (_) { /* column may already exist */ }
  }
  
  console.log("✅ refresh_tokens table ready");

  // Ensure token_revocation_list table exists (used for immediate access token invalidation)
  const revocationListQuery = `
    CREATE TABLE IF NOT EXISTS token_revocation_list (
      "Id" SERIAL PRIMARY KEY,
      "Jti" VARCHAR(255) UNIQUE NOT NULL,
      "ExpiresAt" TIMESTAMP NOT NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  await appPool.query(revocationListQuery);

  // Create indexes for performance
  await appPool.query(
    'CREATE INDEX IF NOT EXISTS idx_token_revocation_jti ON token_revocation_list("Jti")'
  );
  await appPool.query(
    'CREATE INDEX IF NOT EXISTS idx_token_revocation_expires ON token_revocation_list("ExpiresAt")'
  );
  console.log("✅ token_revocation_list table ready");
};

module.exports = { createTokenTable };
