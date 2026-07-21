const { appPool } = require('../../config/db');

/**
 * Menus Model
 *
 * Navigation menu items with hierarchical parent/child structure.
 * Visibility controlled per-role via MenuPermissions.
 * Safe idempotent pattern — never drops existing data.
 */
const Menus = async () => {
  // Step 1: Create table if it does not yet exist
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "Menus" (
      "MenuId" SERIAL PRIMARY KEY,
      "ModuleId" INT REFERENCES "Modules"("ModuleId") ON DELETE CASCADE,
      "ParentMenuId" INT,
      "MenuName" VARCHAR(100) NOT NULL,
      "MenuKey" VARCHAR(100) UNIQUE NOT NULL,
      "MenuPath" VARCHAR(255),
      "MenuIcon" VARCHAR(50),
      "DisplayOrder" INT DEFAULT 0,
      "IsVisible" BOOLEAN DEFAULT TRUE,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Description" TEXT,
      "MenuType" VARCHAR(20) DEFAULT 'menu',
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add missing columns
  const alterations = [
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "ModuleId" INT REFERENCES "Modules"("ModuleId") ON DELETE CASCADE`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "ParentMenuId" INT`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "MenuPath" VARCHAR(255)`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "MenuIcon" VARCHAR(50)`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "DisplayOrder" INT DEFAULT 0`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "IsVisible" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "Description" TEXT`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "MenuType" VARCHAR(20) DEFAULT 'menu'`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "Menus" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  ];

  for (const sql of alterations) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 3: Self-referencing FK on ParentMenuId
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'menus_parent_fk'
      ) THEN
        ALTER TABLE "Menus"
          ADD CONSTRAINT menus_parent_fk
          FOREIGN KEY ("ParentMenuId") REFERENCES "Menus"("MenuId") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Step 4: MenuType check constraint
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'menus_type_check'
      ) THEN
        ALTER TABLE "Menus"
          ADD CONSTRAINT menus_type_check
          CHECK ("MenuType" IN ('menu', 'submenu', 'action', 'separator', 'heading'));
      END IF;
    END $$;
  `);

  // Step 5: Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_menus_module ON "Menus"("ModuleId")`,
    `CREATE INDEX IF NOT EXISTS idx_menus_parent ON "Menus"("ParentMenuId")`,
    `CREATE INDEX IF NOT EXISTS idx_menus_key ON "Menus"("MenuKey")`,
    `CREATE INDEX IF NOT EXISTS idx_menus_display_order ON "Menus"("DisplayOrder")`,
    `CREATE INDEX IF NOT EXISTS idx_menus_active ON "Menus"("IsActive", "IsDeleted", "IsVisible")`,
    `CREATE INDEX IF NOT EXISTS idx_menus_path ON "Menus"("MenuPath")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 6: UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_menus_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_menus_timestamp ON "Menus";
    CREATE TRIGGER trigger_update_menus_timestamp
      BEFORE UPDATE ON "Menus"
      FOR EACH ROW
      EXECUTE FUNCTION update_menus_timestamp();
  `);

  console.log('✅ Menus table ready');
};

module.exports = { Menus };
