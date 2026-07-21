const { appPool } = require('../../config/db');

/**
 * UserRoles Model
 * 
 * Junction table mapping users to roles (supports multiple roles per user).
 * Allows flexible role assignment for users across different contexts.
 */
const UserRoles = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "UserRoles" (
      "UserRoleId" SERIAL PRIMARY KEY,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "AssignedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "AssignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "ExpiresAt" TIMESTAMP,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_role_company UNIQUE ("UserId", "RoleId", "CompanyId")
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON "UserRoles"("UserId");
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON "UserRoles"("RoleId");
    CREATE INDEX IF NOT EXISTS idx_user_roles_company ON "UserRoles"("CompanyId");
    CREATE INDEX IF NOT EXISTS idx_user_roles_active ON "UserRoles"("IsActive", "IsDeleted");
    CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON "UserRoles"("AssignedBy");
    CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON "UserRoles"("ExpiresAt");
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON "UserRoles"("UserId", "IsActive", "IsDeleted");

    -- Create trigger to update UpdatedAt timestamp
    CREATE OR REPLACE FUNCTION update_user_roles_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_user_roles_timestamp ON "UserRoles";
    CREATE TRIGGER trigger_update_user_roles_timestamp
      BEFORE UPDATE ON "UserRoles"
      FOR EACH ROW
      EXECUTE FUNCTION update_user_roles_timestamp();

    -- Add comments
    COMMENT ON TABLE "UserRoles" IS 'Junction table mapping users to roles with support for multiple roles per user';
    COMMENT ON COLUMN "UserRoles"."CompanyId" IS 'Optional company scope for role assignment in multi-tenant scenarios';
    COMMENT ON COLUMN "UserRoles"."ExpiresAt" IS 'Optional expiration timestamp for temporary role assignments';
    COMMENT ON COLUMN "UserRoles"."AssignedBy" IS 'User who assigned this role for audit trail';
  `;

  await appPool.query(query);
  console.log('✅ UserRoles table ready');
};

module.exports = { UserRoles };
