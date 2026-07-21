const { appPool } = require('../../config/db');

/**
 * MenuPermissions Model
 *
 * Maps roles to menu items for dynamic, DB-driven navigation.
 * Safe idempotent pattern — never drops existing data.
 */
const MenuPermissions = async () => {
  // Step 1: Create table if it does not yet exist
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "MenuPermissions" (
      "MenuPermissionId" SERIAL PRIMARY KEY,
      "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
      "MenuId" INT NOT NULL REFERENCES "Menus"("MenuId") ON DELETE CASCADE,
      "CanView" BOOLEAN DEFAULT TRUE,
      "CanCreate" BOOLEAN DEFAULT FALSE,
      "CanEdit" BOOLEAN DEFAULT FALSE,
      "CanDelete" BOOLEAN DEFAULT FALSE,
      "GrantedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "GrantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add missing columns
  const alterations = [
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "CanView" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "CanCreate" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "CanEdit" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "CanDelete" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "GrantedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "GrantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "MenuPermissions" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  ];

  for (const sql of alterations) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 3: Unique constraint — one row per role/menu pair
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_role_menu'
      ) THEN
        ALTER TABLE "MenuPermissions"
          ADD CONSTRAINT unique_role_menu UNIQUE ("RoleId", "MenuId");
      END IF;
    END $$;
  `);

  // Step 4: Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_menu_permissions_role ON "MenuPermissions"("RoleId")`,
    `CREATE INDEX IF NOT EXISTS idx_menu_permissions_menu ON "MenuPermissions"("MenuId")`,
    `CREATE INDEX IF NOT EXISTS idx_menu_permissions_active ON "MenuPermissions"("IsActive", "IsDeleted")`,
    `CREATE INDEX IF NOT EXISTS idx_menu_permissions_role_view ON "MenuPermissions"("RoleId", "CanView", "IsActive")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 5: UpdatedAt trigger
  await appPool.query(`
    CREATE OR REPLACE FUNCTION update_menu_permissions_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."UpdatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await appPool.query(`
    DROP TRIGGER IF EXISTS trigger_update_menu_permissions_timestamp ON "MenuPermissions";
    CREATE TRIGGER trigger_update_menu_permissions_timestamp
      BEFORE UPDATE ON "MenuPermissions"
      FOR EACH ROW
      EXECUTE FUNCTION update_menu_permissions_timestamp();
  `);

  console.log('✅ MenuPermissions table ready');
};

module.exports = { MenuPermissions };
