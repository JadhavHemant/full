-- Migration: Extend Users table with enterprise authentication fields
-- Created: 2026-07-20
-- Purpose: Add comprehensive authentication and security tracking fields to existing Users table

-- Add authentication tracking fields to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordChangedAt" TIMESTAMP;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "FailedLoginAttempts" INT DEFAULT 0;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LockedUntil" TIMESTAMP;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastLoginIP" VARCHAR(64);
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastLoginDevice" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "RefreshTokenVersion" INT DEFAULT 0;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "RememberMe" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(20) DEFAULT 'active';
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId");
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EmailVerifiedAt" TIMESTAMP;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordResetRequired" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "TwoFactorEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "TwoFactorSecret" TEXT;

-- Add check constraint for Status field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE "Users" ADD CONSTRAINT "users_status_check" 
    CHECK ("Status" IN ('active', 'inactive', 'locked', 'suspended', 'pending'));
  END IF;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON "Users"("EmailVerified");
CREATE INDEX IF NOT EXISTS idx_users_status ON "Users"("Status");
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON "Users"("LockedUntil");
CREATE INDEX IF NOT EXISTS idx_users_last_login ON "Users"("LastLoginAt");
CREATE INDEX IF NOT EXISTS idx_users_refresh_token_version ON "Users"("RefreshTokenVersion");
CREATE INDEX IF NOT EXISTS idx_users_company_active ON "Users"("CompanyId", "IsActive", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_users_role_active ON "Users"("RoleId", "IsActive");

-- Add comment
COMMENT ON COLUMN "Users"."PasswordChangedAt" IS 'Timestamp of last password change for password expiry policies';
COMMENT ON COLUMN "Users"."FailedLoginAttempts" IS 'Counter for failed login attempts used for account locking';
COMMENT ON COLUMN "Users"."LockedUntil" IS 'Account is locked until this timestamp if exceeded failed attempts';
COMMENT ON COLUMN "Users"."LastLoginIP" IS 'IP address of last successful login for security tracking';
COMMENT ON COLUMN "Users"."LastLoginDevice" IS 'Device information (user agent) of last login';
COMMENT ON COLUMN "Users"."RefreshTokenVersion" IS 'Version counter incremented on logout-all to invalidate all tokens';
COMMENT ON COLUMN "Users"."RememberMe" IS 'Flag indicating if user has remember me enabled for extended sessions';
COMMENT ON COLUMN "Users"."Status" IS 'User account status: active, inactive, locked, suspended, or pending';
COMMENT ON COLUMN "Users"."UpdatedBy" IS 'User ID who last updated this record for audit trail';
COMMENT ON COLUMN "Users"."EmailVerifiedAt" IS 'Timestamp when email was verified';
COMMENT ON COLUMN "Users"."PasswordResetRequired" IS 'Flag requiring user to reset password on next login';
COMMENT ON COLUMN "Users"."TwoFactorEnabled" IS 'Flag indicating if 2FA is enabled for this user';
COMMENT ON COLUMN "Users"."TwoFactorSecret" IS 'Encrypted 2FA secret key for TOTP authentication';

-- Update existing records to set PasswordChangedAt to creation date if null
UPDATE "Users" SET "PasswordChangedAt" = "CreatedAt" WHERE "PasswordChangedAt" IS NULL;

-- Update existing records to set Status to active where null
UPDATE "Users" SET "Status" = 'active' WHERE "Status" IS NULL AND "IsActive" = TRUE;
UPDATE "Users" SET "Status" = 'inactive' WHERE "Status" IS NULL AND "IsActive" = FALSE;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003: Users table extended with authentication fields';
END $$;
