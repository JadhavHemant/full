const { appPool } = require('../config/db');

/**
 * Seed Permissions
 * 
 * Creates granular permissions for all modules.
 * Each permission defines a specific action that can be performed on a module.
 * Actions: create, read, update, delete, approve, export, import, view, print, manage, assign
 */
const seedPermissions = async () => {
  console.log('🌱 Seeding Permissions...');

  try {
    // Get all modules from database
    const modulesResult = await appPool.query(
      `SELECT "ModuleId", "ModuleKey", "ModuleName" 
       FROM "Modules" 
       WHERE "IsActive" = TRUE AND "IsDeleted" = FALSE
       ORDER BY "DisplayOrder"`
    );

    const modules = modulesResult.rows;
    console.log(`📦 Found ${modules.length} modules to create permissions for`);

    // Define standard permission actions
    const standardActions = [
      { action: 'create', name: 'Create', description: 'Create new records' },
      { action: 'read', name: 'Read', description: 'View and read records' },
      { action: 'update', name: 'Update', description: 'Edit and update records' },
      { action: 'delete', name: 'Delete', description: 'Delete records' },
      { action: 'export', name: 'Export', description: 'Export data' },
      { action: 'import', name: 'Import', description: 'Import data' },
    ];

    // Additional actions for specific module types
    const additionalActions = [
      { action: 'approve', name: 'Approve', description: 'Approve requests or workflows' },
      { action: 'view', name: 'View', description: 'View dashboard or reports' },
      { action: 'print', name: 'Print', description: 'Print documents' },
      { action: 'manage', name: 'Manage', description: 'Full management access' },
      { action: 'assign', name: 'Assign', description: 'Assign to users or teams' },
    ];

    // Modules that need approval permissions
    const approvalModules = [
      'purchaseOrders', 'purchaseRequisitions', 'salesOrders', 'expenses',
      'stockAdjustments', 'productionOrders', 'approvals'
    ];

    // Modules that need assign permissions
    const assignModules = ['leads', 'opportunities', 'cases', 'activities', 'assignments'];

    // Modules that only need view/manage (dashboards, reports)
    const viewOnlyModules = ['dashboard', 'reports', 'auditLogs'];

    let permissionCount = 0;

    for (const module of modules) {
      let actionsForModule = [];

      // Determine which actions apply to this module
      if (viewOnlyModules.includes(module.ModuleKey)) {
        // View-only modules
        actionsForModule = [
          { action: 'view', name: 'View', description: `View ${module.ModuleName}` },
          { action: 'export', name: 'Export', description: `Export ${module.ModuleName}` },
        ];
      } else if (module.ModuleKey === 'settings') {
        // Settings module
        actionsForModule = [
          { action: 'view', name: 'View', description: 'View settings' },
          { action: 'manage', name: 'Manage', description: 'Manage system settings' },
        ];
      } else {
        // Standard CRUD modules
        actionsForModule = [...standardActions];

        // Add approval permission if applicable
        if (approvalModules.includes(module.ModuleKey)) {
          actionsForModule.push(additionalActions.find(a => a.action === 'approve'));
        }

        // Add assign permission if applicable
        if (assignModules.includes(module.ModuleKey)) {
          actionsForModule.push(additionalActions.find(a => a.action === 'assign'));
        }

        // Add print for documents
        if (['invoices', 'quotes', 'purchaseOrders', 'salesOrders', 'deliveryChallans'].includes(module.ModuleKey)) {
          actionsForModule.push(additionalActions.find(a => a.action === 'print'));
        }
      }

      // Insert permissions for this module
      for (const action of actionsForModule) {
        const permissionKey = `${module.ModuleKey}.${action.action}`;
        const permissionName = `${action.name} ${module.ModuleName}`;
        const description = action.description.includes(module.ModuleName) 
          ? action.description 
          : `${action.description} in ${module.ModuleName}`;

        await appPool.query(
          `INSERT INTO "Permissions" ("ModuleId", "PermissionName", "PermissionKey", "Action", "Description", "IsActive")
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT ("PermissionKey") DO UPDATE SET
             "PermissionName" = EXCLUDED."PermissionName",
             "Description" = EXCLUDED."Description",
             "UpdatedAt" = CURRENT_TIMESTAMP`,
          [module.ModuleId, permissionName, permissionKey, action.action, description]
        );

        permissionCount++;
      }
    }

    console.log(`✅ Seeded ${permissionCount} permissions across ${modules.length} modules`);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('✅ Permission seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Permission seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPermissions };
