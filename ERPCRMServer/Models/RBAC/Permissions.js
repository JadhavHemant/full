const { appPool } = require('../../config/db');

/**
 * Permissions Model
 *
 * Granular permissions scoped to modules (e.g. users.create, products.read).
 * Safe idempotent pattern — never drops existing data.
 */
const Permissions = async () => {
  // Step 1: Create table if it does not yet exist
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "Permissions" (
      "PermissionId" SERIAL PRIMARY KEY,
      "ModuleId" INT NOT NULL REFERENCES "Modules"("ModuleId") ON DELETE CASCADE,
      "PermissionName" VARCHAR(100) NOT NULL,
      "PermissionKey" VARCHAR(100) UNIQUE NOT NULL,
      "Action" VARCHAR(50) NOT NULL,
      "Description" TEXT,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add any columns missing from older versions
  const alterations = [
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "Description" TEXT`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  ];

  for (const sql of alterations) {
    try {
      await appPool.query(sql);
    } catch (_) {}
  }

  // Step 3: Unique constraint on (ModuleId, Action) — one permission per action per module
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_module_action'
      ) THEN
        ALTER TABLE "Permissions"
          ADD CONSTRAINT unique_module_action UNIQUE ("ModuleId", "Action");
      END IF;
    END $$;
  `);

  // Step 4: Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_permissions_module ON "Permissions"("ModuleId")`,
    `CREATE INDEX IF NOT EXISTS idx_permissions_key ON "Permissions"("PermissionKey")`,
    `CREATE INDEX IF NOT EXISTS idx_permissions_action ON "Permissions"("Action")`,
    `CREATE INDEX IF NOT EXISTS idx_permissions_active ON "Permissions"("IsActive", "IsDeleted")`,
    `CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON "Permissions"("ModuleId", "Action")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 5: UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_permissions_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_permissions_timestamp ON "Permissions";
    CREATE TRIGGER trigger_update_permissions_timestamp
      BEFORE UPDATE ON "Permissions"
      FOR EACH ROW
      EXECUTE FUNCTION update_permissions_timestamp();
  `);

  console.log('✅ Permissions table ready');
};

module.exports = { Permissions };
