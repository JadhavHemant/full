const { appPool } = require('../../config/db');

/**
 * RefreshTokens Model
 * 
 * Stores refresh tokens for JWT token rotation strategy.
 * Each refresh token is tracked with device info and expiration.
 * Supports token revocation and device-specific logout.
 */
const RefreshTokens = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RefreshTokens" (
      "TokenId" SERIAL PRIMARY KEY,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "Token" TEXT NOT NULL UNIQUE,
      "TokenVersion" INT NOT NULL DEFAULT 0,
      "ExpiresAt" TIMESTAMP NOT NULL,
      "IsRevoked" BOOLEAN DEFAULT FALSE,
      "RevokedAt" TIMESTAMP,
      "RevokedReason" TEXT,
      "IpAddress" VARCHAR(64),
      "UserAgent" TEXT,
      "DeviceId" VARCHAR(255),
      "DeviceType" VARCHAR(50),
      "RememberMe" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "LastUsedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance and cleanup
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON "RefreshTokens"("UserId");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON "RefreshTokens"("Token");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON "RefreshTokens"("ExpiresAt");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON "RefreshTokens"("IsRevoked");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON "RefreshTokens"("UserId", "IsRevoked", "ExpiresAt");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_device ON "RefreshTokens"("UserId", "DeviceId");
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_version ON "RefreshTokens"("UserId", "TokenVersion");

    -- Create cleanup function for expired tokens
    CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
    RETURNS void AS $$
    BEGIN
      DELETE FROM "RefreshTokens"
      WHERE "ExpiresAt" < NOW() - INTERVAL '30 days'
        OR ("IsRevoked" = TRUE AND "RevokedAt" < NOW() - INTERVAL '30 days');
    END;
    $$ LANGUAGE plpgsql;

    -- Add comments
    COMMENT ON TABLE "RefreshTokens" IS 'Refresh tokens for JWT token rotation with device tracking';
    COMMENT ON COLUMN "RefreshTokens"."TokenVersion" IS 'Matches Users.RefreshTokenVersion - invalidated on logout-all';
    COMMENT ON COLUMN "RefreshTokens"."DeviceId" IS 'Unique device identifier for device-specific logout';
    COMMENT ON COLUMN "RefreshTokens"."RememberMe" IS 'Extended expiration if user selected remember me';
    COMMENT ON COLUMN "RefreshTokens"."RevokedReason" IS 'Reason for revocation: logout, security, expired, etc.';
  `;

  await appPool.query(query);
  console.log('✅ RefreshTokens table ready');
};

module.exports = { RefreshTokens };
