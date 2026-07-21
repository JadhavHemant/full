const { appPool } = require('../config/db');

/**
 * Seed RolePermissions
 * 
 * Maps permissions to existing roles based on their hierarchy and function.
 * Uses the 20 predefined roles from migration 002_rbac_roles_and_permissions.sql
 */
const seedRolePermissions = async () => {
  console.log('🌱 Seeding Role Permissions...');

  try {
    // Get all roles
    const rolesResult = await appPool.query(
      `SELECT "Id" as "RoleId", "RoleName" FROM "Roles" WHERE "IsActive" = TRUE ORDER BY "Id"`
    );
    const roles = rolesResult.rows;

    // Get all permissions
    const permissionsResult = await appPool.query(
      `SELECT p."PermissionId", p."PermissionKey", p."Action", m."ModuleKey"
       FROM "Permissions" p
       JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
       WHERE p."IsActive" = TRUE AND m."IsActive" = TRUE`
    );
    const permissions = permissionsResult.rows;

    console.log(`📋 Found ${roles.length} roles and ${permissions.length} permissions`);

    // Permission assignment strategies by role
    const rolePermissionStrategies = {
      // Super Admin (ID: 1) - Full access to everything
      1: (perms) => perms, // All permissions

      // Company Admin (ID: 2) - Full access except system-wide settings
      2: (perms) => perms.filter(p => 
        !['roles.create', 'roles.delete', 'settings.manage'].includes(p.PermissionKey)
      ),

      // Branch Manager (ID: 3) - Operational access, no deletions
      3: (perms) => perms.filter(p => 
        p.Action !== 'delete' && 
        !['users.delete', 'companies', 'roles', 'settings.manage'].some(m => p.PermissionKey.startsWith(m))
      ),

      // Inventory Manager (ID: 4) - Full inventory and procurement access
      4: (perms) => perms.filter(p => 
        ['inventory', 'products', 'productCategory', 'units', 'brands', 'warehouses', 
         'productStock', 'stockMovements', 'stockTransfers', 'stockAdjustments',
         'procurement', 'suppliers', 'purchaseOrders', 'purchaseRequisitions', 'grn',
         'batches', 'serialNumbers', 'racks', 'bins', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // Store Keeper (ID: 5) - Stock operations only
      5: (perms) => perms.filter(p => 
        ['productStock', 'stockMovements', 'stockTransfers', 'batches', 'serialNumbers', 
         'dashboard'].some(m => p.ModuleKey === m) && 
        ['read', 'create', 'update', 'view'].includes(p.Action)
      ),

      // Purchase Manager (ID: 6) - Procurement with approval rights
      6: (perms) => perms.filter(p => 
        ['procurement', 'suppliers', 'purchaseOrders', 'purchaseRequisitions', 'grn',
         'purchaseReturns', 'products', 'brands', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // Purchase Executive (ID: 7) - Procurement operations, no approvals
      7: (perms) => perms.filter(p => 
        ['procurement', 'suppliers', 'purchaseOrders', 'purchaseRequisitions',
         'products', 'dashboard'].some(m => p.ModuleKey.includes(m)) && 
        !['delete', 'approve'].includes(p.Action)
      ),

      // Sales Manager (ID: 8) - Sales and CRM with approval rights
      8: (perms) => perms.filter(p => 
        ['sales', 'customers', 'salesOrders', 'salesQuotations', 'deliveryChallans',
         'crm', 'accounts', 'contacts', 'leads', 'opportunities', 'quotes', 'invoices',
         'payments', 'cases', 'activities', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // Sales Executive (ID: 9) - Sales operations, no approvals or deletions
      9: (perms) => perms.filter(p => 
        ['sales', 'customers', 'salesOrders', 'salesQuotations', 'crm', 'accounts',
         'contacts', 'leads', 'opportunities', 'quotes', 'invoices', 'cases',
         'dashboard'].some(m => p.ModuleKey.includes(m)) && 
        !['delete', 'approve'].includes(p.Action)
      ),

      // Production Manager (ID: 10) - Production with approval rights
      10: (perms) => perms.filter(p => 
        ['production', 'bom', 'productionOrders', 'qualityControl', 'products',
         'inventory', 'productStock', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // Production Supervisor (ID: 11) - Production operations
      11: (perms) => perms.filter(p => 
        ['production', 'bom', 'productionOrders', 'qualityControl', 'products',
         'productStock', 'dashboard'].some(m => p.ModuleKey.includes(m)) && 
        ['read', 'update', 'view'].includes(p.Action)
      ),

      // Production Operator (ID: 12) - Production execution only
      12: (perms) => perms.filter(p => 
        ['productionOrders', 'qualityControl', 'dashboard'].some(m => 
          p.ModuleKey === m) && ['read', 'update', 'view'].includes(p.Action)
      ),

      // Quality Manager (ID: 13) - Quality control with approval
      13: (perms) => perms.filter(p => 
        ['qualityControl', 'products', 'production', 'productionOrders', 'bom',
         'dashboard', 'reports'].some(m => p.ModuleKey.includes(m)) && 
        p.Action !== 'delete'
      ),

      // Quality Inspector (ID: 14) - Quality inspections
      14: (perms) => perms.filter(p => 
        ['qualityControl', 'productionOrders', 'dashboard'].some(m => 
          p.ModuleKey === m) && ['read', 'create', 'update', 'view'].includes(p.Action)
      ),

      // Finance Manager (ID: 15) - Financial oversight
      15: (perms) => perms.filter(p => 
        ['finance', 'expenses', 'profitLossReports', 'invoices', 'payments',
         'purchaseOrders', 'salesOrders', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // Accountant (ID: 16) - Financial operations
      16: (perms) => perms.filter(p => 
        ['finance', 'expenses', 'profitLossReports', 'invoices', 'payments',
         'dashboard', 'reports'].some(m => p.ModuleKey.includes(m)) && 
        !['delete', 'approve'].includes(p.Action)
      ),

      // CRM Manager (ID: 17) - Full CRM access
      17: (perms) => perms.filter(p => 
        ['crm', 'accounts', 'contacts', 'leads', 'opportunities', 'activities',
         'quotes', 'invoices', 'payments', 'cases', 'leadSources', 'industries',
         'salesStages', 'groups', 'assignments', 'comments', 'dashboard', 'reports'].some(m => 
          p.ModuleKey.includes(m)
        ) && p.Action !== 'delete'
      ),

      // CRM Executive (ID: 18) - CRM operations
      18: (perms) => perms.filter(p => 
        ['crm', 'accounts', 'contacts', 'leads', 'opportunities', 'activities',
         'quotes', 'invoices', 'cases', 'comments', 'dashboard'].some(m => 
          p.ModuleKey.includes(m)
        ) && !['delete', 'approve'].includes(p.Action)
      ),

      // HR Manager (ID: 19) - HR and user management
      19: (perms) => perms.filter(p => 
        ['hr', 'employees', 'departments', 'designations', 'users',
         'dashboard', 'reports'].some(m => p.ModuleKey.includes(m)) && 
        p.Action !== 'delete'
      ),

      // Employee (ID: 20) - Limited read access
      20: (perms) => perms.filter(p => 
        ['dashboard', 'chat'].some(m => p.ModuleKey === m) && 
        ['read', 'view'].includes(p.Action)
      ),
    };

    let assignmentCount = 0;

    // Assign permissions to each role
    for (const role of roles) {
      const strategy = rolePermissionStrategies[role.RoleId];
      if (!strategy) {
        console.warn(`⚠️  No permission strategy defined for role ${role.RoleName} (ID: ${role.RoleId})`);
        continue;
      }

      const rolePermissions = strategy(permissions);
      console.log(`📌 Assigning ${rolePermissions.length} permissions to ${role.RoleName}`);

      for (const permission of rolePermissions) {
        await appPool.query(
          `INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "IsGranted", "IsActive")
           VALUES ($1, $2, TRUE, TRUE)
           ON CONFLICT ("RoleId", "PermissionId") DO UPDATE SET
             "IsGranted" = TRUE,
             "IsActive" = TRUE,
             "UpdatedAt" = CURRENT_TIMESTAMP`,
          [role.RoleId, permission.PermissionId]
        );
        assignmentCount++;
      }
    }

    console.log(`✅ Seeded ${assignmentCount} role-permission assignments for ${roles.length} roles`);
  } catch (error) {
    console.error('❌ Error seeding role permissions:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedRolePermissions()
    .then(() => {
      console.log('✅ Role permission seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role permission seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedRolePermissions };
