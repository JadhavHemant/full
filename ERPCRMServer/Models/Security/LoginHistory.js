const { appPool } = require('../../config/db');

/**
 * LoginHistory Model
 * 
 * Comprehensive login attempt tracking for security monitoring.
 * Records successful and failed login attempts with device and location info.
 * Supports security analysis, anomaly detection, and compliance reporting.
 */
const LoginHistory = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "LoginHistory" (
      "LoginId" SERIAL PRIMARY KEY,
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "Email" VARCHAR(255),
      "LoginStatus" VARCHAR(20) NOT NULL,
      "IpAddress" VARCHAR(64),
      "UserAgent" TEXT,
      "DeviceType" VARCHAR(50),
      "DeviceId" VARCHAR(255),
      "Browser" VARCHAR(100),
      "OperatingSystem" VARCHAR(100),
      "Location" JSONB,
      "FailureReason" TEXT,
      "MfaUsed" BOOLEAN DEFAULT FALSE,
      "MfaMethod" VARCHAR(50),
      "SessionId" VARCHAR(255),
      "LoginDuration" INT,
      "LogoutAt" TIMESTAMP,
      "IsSuspicious" BOOLEAN DEFAULT FALSE,
      "SuspiciousReason" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add check constraint for LoginStatus
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'login_history_status_check'
      ) THEN
        ALTER TABLE "LoginHistory" ADD CONSTRAINT "login_history_status_check" 
        CHECK ("LoginStatus" IN ('success', 'failed', 'locked', 'suspended', 'mfa_required', 'mfa_failed'));
      END IF;
    END $$;

    -- Create indexes for performance and analysis
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON "LoginHistory"("UserId");
    CREATE INDEX IF NOT EXISTS idx_login_history_email ON "LoginHistory"("Email");
    CREATE INDEX IF NOT EXISTS idx_login_history_status ON "LoginHistory"("LoginStatus");
    CREATE INDEX IF NOT EXISTS idx_login_history_created ON "LoginHistory"("CreatedAt");
    CREATE INDEX IF NOT EXISTS idx_login_history_ip ON "LoginHistory"("IpAddress");
    CREATE INDEX IF NOT EXISTS idx_login_history_suspicious ON "LoginHistory"("IsSuspicious");
    CREATE INDEX IF NOT EXISTS idx_login_history_user_status ON "LoginHistory"("UserId", "LoginStatus", "CreatedAt");
    CREATE INDEX IF NOT EXISTS idx_login_history_session ON "LoginHistory"("SessionId");

    -- Create cleanup function for old login history
    CREATE OR REPLACE FUNCTION cleanup_old_login_history()
    RETURNS void AS $$
    BEGIN
      -- Keep only last 6 months of login history
      DELETE FROM "LoginHistory"
      WHERE "CreatedAt" < NOW() - INTERVAL '6 months';
    END;
    $$ LANGUAGE plpgsql;

    -- Create function to detect suspicious login patterns
    CREATE OR REPLACE FUNCTION detect_suspicious_login(
      p_user_id INT,
      p_ip_address VARCHAR(64),
      p_device_id VARCHAR(255)
    )
    RETURNS BOOLEAN AS $$
    DECLARE
      recent_failed_count INT;
      different_locations_count INT;
      rapid_login_count INT;
    BEGIN
      -- Check for multiple failed attempts in last hour
      SELECT COUNT(*) INTO recent_failed_count
      FROM "LoginHistory"
      WHERE "UserId" = p_user_id
        AND "LoginStatus" = 'failed'
        AND "CreatedAt" > NOW() - INTERVAL '1 hour';

      -- Check for logins from multiple IPs in last 15 minutes
      SELECT COUNT(DISTINCT "IpAddress") INTO different_locations_count
      FROM "LoginHistory"
      WHERE "UserId" = p_user_id
        AND "LoginStatus" = 'success'
        AND "CreatedAt" > NOW() - INTERVAL '15 minutes';

      -- Check for rapid succession logins (possible brute force)
      SELECT COUNT(*) INTO rapid_login_count
      FROM "LoginHistory"
      WHERE "UserId" = p_user_id
        AND "CreatedAt" > NOW() - INTERVAL '5 minutes';

      RETURN (recent_failed_count >= 3 OR different_locations_count >= 3 OR rapid_login_count >= 10);
    END;
    $$ LANGUAGE plpgsql;

    -- Add comments
    COMMENT ON TABLE "LoginHistory" IS 'Comprehensive login attempt tracking for security and compliance';
    COMMENT ON COLUMN "LoginHistory"."LoginStatus" IS 'Status: success, failed, locked, suspended, mfa_required, mfa_failed';
    COMMENT ON COLUMN "LoginHistory"."Location" IS 'Geolocation data: country, city, lat/lon from IP lookup';
    COMMENT ON COLUMN "LoginHistory"."LoginDuration" IS 'Session duration in seconds (set on logout)';
    COMMENT ON COLUMN "LoginHistory"."IsSuspicious" IS 'Flag for suspicious login patterns detected';
    COMMENT ON COLUMN "LoginHistory"."MfaUsed" IS 'Whether multi-factor authentication was used';
  `;

  await appPool.query(query);
  console.log('✅ LoginHistory table ready');
};

module.exports = { LoginHistory };
