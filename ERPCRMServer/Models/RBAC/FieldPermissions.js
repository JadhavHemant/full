const { appPool } = require('../../config/db');

/**
 * FieldPermissions Model
 *
 * Defines field-level access control within a module.
 * Allows granular control over which roles can view, edit, or be required
 * to fill specific fields on a given entity/table.
 *
 * Permission levels:
 *   - 'hidden'   : Field is not visible to the role
 *   - 'read'     : Field is visible but read-only
 *   - 'readwrite': Field is visible and editable
 *   - 'required' : Field is visible, editable, and must be filled
 */
const FieldPermissions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "FieldPermissions" (
      "Id" SERIAL PRIMARY KEY,
      "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
      "ModuleKey" VARCHAR(100) NOT NULL,
      "EntityName" VARCHAR(100) NOT NULL,
      "FieldName" VARCHAR(100) NOT NULL,
      "PermissionLevel" VARCHAR(20) NOT NULL DEFAULT 'read',
      "IsRequired" BOOLEAN DEFAULT FALSE,
      "Description" TEXT,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_field_permission UNIQUE ("RoleId", "ModuleKey", "EntityName", "FieldName")
    );
  `;

  await appPool.query(query);

  // Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_field_perms_role ON "FieldPermissions"("RoleId")`,
    `CREATE INDEX IF NOT EXISTS idx_field_perms_module ON "FieldPermissions"("ModuleKey")`,
    `CREATE INDEX IF NOT EXISTS idx_field_perms_entity ON "FieldPermissions"("EntityName")`,
    `CREATE INDEX IF NOT EXISTS idx_field_perms_field ON "FieldPermissions"("FieldName")`,
    `CREATE INDEX IF NOT EXISTS idx_field_perms_active ON "FieldPermissions"("IsActive")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_field_permissions_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_field_permissions_timestamp ON "FieldPermissions";
    CREATE TRIGGER trigger_update_field_permissions_timestamp
      BEFORE UPDATE ON "FieldPermissions"
      FOR EACH ROW
      EXECUTE FUNCTION update_field_permissions_timestamp();
  `);

  console.log('✅ FieldPermissions table ready');
};

module.exports = { FieldPermissions };
