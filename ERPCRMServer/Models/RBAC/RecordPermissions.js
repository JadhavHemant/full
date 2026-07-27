const { appPool } = require('../../config/db');

/**
 * RecordPermissions Model
 *
 * Defines record-level (row-level) access control.
 * Allows granular control over which roles can view, edit, or delete
 * specific records (rows) within an entity/table.
 *
 * Scope types:
 *   - 'company'  : All records belonging to a specific company
 *   - 'department': All records belonging to a specific department
 *   - 'user'     : Records owned by a specific user
 *   - 'record'   : A specific record (by RecordId)
 *
 * Permission levels:
 *   - 'view'    : Can view the record(s)
 *   - 'edit'    : Can edit the record(s)
 *   - 'delete'  : Can delete the record(s)
 *   - 'own'     : Can only access records they own
 */
const RecordPermissions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RecordPermissions" (
      "Id" SERIAL PRIMARY KEY,
      "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
      "EntityName" VARCHAR(100) NOT NULL,
      "ScopeType" VARCHAR(20) NOT NULL,
      "ScopeId" INT,
      "RecordId" INT,
      "PermissionLevel" VARCHAR(20) NOT NULL DEFAULT 'view',
      "Description" TEXT,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await appPool.query(query);

  // Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_record_perms_role ON "RecordPermissions"("RoleId")`,
    `CREATE INDEX IF NOT EXISTS idx_record_perms_entity ON "RecordPermissions"("EntityName")`,
    `CREATE INDEX IF NOT EXISTS idx_record_perms_scope ON "RecordPermissions"("ScopeType", "ScopeId")`,
    `CREATE INDEX IF NOT EXISTS idx_record_perms_record ON "RecordPermissions"("RecordId")`,
    `CREATE INDEX IF NOT EXISTS idx_record_perms_active ON "RecordPermissions"("IsActive")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_record_permissions_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_record_permissions_timestamp ON "RecordPermissions";
    CREATE TRIGGER trigger_update_record_permissions_timestamp
      BEFORE UPDATE ON "RecordPermissions"
      FOR EACH ROW
      EXECUTE FUNCTION update_record_permissions_timestamp();
  `);

  console.log('✅ RecordPermissions table ready');
};

module.exports = { RecordPermissions };
