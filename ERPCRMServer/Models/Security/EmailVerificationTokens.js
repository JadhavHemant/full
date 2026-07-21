const { appPool } = require('../../config/db');

/**
 * EmailVerificationTokens Model
 * 
 * Stores email verification tokens sent to users.
 * Supports token expiration, resend limits, and verification tracking.
 */
const EmailVerificationTokens = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "EmailVerificationTokens" (
      "VerificationId" SERIAL PRIMARY KEY,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "Email" VARCHAR(255) NOT NULL,
      "Token" TEXT NOT NULL UNIQUE,
      "ExpiresAt" TIMESTAMP NOT NULL,
      "IsVerified" BOOLEAN DEFAULT FALSE,
      "VerifiedAt" TIMESTAMP,
      "ResendCount" INT DEFAULT 0,
      "LastResentAt" TIMESTAMP,
      "IpAddress" VARCHAR(64),
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_email_verification_user ON "EmailVerificationTokens"("UserId");
    CREATE INDEX IF NOT EXISTS idx_email_verification_token ON "EmailVerificationTokens"("Token");
    CREATE INDEX IF NOT EXISTS idx_email_verification_email ON "EmailVerificationTokens"("Email");
    CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON "EmailVerificationTokens"("ExpiresAt");
    CREATE INDEX IF NOT EXISTS idx_email_verification_verified ON "EmailVerificationTokens"("IsVerified");

    -- Create cleanup function for old verification tokens
    CREATE OR REPLACE FUNCTION cleanup_old_verification_tokens()
    RETURNS void AS $$
    BEGIN
      DELETE FROM "EmailVerificationTokens"
      WHERE ("IsVerified" = TRUE AND "VerifiedAt" < NOW() - INTERVAL '7 days')
        OR ("IsVerified" = FALSE AND "ExpiresAt" < NOW() - INTERVAL '7 days');
    END;
    $$ LANGUAGE plpgsql;

    -- Add comments
    COMMENT ON TABLE "EmailVerificationTokens" IS 'Email verification tokens for user account activation';
    COMMENT ON COLUMN "EmailVerificationTokens"."ResendCount" IS 'Number of times verification email was resent';
    COMMENT ON COLUMN "EmailVerificationTokens"."LastResentAt" IS 'Timestamp of last verification email resend';
  `;

  await appPool.query(query);
  console.log('✅ EmailVerificationTokens table ready');
};

module.exports = { EmailVerificationTokens };
