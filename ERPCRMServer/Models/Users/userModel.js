const { appPool } = require("../../config/db");

const createUsersTable = async () => {
  // Step 1: Create table if it does not exist (base schema only)
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "Users" (
      "UserId" SERIAL PRIMARY KEY,
      "Name" VARCHAR(255) NOT NULL,
      "Email" VARCHAR(255) NOT NULL UNIQUE,
      "Password" VARCHAR(255) NOT NULL,
      "MobileNumber" VARCHAR(15),
      "RoleId" INT REFERENCES "Roles"("Id"),
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "UserTypeId" INT REFERENCES "UserTypes"("Id") ON DELETE CASCADE,
      "ReportingManagerId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "DepartmentId" INT,
      "DesignationId" INT,
      "HierarchyLevel" INT DEFAULT 0,
      "HierarchyPath" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId"),
      "Address" TEXT,
      "City" VARCHAR(100),
      "State" VARCHAR(100),
      "Country" VARCHAR(100),
      "PostalCode" VARCHAR(20),
      "ProfileImage" TEXT,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "EmailVerified" BOOLEAN DEFAULT FALSE,
      "LastLoginAt" TIMESTAMP,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add missing authentication & security columns idempotently.
  // Every ALTER is wrapped in a DO block so re-runs are safe.
  const alterations = [
    // Core profile fields that may be missing from older deployments
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ProfileImage" TEXT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Address" TEXT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "City" VARCHAR(100)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "State" VARCHAR(100)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Country" VARCHAR(100)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PostalCode" VARCHAR(20)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "MobileNumber" VARCHAR(15)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "HierarchyPath" TEXT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "HierarchyLevel" INT DEFAULT 0`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DepartmentId" INT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DesignationId" INT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EmailVerified" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastLoginAt" TIMESTAMP`,
    // Soft-delete alias used by some controllers
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsDelete" BOOLEAN DEFAULT FALSE`,
    // Password management
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordChangedAt" TIMESTAMP`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordResetRequired" BOOLEAN DEFAULT FALSE`,
    // Account status  ('active' | 'inactive' | 'suspended' | 'pending_verification')
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(30) DEFAULT 'active'`,
    // Email verification
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EmailVerifiedAt" TIMESTAMP`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "VerificationToken" TEXT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "VerificationTokenExpires" TIMESTAMP`,
    // Password reset
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ResetPasswordToken" TEXT`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ResetPasswordExpires" TIMESTAMP`,
    // Account locking (brute-force protection)
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "FailedLoginAttempts" INT DEFAULT 0`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LockedUntil" TIMESTAMP`,
    // Login tracking
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastLoginIP" VARCHAR(64)`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastLoginDevice" TEXT`,
    // Token versioning (increment to invalidate all refresh tokens)
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "RefreshTokenVersion" INT DEFAULT 0`,
    // Remember-me flag
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "RememberMe" BOOLEAN DEFAULT FALSE`,
    // Audit trail
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
  ];

  for (const sql of alterations) {
    try {
      await appPool.query(sql);
    } catch (err) {
      // Log but never abort — column may already exist with a different constraint
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  Users alter skipped: ${err.message.split('\n')[0]}`);
      }
    }
  }

  // Step 3: Performance indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(LOWER("Email"))`,
    `CREATE INDEX IF NOT EXISTS idx_users_company ON "Users"("CompanyId")`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON "Users"("RoleId")`,
    `CREATE INDEX IF NOT EXISTS idx_users_status ON "Users"("Status")`,
    `CREATE INDEX IF NOT EXISTS idx_users_active ON "Users"("IsActive", "IsDeleted")`,
    `CREATE INDEX IF NOT EXISTS idx_users_reset_token ON "Users"("ResetPasswordToken") WHERE "ResetPasswordToken" IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_users_verify_token ON "Users"("VerificationToken") WHERE "VerificationToken" IS NOT NULL`,
  ];

  for (const sql of indexes) {
    try {
      await appPool.query(sql);
    } catch (_) { /* index may already exist */ }
  }

  // Step 4: UpdatedAt auto-trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_users_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_users_timestamp ON "Users";
    CREATE TRIGGER trigger_update_users_timestamp
      BEFORE UPDATE ON "Users"
      FOR EACH ROW
      EXECUTE FUNCTION update_users_timestamp();
  `);

  console.log("✅ Users table ready");
};

module.exports = { createUsersTable };