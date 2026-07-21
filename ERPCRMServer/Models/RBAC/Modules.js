const { appPool } = require('../../config/db');

/**
 * Modules Model
 *
 * Represents system modules/features that can have permissions assigned.
 * Safe idempotent pattern: CREATE TABLE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS.
 * Never drops an existing table.
 */
const Modules = async () => {
  // Step 1: Create table if it does not yet exist
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "Modules" (
      "ModuleId" SERIAL PRIMARY KEY,
      "ModuleName" VARCHAR(100) UNIQUE NOT NULL,
      "ModuleKey" VARCHAR(50) UNIQUE NOT NULL,
      "Description" TEXT,
      "ParentModuleId" INT,
      "Icon" VARCHAR(50),
      "DisplayOrder" INT DEFAULT 0,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedBy" INT,
      "UpdatedBy" INT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add any columns that may be missing from older table versions
  const alterations = [
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ParentModuleId" INT`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Icon" VARCHAR(50)`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "DisplayOrder" INT DEFAULT 0`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedBy" INT`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Description" TEXT`,
  ];

  for (const sql of alterations) {
    try {
      await appPool.query(sql);
    } catch (_) { /* column or constraint already exists */ }
  }

  // Step 3: Foreign-key on ParentModuleId (added after table exists to allow self-reference)
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'modules_parent_fk'
      ) THEN
        ALTER TABLE "Modules"
          ADD CONSTRAINT modules_parent_fk
          FOREIGN KEY ("ParentModuleId") REFERENCES "Modules"("ModuleId") ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Step 4: Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_modules_parent ON "Modules"("ParentModuleId")`,
    `CREATE INDEX IF NOT EXISTS idx_modules_active ON "Modules"("IsActive", "IsDeleted")`,
    `CREATE INDEX IF NOT EXISTS idx_modules_key ON "Modules"("ModuleKey")`,
    `CREATE INDEX IF NOT EXISTS idx_modules_display_order ON "Modules"("DisplayOrder")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 5: UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_modules_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_modules_timestamp ON "Modules";
    CREATE TRIGGER trigger_update_modules_timestamp
      BEFORE UPDATE ON "Modules"
      FOR EACH ROW
      EXECUTE FUNCTION update_modules_timestamp();
  `);

  console.log('✅ Modules table ready');
};

module.exports = { Modules };
