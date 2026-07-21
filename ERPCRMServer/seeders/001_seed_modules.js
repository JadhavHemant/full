const { appPool } = require('../config/db');

/**
 * Seed Modules
 * 
 * Creates all ERP/CRM system modules based on existing functionality.
 * Modules are organized hierarchically and map to actual application features.
 */
const seedModules = async () => {
  console.log('🌱 Seeding Modules...');

  const modules = [
    // Core System Modules
    { name: 'Dashboard', key: 'dashboard', description: 'Dashboard and analytics overview', icon: 'dashboard', order: 1, parent: null },
    { name: 'Users', key: 'users', description: 'User management and profiles', icon: 'people', order: 2, parent: null },
    { name: 'Companies', key: 'companies', description: 'Company management', icon: 'business', order: 3, parent: null },
    { name: 'Roles', key: 'roles', description: 'Role and permission management', icon: 'security', order: 4, parent: null },
    { name: 'Settings', key: 'settings', description: 'System settings and configuration', icon: 'settings', order: 100, parent: null },

    // Inventory Management Modules
    { name: 'Inventory', key: 'inventory', description: 'Inventory management system', icon: 'inventory', order: 10, parent: null },
    { name: 'Products', key: 'products', description: 'Product catalog management', icon: 'category', order: 11, parent: 'inventory' },
    { name: 'Product Categories', key: 'productCategory', description: 'Product category hierarchy', icon: 'folder', order: 12, parent: 'inventory' },
    { name: 'Units', key: 'units', description: 'Units of measurement', icon: 'straighten', order: 13, parent: 'inventory' },
    { name: 'Brands', key: 'brands', description: 'Product brands management', icon: 'label', order: 14, parent: 'inventory' },
    { name: 'Warehouses', key: 'warehouses', description: 'Warehouse locations', icon: 'warehouse', order: 15, parent: 'inventory' },
    { name: 'Warehouse Racks', key: 'racks', description: 'Warehouse rack management', icon: 'view_agenda', order: 16, parent: 'inventory' },
    { name: 'Warehouse Bins', key: 'bins', description: 'Warehouse bin locations', icon: 'inbox', order: 17, parent: 'inventory' },
    { name: 'Product Stock', key: 'productStock', description: 'Stock levels per warehouse', icon: 'inventory_2', order: 18, parent: 'inventory' },
    { name: 'Stock Movements', key: 'stockMovements', description: 'Stock transfer history', icon: 'swap_horiz', order: 19, parent: 'inventory' },
    { name: 'Stock Transfers', key: 'stockTransfers', description: 'Inter-warehouse transfers', icon: 'compare_arrows', order: 20, parent: 'inventory' },
    { name: 'Stock Adjustments', key: 'stockAdjustments', description: 'Stock quantity adjustments', icon: 'tune', order: 21, parent: 'inventory' },
    { name: 'Batches', key: 'batches', description: 'Batch tracking', icon: 'layers', order: 22, parent: 'inventory' },
    { name: 'Serial Numbers', key: 'serialNumbers', description: 'Serial number tracking', icon: 'pin', order: 23, parent: 'inventory' },

    // Procurement Modules
    { name: 'Procurement', key: 'procurement', description: 'Procurement management', icon: 'shopping_cart', order: 30, parent: null },
    { name: 'Suppliers', key: 'suppliers', description: 'Supplier management', icon: 'local_shipping', order: 31, parent: 'procurement' },
    { name: 'Purchase Orders', key: 'purchaseOrders', description: 'Purchase order management', icon: 'receipt', order: 32, parent: 'procurement' },
    { name: 'Purchase Order Items', key: 'purchaseOrderItems', description: 'Purchase order line items', icon: 'list', order: 33, parent: 'procurement' },
    { name: 'Purchase Requisitions', key: 'purchaseRequisitions', description: 'Purchase requisitions', icon: 'request_quote', order: 34, parent: 'procurement' },
    { name: 'Purchase Returns', key: 'purchaseReturns', description: 'Purchase return management', icon: 'assignment_return', order: 35, parent: 'procurement' },
    { name: 'GRN', key: 'grn', description: 'Goods Receipt Notes', icon: 'receipt_long', order: 36, parent: 'procurement' },

    // Sales Modules
    { name: 'Sales', key: 'sales', description: 'Sales management system', icon: 'point_of_sale', order: 40, parent: null },
    { name: 'Customers', key: 'customers', description: 'Customer management', icon: 'people_outline', order: 41, parent: 'sales' },
    { name: 'Sales Orders', key: 'salesOrders', description: 'Sales order processing', icon: 'shopping_bag', order: 42, parent: 'sales' },
    { name: 'Sales Quotations', key: 'salesQuotations', description: 'Sales quotations', icon: 'request_page', order: 43, parent: 'sales' },
    { name: 'Delivery Challans', key: 'deliveryChallans', description: 'Delivery challan management', icon: 'local_shipping', order: 44, parent: 'sales' },
    { name: 'Sales Returns', key: 'salesReturns', description: 'Sales return processing', icon: 'assignment_returned', order: 45, parent: 'sales' },

    // CRM Modules
    { name: 'CRM', key: 'crm', description: 'Customer Relationship Management', icon: 'contacts', order: 50, parent: null },
    { name: 'Accounts', key: 'accounts', description: 'CRM accounts', icon: 'account_balance', order: 51, parent: 'crm' },
    { name: 'Contacts', key: 'contacts', description: 'CRM contacts', icon: 'contact_phone', order: 52, parent: 'crm' },
    { name: 'Leads', key: 'leads', description: 'Lead management', icon: 'person_add', order: 53, parent: 'crm' },
    { name: 'Opportunities', key: 'opportunities', description: 'Sales opportunities', icon: 'trending_up', order: 54, parent: 'crm' },
    { name: 'Opportunity Products', key: 'opportunityProducts', description: 'Products linked to opportunities', icon: 'shopping_basket', order: 55, parent: 'crm' },
    { name: 'Activities', key: 'activities', description: 'CRM activities and tasks', icon: 'event', order: 56, parent: 'crm' },
    { name: 'Quotes', key: 'quotes', description: 'Sales quotes', icon: 'description', order: 57, parent: 'crm' },
    { name: 'Invoices', key: 'invoices', description: 'Invoice management', icon: 'receipt', order: 58, parent: 'crm' },
    { name: 'Payments', key: 'payments', description: 'Payment tracking', icon: 'payment', order: 59, parent: 'crm' },
    { name: 'Retentions', key: 'retentions', description: 'Customer retention management', icon: 'loyalty', order: 60, parent: 'crm' },
    { name: 'Presales', key: 'presales', description: 'Presales activities', icon: 'support_agent', order: 61, parent: 'crm' },
    { name: 'Cases', key: 'cases', description: 'Support case management', icon: 'support', order: 62, parent: 'crm' },
    { name: 'Lead Sources', key: 'leadSources', description: 'Lead source tracking', icon: 'source', order: 63, parent: 'crm' },
    { name: 'Industries', key: 'industries', description: 'Industry classifications', icon: 'business_center', order: 64, parent: 'crm' },
    { name: 'Sales Stages', key: 'salesStages', description: 'Sales pipeline stages', icon: 'timeline', order: 65, parent: 'crm' },
    { name: 'Groups', key: 'groups', description: 'User groups for collaboration', icon: 'group', order: 66, parent: 'crm' },
    { name: 'Assignments', key: 'assignments', description: 'Task assignments', icon: 'assignment', order: 67, parent: 'crm' },
    { name: 'Comments', key: 'comments', description: 'Comments and notes', icon: 'comment', order: 68, parent: 'crm' },

    // Production Modules
    { name: 'Production', key: 'production', description: 'Production management', icon: 'precision_manufacturing', order: 70, parent: null },
    { name: 'BOM', key: 'bom', description: 'Bill of Materials', icon: 'view_list', order: 71, parent: 'production' },
    { name: 'Production Orders', key: 'productionOrders', description: 'Production order management', icon: 'build', order: 72, parent: 'production' },
    { name: 'Quality Control', key: 'qualityControl', description: 'Quality control checks', icon: 'verified', order: 73, parent: 'production' },

    // Finance Modules
    { name: 'Finance', key: 'finance', description: 'Financial management', icon: 'account_balance_wallet', order: 80, parent: null },
    { name: 'Taxes', key: 'taxes', description: 'Tax configuration', icon: 'calculate', order: 81, parent: 'finance' },
    { name: 'Expenses', key: 'expenses', description: 'Expense tracking', icon: 'money_off', order: 82, parent: 'finance' },
    { name: 'Profit Loss Reports', key: 'profitLossReports', description: 'P&L reporting', icon: 'assessment', order: 83, parent: 'finance' },

    // HR Modules
    { name: 'HR', key: 'hr', description: 'Human Resources', icon: 'badge', order: 85, parent: null },
    { name: 'Employees', key: 'employees', description: 'Employee management', icon: 'person', order: 86, parent: 'hr' },
    { name: 'Departments', key: 'departments', description: 'Department organization', icon: 'corporate_fare', order: 87, parent: 'hr' },
    { name: 'Designations', key: 'designations', description: 'Job designations', icon: 'work', order: 88, parent: 'hr' },

    // Workflow Modules
    { name: 'Workflows', key: 'workflows', description: 'Workflow automation', icon: 'account_tree', order: 90, parent: null },
    { name: 'Approvals', key: 'approvals', description: 'Approval workflows', icon: 'approval', order: 91, parent: 'workflows' },
    { name: 'Notifications', key: 'notifications', description: 'Notification management', icon: 'notifications', order: 92, parent: 'workflows' },

    // Reports & Analytics
    { name: 'Reports', key: 'reports', description: 'Reports and analytics', icon: 'bar_chart', order: 95, parent: null },
    { name: 'Audit Logs', key: 'auditLogs', description: 'System audit trail', icon: 'history', order: 96, parent: 'reports' },

    // Utilities
    { name: 'Data Import/Export', key: 'dataImportExport', description: 'Data import and export utilities', icon: 'import_export', order: 97, parent: null },
    { name: 'Chat', key: 'chat', description: 'Team chat and collaboration', icon: 'chat', order: 98, parent: null },
  ];

  try {
    // First pass: Insert all root modules (parent: null)
    const rootModules = modules.filter(m => m.parent === null);
    const moduleIdMap = {};

    for (const module of rootModules) {
      const result = await appPool.query(
        `INSERT INTO "Modules" ("ModuleName", "ModuleKey", "Description", "Icon", "DisplayOrder", "ParentModuleId", "IsActive")
         VALUES ($1, $2, $3, $4, $5, NULL, TRUE)
         ON CONFLICT ("ModuleKey") DO UPDATE SET
           "ModuleName" = EXCLUDED."ModuleName",
           "Description" = EXCLUDED."Description",
           "Icon" = EXCLUDED."Icon",
           "DisplayOrder" = EXCLUDED."DisplayOrder",
           "UpdatedAt" = CURRENT_TIMESTAMP
         RETURNING "ModuleId", "ModuleKey"`,
        [module.name, module.key, module.description, module.icon, module.order]
      );
      moduleIdMap[module.key] = result.rows[0].ModuleId;
    }

    // Second pass: Insert child modules with parent references
    const childModules = modules.filter(m => m.parent !== null);
    for (const module of childModules) {
      const parentId = moduleIdMap[module.parent];
      if (!parentId) {
        console.warn(`⚠️  Parent module "${module.parent}" not found for "${module.key}"`);
        continue;
      }

      const result = await appPool.query(
        `INSERT INTO "Modules" ("ModuleName", "ModuleKey", "Description", "Icon", "DisplayOrder", "ParentModuleId", "IsActive")
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT ("ModuleKey") DO UPDATE SET
           "ModuleName" = EXCLUDED."ModuleName",
           "Description" = EXCLUDED."Description",
           "Icon" = EXCLUDED."Icon",
           "DisplayOrder" = EXCLUDED."DisplayOrder",
           "ParentModuleId" = EXCLUDED."ParentModuleId",
           "UpdatedAt" = CURRENT_TIMESTAMP
         RETURNING "ModuleId", "ModuleKey"`,
        [module.name, module.key, module.description, module.icon, module.order, parentId]
      );
      moduleIdMap[module.key] = result.rows[0].ModuleId;
    }

    console.log(`✅ Seeded ${Object.keys(moduleIdMap).length} modules`);
    return moduleIdMap;
  } catch (error) {
    console.error('❌ Error seeding modules:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedModules()
    .then(() => {
      console.log('✅ Module seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Module seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedModules };
