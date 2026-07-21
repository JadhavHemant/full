const { appPool } = require('../config/db');

/**
 * Seed Menus
 * 
 * Creates navigation menu structure for the application.
 * Menus are organized hierarchically and linked to modules.
 */
const seedMenus = async () => {
  console.log('🌱 Seeding Menus...');

  try {
    // Get all modules for reference
    const modulesResult = await appPool.query(
      `SELECT "ModuleId", "ModuleKey" FROM "Modules" WHERE "IsActive" = TRUE`
    );
    const moduleMap = {};
    modulesResult.rows.forEach(m => {
      moduleMap[m.ModuleKey] = m.ModuleId;
    });

    const menus = [
      // Top Level Menus
      { name: 'Dashboard', key: 'menu.dashboard', path: '/dashboard', icon: 'dashboard', order: 1, module: 'dashboard', parent: null, type: 'menu' },
      
      // Inventory Menu Tree
      { name: 'Inventory', key: 'menu.inventory', path: '/inventory', icon: 'inventory', order: 10, module: 'inventory', parent: null, type: 'menu' },
      { name: 'Products', key: 'menu.inventory.products', path: '/inventory/products', icon: 'category', order: 11, module: 'products', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Categories', key: 'menu.inventory.categories', path: '/inventory/categories', icon: 'folder', order: 12, module: 'productCategory', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Brands', key: 'menu.inventory.brands', path: '/inventory/brands', icon: 'label', order: 13, module: 'brands', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Units', key: 'menu.inventory.units', path: '/inventory/units', icon: 'straighten', order: 14, module: 'units', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Warehouses', key: 'menu.inventory.warehouses', path: '/inventory/warehouses', icon: 'warehouse', order: 15, module: 'warehouses', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Stock', key: 'menu.inventory.stock', path: '/inventory/stock', icon: 'inventory_2', order: 16, module: 'productStock', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Stock Movements', key: 'menu.inventory.movements', path: '/inventory/movements', icon: 'swap_horiz', order: 17, module: 'stockMovements', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Stock Transfers', key: 'menu.inventory.transfers', path: '/inventory/transfers', icon: 'compare_arrows', order: 18, module: 'stockTransfers', parent: 'menu.inventory', type: 'submenu' },
      { name: 'Stock Adjustments', key: 'menu.inventory.adjustments', path: '/inventory/adjustments', icon: 'tune', order: 19, module: 'stockAdjustments', parent: 'menu.inventory', type: 'submenu' },

      // Procurement Menu Tree
      { name: 'Procurement', key: 'menu.procurement', path: '/procurement', icon: 'shopping_cart', order: 20, module: 'procurement', parent: null, type: 'menu' },
      { name: 'Suppliers', key: 'menu.procurement.suppliers', path: '/procurement/suppliers', icon: 'local_shipping', order: 21, module: 'suppliers', parent: 'menu.procurement', type: 'submenu' },
      { name: 'Purchase Orders', key: 'menu.procurement.orders', path: '/procurement/orders', icon: 'receipt', order: 22, module: 'purchaseOrders', parent: 'menu.procurement', type: 'submenu' },
      { name: 'Purchase Requisitions', key: 'menu.procurement.requisitions', path: '/procurement/requisitions', icon: 'request_quote', order: 23, module: 'purchaseRequisitions', parent: 'menu.procurement', type: 'submenu' },
      { name: 'GRN', key: 'menu.procurement.grn', path: '/procurement/grn', icon: 'receipt_long', order: 24, module: 'grn', parent: 'menu.procurement', type: 'submenu' },
      { name: 'Purchase Returns', key: 'menu.procurement.returns', path: '/procurement/returns', icon: 'assignment_return', order: 25, module: 'purchaseReturns', parent: 'menu.procurement', type: 'submenu' },

      // Sales Menu Tree
      { name: 'Sales', key: 'menu.sales', path: '/sales', icon: 'point_of_sale', order: 30, module: 'sales', parent: null, type: 'menu' },
      { name: 'Customers', key: 'menu.sales.customers', path: '/sales/customers', icon: 'people_outline', order: 31, module: 'customers', parent: 'menu.sales', type: 'submenu' },
      { name: 'Quotations', key: 'menu.sales.quotations', path: '/sales/quotations', icon: 'request_page', order: 32, module: 'salesQuotations', parent: 'menu.sales', type: 'submenu' },
      { name: 'Sales Orders', key: 'menu.sales.orders', path: '/sales/orders', icon: 'shopping_bag', order: 33, module: 'salesOrders', parent: 'menu.sales', type: 'submenu' },
      { name: 'Delivery Challans', key: 'menu.sales.delivery', path: '/sales/delivery', icon: 'local_shipping', order: 34, module: 'deliveryChallans', parent: 'menu.sales', type: 'submenu' },
      { name: 'Sales Returns', key: 'menu.sales.returns', path: '/sales/returns', icon: 'assignment_returned', order: 35, module: 'salesReturns', parent: 'menu.sales', type: 'submenu' },

      // CRM Menu Tree
      { name: 'CRM', key: 'menu.crm', path: '/crm', icon: 'contacts', order: 40, module: 'crm', parent: null, type: 'menu' },
      { name: 'Accounts', key: 'menu.crm.accounts', path: '/crm/accounts', icon: 'account_balance', order: 41, module: 'accounts', parent: 'menu.crm', type: 'submenu' },
      { name: 'Contacts', key: 'menu.crm.contacts', path: '/crm/contacts', icon: 'contact_phone', order: 42, module: 'contacts', parent: 'menu.crm', type: 'submenu' },
      { name: 'Leads', key: 'menu.crm.leads', path: '/crm/leads', icon: 'person_add', order: 43, module: 'leads', parent: 'menu.crm', type: 'submenu' },
      { name: 'Opportunities', key: 'menu.crm.opportunities', path: '/crm/opportunities', icon: 'trending_up', order: 44, module: 'opportunities', parent: 'menu.crm', type: 'submenu' },
      { name: 'Activities', key: 'menu.crm.activities', path: '/crm/activities', icon: 'event', order: 45, module: 'activities', parent: 'menu.crm', type: 'submenu' },
      { name: 'Quotes', key: 'menu.crm.quotes', path: '/crm/quotes', icon: 'description', order: 46, module: 'quotes', parent: 'menu.crm', type: 'submenu' },
      { name: 'Invoices', key: 'menu.crm.invoices', path: '/crm/invoices', icon: 'receipt', order: 47, module: 'invoices', parent: 'menu.crm', type: 'submenu' },
      { name: 'Payments', key: 'menu.crm.payments', path: '/crm/payments', icon: 'payment', order: 48, module: 'payments', parent: 'menu.crm', type: 'submenu' },
      { name: 'Cases', key: 'menu.crm.cases', path: '/crm/cases', icon: 'support', order: 49, module: 'cases', parent: 'menu.crm', type: 'submenu' },

      // Production Menu Tree
      { name: 'Production', key: 'menu.production', path: '/production', icon: 'precision_manufacturing', order: 50, module: 'production', parent: null, type: 'menu' },
      { name: 'BOM', key: 'menu.production.bom', path: '/production/bom', icon: 'view_list', order: 51, module: 'bom', parent: 'menu.production', type: 'submenu' },
      { name: 'Production Orders', key: 'menu.production.orders', path: '/production/orders', icon: 'build', order: 52, module: 'productionOrders', parent: 'menu.production', type: 'submenu' },
      { name: 'Quality Control', key: 'menu.production.quality', path: '/production/quality', icon: 'verified', order: 53, module: 'qualityControl', parent: 'menu.production', type: 'submenu' },

      // Finance Menu Tree
      { name: 'Finance', key: 'menu.finance', path: '/finance', icon: 'account_balance_wallet', order: 60, module: 'finance', parent: null, type: 'menu' },
      { name: 'Expenses', key: 'menu.finance.expenses', path: '/finance/expenses', icon: 'money_off', order: 61, module: 'expenses', parent: 'menu.finance', type: 'submenu' },
      { name: 'P&L Reports', key: 'menu.finance.reports', path: '/finance/profit-loss', icon: 'assessment', order: 62, module: 'profitLossReports', parent: 'menu.finance', type: 'submenu' },

      // HR Menu Tree
      { name: 'HR', key: 'menu.hr', path: '/hr', icon: 'badge', order: 70, module: 'hr', parent: null, type: 'menu' },
      { name: 'Employees', key: 'menu.hr.employees', path: '/hr/employees', icon: 'person', order: 71, module: 'employees', parent: 'menu.hr', type: 'submenu' },
      { name: 'Departments', key: 'menu.hr.departments', path: '/hr/departments', icon: 'corporate_fare', order: 72, module: 'departments', parent: 'menu.hr', type: 'submenu' },
      { name: 'Designations', key: 'menu.hr.designations', path: '/hr/designations', icon: 'work', order: 73, module: 'designations', parent: 'menu.hr', type: 'submenu' },

      // Reports Menu
      { name: 'Reports', key: 'menu.reports', path: '/reports', icon: 'bar_chart', order: 80, module: 'reports', parent: null, type: 'menu' },
      { name: 'Audit Logs', key: 'menu.reports.audit', path: '/reports/audit', icon: 'history', order: 81, module: 'auditLogs', parent: 'menu.reports', type: 'submenu' },

      // Settings Menu
      { name: 'Settings', key: 'menu.settings', path: '/settings', icon: 'settings', order: 90, module: 'settings', parent: null, type: 'menu' },
      { name: 'Users', key: 'menu.settings.users', path: '/settings/users', icon: 'people', order: 91, module: 'users', parent: 'menu.settings', type: 'submenu' },
      { name: 'Roles', key: 'menu.settings.roles', path: '/settings/roles', icon: 'security', order: 92, module: 'roles', parent: 'menu.settings', type: 'submenu' },
      { name: 'Companies', key: 'menu.settings.companies', path: '/settings/companies', icon: 'business', order: 93, module: 'companies', parent: 'menu.settings', type: 'submenu' },
      { name: 'Workflows', key: 'menu.settings.workflows', path: '/settings/workflows', icon: 'account_tree', order: 94, module: 'workflows', parent: 'menu.settings', type: 'submenu' },

      // Utilities
      { name: 'Import/Export', key: 'menu.utils.importexport', path: '/utils/import-export', icon: 'import_export', order: 95, module: 'dataImportExport', parent: null, type: 'menu' },
      { name: 'Chat', key: 'menu.chat', path: '/chat', icon: 'chat', order: 96, module: 'chat', parent: null, type: 'menu' },
    ];

    // First pass: Insert root menus
    const menuIdMap = {};
    const rootMenus = menus.filter(m => m.parent === null);

    for (const menu of rootMenus) {
      const moduleId = moduleMap[menu.module];
      if (!moduleId) {
        console.warn(`⚠️  Module "${menu.module}" not found for menu "${menu.key}"`);
        continue;
      }

      const result = await appPool.query(
        `INSERT INTO "Menus" ("ModuleId", "MenuName", "MenuKey", "MenuPath", "MenuIcon", "DisplayOrder", "MenuType", "ParentMenuId", "IsVisible", "IsActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE, TRUE)
         ON CONFLICT ("MenuKey") DO UPDATE SET
           "MenuName" = EXCLUDED."MenuName",
           "MenuPath" = EXCLUDED."MenuPath",
           "MenuIcon" = EXCLUDED."MenuIcon",
           "DisplayOrder" = EXCLUDED."DisplayOrder",
           "MenuType" = EXCLUDED."MenuType",
           "UpdatedAt" = CURRENT_TIMESTAMP
         RETURNING "MenuId", "MenuKey"`,
        [moduleId, menu.name, menu.key, menu.path, menu.icon, menu.order, menu.type]
      );
      menuIdMap[menu.key] = result.rows[0].MenuId;
    }

    // Second pass: Insert child menus
    const childMenus = menus.filter(m => m.parent !== null);

    for (const menu of childMenus) {
      const moduleId = moduleMap[menu.module];
      const parentId = menuIdMap[menu.parent];

      if (!moduleId) {
        console.warn(`⚠️  Module "${menu.module}" not found for menu "${menu.key}"`);
        continue;
      }
      if (!parentId) {
        console.warn(`⚠️  Parent menu "${menu.parent}" not found for "${menu.key}"`);
        continue;
      }

      const result = await appPool.query(
        `INSERT INTO "Menus" ("ModuleId", "MenuName", "MenuKey", "MenuPath", "MenuIcon", "DisplayOrder", "MenuType", "ParentMenuId", "IsVisible", "IsActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
         ON CONFLICT ("MenuKey") DO UPDATE SET
           "MenuName" = EXCLUDED."MenuName",
           "MenuPath" = EXCLUDED."MenuPath",
           "MenuIcon" = EXCLUDED."MenuIcon",
           "DisplayOrder" = EXCLUDED."DisplayOrder",
           "MenuType" = EXCLUDED."MenuType",
           "ParentMenuId" = EXCLUDED."ParentMenuId",
           "UpdatedAt" = CURRENT_TIMESTAMP
         RETURNING "MenuId", "MenuKey"`,
        [moduleId, menu.name, menu.key, menu.path, menu.icon, menu.order, menu.type, parentId]
      );
      menuIdMap[menu.key] = result.rows[0].MenuId;
    }

    console.log(`✅ Seeded ${Object.keys(menuIdMap).length} menus`);
  } catch (error) {
    console.error('❌ Error seeding menus:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedMenus()
    .then(() => {
      console.log('✅ Menu seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Menu seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedMenus };
