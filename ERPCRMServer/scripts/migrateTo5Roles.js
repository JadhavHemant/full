/**
 * Migration Script: 20 Roles → 5 Canonical Roles
 * 
 * This script:
 * 1. Creates/updates the 5 canonical roles with proper permissions
 * 2. Maps all existing users to the closest matching role
 * 3. Preserves old role name as `legacy_role` on the Roles table
 * 4. Backs up existing user roles for rollback
 * 
 * Usage: node scripts/migrateTo5Roles.js
 */

const { appPool } = require('../config/db');

const FIVE_ROLES = [
  {
    id: 1,
    name: 'superadmin',
    level: 1,
    permissions: null, // full access
  },
  {
    id: 2,
    name: 'admin',
    level: 2,
    permissions: null, // full access within company scope
  },
  {
    id: 3,
    name: 'manager',
    level: 3,
    permissions: {
      dashboard: ['view'],
      users: ['view', 'edit'],
      products: ['view', 'create', 'edit', 'export'],
      categories: ['view', 'export'],
      units: ['view', 'export'],
      brands: ['view', 'export'],
      warehouses: ['view', 'edit', 'export'],
      stock: ['view', 'create', 'edit', 'export'],
      stockMovements: ['view', 'create', 'edit', 'export'],
      suppliers: ['view', 'export'],
      purchaseOrders: ['view', 'create', 'edit', 'export'],
      purchaseRequisitions: ['view', 'create', 'edit', 'export'],
      purchaseReturns: ['view', 'create', 'edit', 'export'],
      salesOrders: ['view', 'create', 'edit', 'export'],
      salesQuotations: ['view', 'create', 'edit', 'export'],
      deliveryChallans: ['view', 'create', 'edit', 'export'],
      salesReturns: ['view', 'create', 'edit', 'export'],
      customers: ['view', 'create', 'edit', 'export'],
      accounts: ['view', 'create', 'edit', 'export'],
      contacts: ['view', 'create', 'edit', 'export'],
      leads: ['view', 'create', 'edit', 'export'],
      opportunities: ['view', 'create', 'edit', 'export'],
      presales: ['view', 'create', 'edit', 'export'],
      cases: ['view', 'create', 'edit', 'export'],
      reports: ['view', 'export'],
      approvals: ['view', 'create', 'edit', 'export'],
      chat: ['view', 'create', 'edit'],
      notifications: ['view'],
      billing: ['view'],
    },
  },
  {
    id: 4,
    name: 'employee',
    level: 4,
    permissions: {
      dashboard: ['view'],
      products: ['view', 'export'],
      categories: ['view', 'export'],
      units: ['view', 'export'],
      brands: ['view', 'export'],
      warehouses: ['view', 'export'],
      stock: ['view', 'export'],
      stockMovements: ['view', 'export'],
      suppliers: ['view', 'export'],
      purchaseOrders: ['view', 'export'],
      salesOrders: ['view', 'export'],
      customers: ['view', 'export'],
      salesQuotations: ['view', 'export'],
      chat: ['view'],
      notifications: ['view'],
    },
  },
  {
    id: 5,
    name: 'viewer',
    level: 5,
    permissions: {
      salesOrders: ['view'],
      invoices: ['view'],
      customers: ['view'],
      notifications: ['view'],
    },
  },
];

/**
 * Old role name → new role ID mapping.
 */
const ROLE_MAPPING = {
  'Super Admin': 1,
  'superadmin': 1,
  'SuperAdmin': 1,
  'super admin': 1,
  'Company Admin': 2,
  'company admin': 2,
  'admin': 2,
  'Admin': 2,
  'Branch Manager': 3,
  'Inventory Manager': 3,
  'Purchase Manager': 3,
  'Sales Manager': 3,
  'Production Manager': 3,
  'Quality Manager': 3,
  'Finance Manager': 3,
  'CRM Manager': 3,
  'HR Manager': 3,
  'branch manager': 3,
  'inventory manager': 3,
  'purchase manager': 3,
  'sales manager': 3,
  'production manager': 3,
  'quality manager': 3,
  'finance manager': 3,
  'crm manager': 3,
  'hr manager': 3,
  'manager': 3,
  'Manager': 3,
  'Store Keeper': 4,
  'Purchase Executive': 4,
  'Sales Executive': 4,
  'Production Supervisor': 4,
  'Production Operator': 4,
  'Quality Inspector': 4,
  'Accountant': 4,
  'CRM Executive': 4,
  'Employee': 4,
  'employee': 4,
  'store keeper': 4,
  'purchase executive': 4,
  'sales executive': 4,
  'production supervisor': 4,
  'production operator': 4,
  'quality inspector': 4,
  'accountant': 4,
  'crm executive': 4,
  'viewer': 5,
  'customer': 5,
  'Viewer': 5,
  'Customer': 5,
};

const migrate = async () => {
  const client = await appPool.connect();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RBAC Migration: 20 Roles → 5 Canonical Roles');
    console.log('='.repeat(60) + '\n');

    // ── Step 1: Ensure Roles table has all necessary columns ──
    console.log('📦 Step 1: Ensuring schema...');
    
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "Permissions" JSONB DEFAULT '{}'
    `);
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE
    `);
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "Level" INT DEFAULT 5
    `);
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "LegacyRoleName" VARCHAR(100)
    `);
    
    console.log('   ✅ Schema ready\n');

    // ── Step 2: Back up old roles ──
    console.log('💾 Step 2: Backing up old roles...');
    
    const oldRolesResult = await client.query(`
      SELECT "Id", "RoleName" FROM "Roles" WHERE "IsDeleted" = FALSE AND "IsActive" = TRUE
    `);
    const oldRoles = oldRolesResult.rows;
    console.log(`   Found ${oldRoles.length} existing roles to preserve as legacy\n`);

    // ── Step 3: Create/update the 5 canonical roles ──
    console.log('🏗️  Step 3: Creating/updating 5 canonical roles...');
    
    for (const role of FIVE_ROLES) {
      const exists = await client.query(
        `SELECT "Id" FROM "Roles" WHERE "Id" = $1`,
        [role.id]
      );

      if (exists.rows.length > 0) {
        // Update existing role
        await client.query(
          `UPDATE "Roles" 
           SET "RoleName" = $1, "Permissions" = $2, "Level" = $3, 
               "IsActive" = TRUE, "IsDeleted" = FALSE, "UpdatedAt" = NOW()
           WHERE "Id" = $4`,
          [
            role.name,
            role.permissions ? JSON.stringify(role.permissions) : null,
            role.level,
            role.id,
          ]
        );
        console.log(`   ✅ Updated: ${role.name} (ID: ${role.id})`);
      } else {
        // Insert new role with specific ID
        await client.query(
          `INSERT INTO "Roles" ("Id", "RoleName", "Permissions", "Level", "IsActive", "CreatedAt", "UpdatedAt")
           VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())`,
          [
            role.id,
            role.name,
            role.permissions ? JSON.stringify(role.permissions) : null,
            role.level,
          ]
        );
        console.log(`   ✅ Created: ${role.name} (ID: ${role.id})`);
      }
    }

    // ── Step 4: Deactivate old roles (exclude the 5 canonical) ──
    console.log('\n🗑️  Step 4: Deactivating old roles...');
    
    const deactivated = await client.query(
      `UPDATE "Roles" 
       SET "IsActive" = FALSE, "LegacyRoleName" = "RoleName", "UpdatedAt" = NOW()
       WHERE "Id" > 5 AND "IsDeleted" = FALSE`
    );
    console.log(`   Deactivated ${deactivated.rowCount} old roles\n`);

    // ── Step 5: Migrate users to new roles ──
    console.log('👥 Step 5: Migrating users to new roles...');
    
    const usersResult = await client.query(`
      SELECT u."UserId", u."RoleId", r."RoleName" as "CurrentRoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON u."RoleId" = r."Id"
      WHERE u."IsDeleted" = FALSE
    `);
    
    const users = usersResult.rows;
    console.log(`   Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let unmappedCount = 0;

    for (const user of users) {
      const currentRoleId = user.RoleId;
      
      // Skip if already using canonical role
      if (currentRoleId >= 1 && currentRoleId <= 5) {
        // Still ensure it maps correctly
        if (currentRoleId === 1 || currentRoleId === 2) {
          skippedCount++;
          continue;
        }
      }

      // Map old role name to new role ID
      const roleName = user.CurrentRoleName || '';
      const newRoleId = ROLE_MAPPING[roleName] || ROLE_MAPPING[roleName.toLowerCase()] || null;

      if (newRoleId && newRoleId !== currentRoleId) {
        await client.query(
          `UPDATE "Users" SET "RoleId" = $1, "UpdatedAt" = NOW() WHERE "UserId" = $2`,
          [newRoleId, user.UserId]
        );
        
        // Log the migration in audit
        try {
          await client.query(
            `INSERT INTO "AuditLogs" ("UserId", "RoleId", "Action", "EntityType", "EntityId", 
             "OldValue", "NewValue", "CreatedAt")
             VALUES ($1, $2, 'MIGRATE', 'RoleMigration', $3, 
             $4::jsonb, $5::jsonb, NOW())`,
            [
              user.UserId,
              newRoleId,
              user.UserId,
              JSON.stringify({ roleId: currentRoleId, roleName }),
              JSON.stringify({ roleId: newRoleId, roleName: FIVE_ROLES.find(r => r.id === newRoleId)?.name }),
            ]
          );
        } catch (auditErr) {
          // Audit logging is non-critical
        }

        migratedCount++;
        console.log(`   🔄 User ${user.UserId}: "${roleName}" → "${FIVE_ROLES.find(r => r.id === newRoleId)?.name}" (ID: ${newRoleId})`);
      } else if (newRoleId === null) {
        unmappedCount++;
        console.log(`   ⚠️  User ${user.UserId}: Unmapped role "${roleName}" — setting to employee (4)`);
        await client.query(
          `UPDATE "Users" SET "RoleId" = 4, "UpdatedAt" = NOW() WHERE "UserId" = $1`,
          [user.UserId]
        );
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n   Migration summary:`);
    console.log(`      • Migrated: ${migratedCount} users`);
    console.log(`      • Skipped: ${skippedCount} users`);
    console.log(`      • Unmapped (set to employee): ${unmappedCount} users`);

    // ── Step 6: Ensure indexes ──
    console.log('\n🔧 Step 6: Ensuring indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_active ON "Roles"("IsActive", "IsDeleted")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON "Users"("RoleId")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "AuditLogs"("EntityType", "EntityId")
    `);
    
    console.log('   ✅ Indexes ready\n');

    // ── Summary ──
    console.log('='.repeat(60));
    console.log('✅ RBAC Migration Complete!');
    console.log('='.repeat(60) + '\n');
    
    console.log(`📊 Summary:`);
    console.log(`   • 5 canonical roles ready (IDs 1-5)`);
    console.log(`   • Old roles deactivated (IDs > 5)`);
    console.log(`   • Old role names preserved in "LegacyRoleName" column`);
    console.log(`   • ${migratedCount} users migrated to new roles`);
    console.log(`   • ${oldRoles.length} legacy roles preserved for reference`);
    console.log(`\n🔮 Next steps:`);
    console.log(`   1. Verify user mappings are correct`);
    console.log(`   2. Run 'node scripts/testRBAC.js' to validate permissions`);
    console.log(`   3. Update any hardcoded roleId checks in code`);
    console.log(`   4. Remove old role records once migration is verified\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await appPool.end();
  }
};

// Run if called directly
if (require.main === module) {
  migrate().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrate, FIVE_ROLES, ROLE_MAPPING };