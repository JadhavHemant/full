-- Migration: Add token rotation and revocation support
-- Created: 2026-06-14
-- Purpose: Update refresh_tokens table and add revocation tracking

-- Update refresh_tokens table to support token rotation with jti and hashing
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "Jti" VARCHAR(255) UNIQUE NOT NULL DEFAULT '';
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "TokenHash" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW();
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "ParentJti" VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "Revoked" BOOLEAN DEFAULT FALSE;

-- Create index on Jti for fast lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens("Jti");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens("UserId", "Revoked");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens("ExpiresAt");

-- Create token revocation list table (for immediate access token invalidation if needed)
CREATE TABLE IF NOT EXISTS token_revocation_list (
  "Id" SERIAL PRIMARY KEY,
  "Jti" VARCHAR(255) UNIQUE NOT NULL,
  "ExpiresAt" TIMESTAMP NOT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- Index for revocation checks
CREATE INDEX IF NOT EXISTS idx_token_revocation_jti ON token_revocation_list("Jti");
CREATE INDEX IF NOT EXISTS idx_token_revocation_expires ON token_revocation_list("ExpiresAt");

-- Optional: Cleanup job to remove old revoked tokens periodically
-- Run as scheduled job: DELETE FROM refresh_tokens WHERE "ExpiresAt" < NOW() - INTERVAL '1 month';
-- Run as scheduled job: DELETE FROM token_revocation_list WHERE "ExpiresAt" < NOW();
