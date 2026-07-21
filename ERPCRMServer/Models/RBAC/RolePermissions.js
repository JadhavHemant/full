const { appPool } = require('../../config/db');

/**
 * RolePermissions Model
 * 
 * Junction table mapping roles to permissions.
 * Defines which permissions each role has access to.
 * Supports permission inheritance through role hierarchy.
 */
const RolePermissions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RolePermissions" (
      "RolePermissionId" SERIAL PRIMARY KEY,
      "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
      "PermissionId" INT NOT NULL REFERENCES "Permissions"("PermissionId") ON DELETE CASCADE,
      "IsGranted" BOOLEAN DEFAULT TRUE,
      "GrantedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "GrantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_role_permission UNIQUE ("RoleId", "PermissionId")
    );

    -- Create indexes for performance (skip if columns don't exist in pre-existing table)
    DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON "RolePermissions"("RoleId"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON "RolePermissions"("PermissionId"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_granted ON "RolePermissions"("IsGranted"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON "RolePermissions"("IsActive", "IsDeleted"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_role_granted ON "RolePermissions"("RoleId", "IsGranted", "IsActive"); EXCEPTION WHEN OTHERS THEN NULL; END $$;

    -- Create trigger to update UpdatedAt timestamp
    CREATE OR REPLACE FUNCTION update_role_permissions_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_role_permissions_timestamp ON "RolePermissions";
    CREATE TRIGGER trigger_update_role_permissions_timestamp
      BEFORE UPDATE ON "RolePermissions"
      FOR EACH ROW
      EXECUTE FUNCTION update_role_permissions_timestamp();

    -- Add comments
    COMMENT ON TABLE "RolePermissions" IS 'Junction table mapping roles to permissions for RBAC';
    DO $$ BEGIN COMMENT ON COLUMN "RolePermissions"."IsGranted" IS 'Whether permission is granted (true) or explicitly denied (false)'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DO $$ BEGIN COMMENT ON COLUMN "RolePermissions"."GrantedBy" IS 'User who granted/revoked this permission for audit trail'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
  `;

  await appPool.query(query);
  console.log('✅ RolePermissions table ready');
};

module.exports = { RolePermissions };
