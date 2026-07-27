'use strict';

/**
 * RBAC Master Seeder
 *
 * Seeds in order:
 *   1. Roles          (SuperAdmin, CompanyAdmin, Manager, Employee, Customer)
 *   2. Modules        (all ERP modules)
 *   3. Permissions    (every module × every action)
 *   4. Menus          (full navigation tree)
 *   5. RolePermissions (per-role permission matrix)
 *   6. MenuPermissions (per-role menu visibility)
 *   7. SuperAdmin user  (if not already present)
 *
 * All inserts use ON CONFLICT DO NOTHING / DO UPDATE so the seeder is
 * safe to re-run at any time without duplicating data.
 */

const bcrypt = require('bcryptjs');
const { appPool } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROLES
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 1, name: 'SuperAdmin',   description: 'Full unrestricted system access' },
  { id: 2, name: 'CompanyAdmin', description: 'Full access within assigned company' },
  { id: 3, name: 'Manager',      description: 'Team management and reporting access' },
  { id: 4, name: 'Employee',     description: 'Standard employee access' },
  { id: 5, name: 'Customer',     description: 'Customer portal read-only access' },
];


// ─────────────────────────────────────────────────────────────────────────────
// 2. MODULES
// ─────────────────────────────────────────────────────────────────────────────

const MODULES = [
  // Core / System
  { key: 'users',             name: 'Users',              order: 10, icon: 'users',          parent: null },
  { key: 'companies',         name: 'Companies',          order: 20, icon: 'building',        parent: null },
  { key: 'roles',             name: 'Roles',              order: 30, icon: 'shield',          parent: null },
  { key: 'permissions',       name: 'Permissions',        order: 40, icon: 'lock',            parent: null },
  { key: 'settings',          name: 'Settings',           order: 50, icon: 'settings',        parent: null },
  // HR
  { key: 'employees',         name: 'Employees',          order: 60, icon: 'user-check',      parent: null },
  { key: 'departments',       name: 'Departments',        order: 70, icon: 'layout',          parent: null },
  { key: 'designations',      name: 'Designations',       order: 80, icon: 'tag',             parent: null },
  // CRM
  { key: 'accounts',          name: 'Accounts',           order: 100, icon: 'briefcase',      parent: null },
  { key: 'contacts',          name: 'Contacts',           order: 110, icon: 'user',           parent: null },
  { key: 'leads',             name: 'Leads',              order: 120, icon: 'target',         parent: null },
  { key: 'activities',        name: 'Activities',         order: 130, icon: 'activity',       parent: null },
  { key: 'cases',             name: 'Cases',              order: 140, icon: 'clipboard',      parent: null },
  { key: 'opportunities',     name: 'Opportunities',      order: 150, icon: 'trending-up',    parent: null },
  // Sales
  { key: 'quotes',            name: 'Quotes',             order: 160, icon: 'file-text',      parent: null },
  { key: 'invoices',          name: 'Invoices',           order: 170, icon: 'file-invoice',   parent: null },
  { key: 'payments',          name: 'Payments',           order: 180, icon: 'credit-card',    parent: null },
  { key: 'presales',          name: 'Presales',           order: 190, icon: 'shopping-bag',   parent: null },
  // Inventory
  { key: 'products',          name: 'Products',           order: 200, icon: 'package',        parent: null },
  { key: 'inventory',         name: 'Inventory',          order: 210, icon: 'box',            parent: null },
  { key: 'warehouse',         name: 'Warehouse',          order: 220, icon: 'home',           parent: null },
  // Procurement / Supply
  { key: 'suppliers',         name: 'Suppliers',          order: 230, icon: 'truck',          parent: null },
  { key: 'purchaseOrders',    name: 'Purchase Orders',    order: 240, icon: 'shopping-cart',  parent: null },
  { key: 'grn',               name: 'GRN',                order: 250, icon: 'package-check',  parent: null },
  // Customers
  { key: 'customers',         name: 'Customers',          order: 260, icon: 'users',          parent: null },
  // Finance / Expenses
  { key: 'expenses',          name: 'Expenses',           order: 270, icon: 'dollar-sign',    parent: null },
  { key: 'retentions',        name: 'Retentions',         order: 280, icon: 'percent',        parent: null },
  // Operations
  { key: 'approvalWorkflows', name: 'Approval Workflows', order: 290, icon: 'git-merge',      parent: null },
  // Reporting / Analytics
  { key: 'reports',           name: 'Reports',            order: 300, icon: 'bar-chart',      parent: null },
  { key: 'auditLogs',         name: 'Audit Logs',         order: 310, icon: 'book-open',      parent: null },
  { key: 'notifications',     name: 'Notifications',      order: 320, icon: 'bell',           parent: null },
];


// ─────────────────────────────────────────────────────────────────────────────
// 3. ACTIONS  (every module gets all of these)
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = [
  { key: 'create',  label: 'Create'  },
  { key: 'read',    label: 'Read'    },
  { key: 'update',  label: 'Update'  },
  { key: 'delete',  label: 'Delete'  },
  { key: 'approve', label: 'Approve' },
  { key: 'export',  label: 'Export'  },
  { key: 'import',  label: 'Import'  },
  { key: 'view',    label: 'View'    },
  { key: 'print',   label: 'Print'   },
  { key: 'manage',  label: 'Manage'  },
  { key: 'assign',  label: 'Assign'  },
];


// ─────────────────────────────────────────────────────────────────────────────
// 4. MENUS  (full navigation tree)
// ─────────────────────────────────────────────────────────────────────────────

const MENUS = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  { key: 'dashboard',            name: 'Dashboard',             path: '/dashboard',                    module: 'reports',          parent: null, order: 1,  type: 'menu',    icon: 'layout-dashboard' },

  // ── CRM ────────────────────────────────────────────────────────────────────
  { key: 'crm',                  name: 'CRM',                   path: '/crm',                          module: 'accounts',         parent: null, order: 10, type: 'menu',    icon: 'heart' },
  { key: 'crm.accounts',        name: 'Accounts',              path: '/crm/accounts',                 module: 'accounts',         parent: 'crm', order: 11, type: 'submenu', icon: 'briefcase' },
  { key: 'crm.contacts',        name: 'Contacts',              path: '/crm/contacts',                 module: 'contacts',         parent: 'crm', order: 12, type: 'submenu', icon: 'user' },
  { key: 'crm.leads',           name: 'Leads',                 path: '/crm/leads',                    module: 'leads',            parent: 'crm', order: 13, type: 'submenu', icon: 'target' },
  { key: 'crm.opportunities',   name: 'Opportunities',         path: '/crm/opportunities',            module: 'opportunities',    parent: 'crm', order: 14, type: 'submenu', icon: 'trending-up' },
  { key: 'crm.activities',      name: 'Activities',            path: '/crm/activities',               module: 'activities',       parent: 'crm', order: 15, type: 'submenu', icon: 'activity' },
  { key: 'crm.cases',           name: 'Cases',                 path: '/crm/cases',                    module: 'cases',            parent: 'crm', order: 16, type: 'submenu', icon: 'clipboard' },
  { key: 'crm.presales',        name: 'Presales',              path: '/crm/presales',                 module: 'presales',         parent: 'crm', order: 17, type: 'submenu', icon: 'shopping-bag' },

  // ── Sales ──────────────────────────────────────────────────────────────────
  { key: 'sales',                name: 'Sales',                 path: '/sales',                        module: 'quotes',           parent: null, order: 20, type: 'menu',    icon: 'trending-up' },
  { key: 'sales.quotes',        name: 'Quotes',                path: '/sales/quotes',                 module: 'quotes',           parent: 'sales', order: 21, type: 'submenu', icon: 'file-text' },
  { key: 'sales.invoices',      name: 'Invoices',              path: '/sales/invoices',               module: 'invoices',         parent: 'sales', order: 22, type: 'submenu', icon: 'file' },
  { key: 'sales.payments',      name: 'Payments',              path: '/sales/payments',               module: 'payments',         parent: 'sales', order: 23, type: 'submenu', icon: 'credit-card' },
  { key: 'sales.retentions',    name: 'Retentions',            path: '/sales/retentions',             module: 'retentions',       parent: 'sales', order: 24, type: 'submenu', icon: 'percent' },
  { key: 'sales.customers',     name: 'Customers',             path: '/sales/customers',              module: 'customers',        parent: 'sales', order: 25, type: 'submenu', icon: 'users' },

  // ── Inventory ──────────────────────────────────────────────────────────────
  { key: 'inv',                  name: 'Inventory',             path: '/inventory',                    module: 'inventory',        parent: null, order: 30, type: 'menu',    icon: 'box' },
  { key: 'inv.products',        name: 'Products',              path: '/inventory/products',           module: 'products',         parent: 'inv', order: 31, type: 'submenu', icon: 'package' },
  { key: 'inv.products.create', name: 'Create Product',        path: '/inventory/products/new',       module: 'products',         parent: 'inv.products', order: 32, type: 'action', icon: 'plus' },
  { key: 'inv.products.edit',   name: 'Edit Product',          path: '/inventory/products/:id/edit',  module: 'products',         parent: 'inv.products', order: 33, type: 'action', icon: 'edit' },
  { key: 'inv.warehouse',       name: 'Warehouse',             path: '/inventory/warehouses',         module: 'warehouse',        parent: 'inv', order: 34, type: 'submenu', icon: 'home' },
  { key: 'inv.stock',           name: 'Stock',                 path: '/inventory/stock',              module: 'inventory',        parent: 'inv', order: 35, type: 'submenu', icon: 'layers' },
  { key: 'inv.grn',             name: 'GRN',                   path: '/inventory/grn',                module: 'grn',              parent: 'inv', order: 36, type: 'submenu', icon: 'package-check' },

  // ── Procurement ────────────────────────────────────────────────────────────
  { key: 'procurement',          name: 'Procurement',           path: '/procurement',                  module: 'purchaseOrders',   parent: null, order: 40, type: 'menu',    icon: 'truck' },
  { key: 'proc.purchase-orders', name: 'Purchase Orders',       path: '/procurement/purchase-orders',  module: 'purchaseOrders',   parent: 'procurement', order: 41, type: 'submenu', icon: 'shopping-cart' },
  { key: 'proc.suppliers',       name: 'Suppliers',             path: '/procurement/suppliers',        module: 'suppliers',        parent: 'procurement', order: 42, type: 'submenu', icon: 'truck' },

  // ── HR ─────────────────────────────────────────────────────────────────────
  { key: 'hr',                   name: 'HR',                    path: '/hr',                           module: 'employees',        parent: null, order: 50, type: 'menu',    icon: 'users' },
  { key: 'hr.employees',        name: 'Employees',             path: '/hr/employees',                 module: 'employees',        parent: 'hr', order: 51, type: 'submenu', icon: 'user-check' },
  { key: 'hr.departments',      name: 'Departments',           path: '/hr/departments',               module: 'departments',      parent: 'hr', order: 52, type: 'submenu', icon: 'layout' },
  { key: 'hr.designations',     name: 'Designations',          path: '/hr/designations',              module: 'designations',     parent: 'hr', order: 53, type: 'submenu', icon: 'tag' },
  { key: 'hr.expenses',         name: 'Expenses',              path: '/hr/expenses',                  module: 'expenses',         parent: 'hr', order: 54, type: 'submenu', icon: 'dollar-sign' },

  // ── Reports ────────────────────────────────────────────────────────────────
  { key: 'rpt',                  name: 'Reports',               path: '/reports',                      module: 'reports',          parent: null, order: 60, type: 'menu',    icon: 'bar-chart' },
  { key: 'rpt.dashboard',       name: 'Dashboard',             path: '/reports/dashboard',            module: 'reports',          parent: 'rpt', order: 61, type: 'submenu', icon: 'pie-chart' },
  { key: 'rpt.audit-logs',      name: 'Audit Logs',            path: '/reports/audit-logs',           module: 'auditLogs',        parent: 'rpt', order: 62, type: 'submenu', icon: 'book-open' },

  // ── Settings ───────────────────────────────────────────────────────────────
  { key: 'cfg',                  name: 'Settings',              path: '/settings',                     module: 'settings',         parent: null, order: 70, type: 'menu',    icon: 'settings' },
  { key: 'cfg.users',           name: 'Users',                 path: '/settings/users',               module: 'users',            parent: 'cfg', order: 71, type: 'submenu', icon: 'users' },
  { key: 'cfg.roles',           name: 'Roles',                 path: '/settings/roles',               module: 'roles',            parent: 'cfg', order: 72, type: 'submenu', icon: 'shield' },
  { key: 'cfg.permissions',     name: 'Permissions',           path: '/settings/permissions',         module: 'permissions',      parent: 'cfg', order: 73, type: 'submenu', icon: 'lock' },
  { key: 'cfg.companies',       name: 'Companies',             path: '/settings/companies',           module: 'companies',        parent: 'cfg', order: 74, type: 'submenu', icon: 'building' },
  { key: 'cfg.approval',        name: 'Approval Workflows',    path: '/settings/approval-workflows',  module: 'approvalWorkflows',parent: 'cfg', order: 75, type: 'submenu', icon: 'git-merge' },
  { key: 'cfg.notifications',   name: 'Notifications',         path: '/settings/notifications',       module: 'notifications',    parent: 'cfg', order: 76, type: 'submenu', icon: 'bell' },
];


// ─────────────────────────────────────────────────────────────────────────────
// 5. ROLE PERMISSION MATRIX
//    Format: { roleId: { moduleKey: [action, ...] } }
//    SuperAdmin (1) gets all permissions — applied programmatically.
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_PERMISSION_MATRIX = {
  // CompanyAdmin — full access within company, no system-level settings
  2: {
    users:             ['create','read','update','delete','view','export','import','assign'],
    companies:         ['read','update','view'],
    roles:             ['read','view'],
    permissions:       ['read','view'],
    settings:          ['read','update','view'],
    employees:         ['create','read','update','delete','view','export','import'],
    departments:       ['create','read','update','delete','view'],
    designations:      ['create','read','update','delete','view'],
    accounts:          ['create','read','update','delete','approve','view','export','import','assign'],
    contacts:          ['create','read','update','delete','view','export','import'],
    leads:             ['create','read','update','delete','approve','view','export','import','assign'],
    activities:        ['create','read','update','delete','view','export'],
    cases:             ['create','read','update','delete','approve','view','export','assign'],
    opportunities:     ['create','read','update','delete','approve','view','export','import','assign'],
    quotes:            ['create','read','update','delete','approve','view','export','print'],
    invoices:          ['create','read','update','delete','approve','view','export','print'],
    payments:          ['create','read','update','delete','approve','view','export'],
    presales:          ['create','read','update','delete','approve','view','export'],
    retentions:        ['create','read','update','delete','approve','view','export'],
    products:          ['create','read','update','delete','view','export','import'],
    inventory:         ['create','read','update','delete','approve','view','export','import'],
    warehouse:         ['create','read','update','delete','view','manage'],
    suppliers:         ['create','read','update','delete','view','export','import'],
    purchaseOrders:    ['create','read','update','delete','approve','view','export','import','print'],
    grn:               ['create','read','update','delete','approve','view','export'],
    customers:         ['create','read','update','delete','view','export','import'],
    expenses:          ['create','read','update','delete','approve','view','export'],
    retentions:        ['create','read','update','delete','approve','view','export'],
    approvalWorkflows: ['create','read','update','delete','view','manage'],
    reports:           ['read','view','export'],
    auditLogs:         ['read','view','export'],
    notifications:     ['read','update','view'],
  },

  // Manager — create/edit/view but no delete on critical entities, no approve
  3: {
    users:             ['read','view'],
    employees:         ['create','read','update','view','export'],
    departments:       ['read','view'],
    designations:      ['read','view'],
    accounts:          ['create','read','update','view','export','assign'],
    contacts:          ['create','read','update','view','export'],
    leads:             ['create','read','update','view','export','assign'],
    activities:        ['create','read','update','view','export'],
    cases:             ['create','read','update','view','export','assign'],
    opportunities:     ['create','read','update','view','export','assign'],
    quotes:            ['create','read','update','view','export','print'],
    invoices:          ['create','read','update','view','export','print'],
    payments:          ['create','read','update','view','export'],
    presales:          ['create','read','update','view','export'],
    retentions:        ['read','view','export'],
    products:          ['create','read','update','view','export'],
    inventory:         ['create','read','update','view','export'],
    warehouse:         ['read','view'],
    suppliers:         ['create','read','update','view','export'],
    purchaseOrders:    ['create','read','update','view','export','print'],
    grn:               ['create','read','update','view','export'],
    customers:         ['create','read','update','view','export'],
    expenses:          ['create','read','update','view','export'],
    approvalWorkflows: ['read','view'],
    reports:           ['read','view','export'],
    auditLogs:         ['read','view'],
    notifications:     ['read','view'],
  },

  // Employee — read and create own records, limited updates, no delete
  4: {
    accounts:          ['create','read','view'],
    contacts:          ['create','read','view'],
    leads:             ['create','read','view'],
    activities:        ['create','read','update','view'],
    cases:             ['create','read','view'],
    opportunities:     ['read','view'],
    quotes:            ['read','view'],
    invoices:          ['read','view'],
    payments:          ['read','view'],
    presales:          ['read','view'],
    products:          ['read','view'],
    inventory:         ['read','view'],
    warehouse:         ['read','view'],
    customers:         ['read','view'],
    expenses:          ['create','read','update','view'],
    reports:           ['read','view'],
    notifications:     ['read','view'],
  },

  // Customer — read-only portal access
  5: {
    invoices:          ['read','view','print'],
    payments:          ['read','view'],
    quotes:            ['read','view','print'],
    customers:         ['read','view'],
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// 6. MENU VISIBILITY MATRIX
//    Defines which top-level and sub-menus each role can see.
//    SuperAdmin (1) sees everything.
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_MENU_VISIBILITY = {
  // CompanyAdmin — everything except system-internals
  2: ['dashboard','crm','crm.accounts','crm.contacts','crm.leads','crm.opportunities',
      'crm.activities','crm.cases','crm.presales','sales','sales.quotes','sales.invoices',
      'sales.payments','sales.retentions','sales.customers','inv','inv.products',
      'inv.products.create','inv.products.edit','inv.warehouse','inv.stock','inv.grn',
      'procurement','proc.purchase-orders','proc.suppliers','hr','hr.employees',
      'hr.departments','hr.designations','hr.expenses','rpt','rpt.dashboard',
      'rpt.audit-logs','cfg','cfg.users','cfg.roles','cfg.permissions','cfg.companies',
      'cfg.approval','cfg.notifications'],

  // Manager — no settings / permissions management
  3: ['dashboard','crm','crm.accounts','crm.contacts','crm.leads','crm.opportunities',
      'crm.activities','crm.cases','crm.presales','sales','sales.quotes','sales.invoices',
      'sales.payments','sales.customers','inv','inv.products','inv.products.create',
      'inv.products.edit','inv.warehouse','inv.stock','inv.grn','procurement',
      'proc.purchase-orders','proc.suppliers','hr','hr.employees','hr.departments',
      'hr.designations','hr.expenses','rpt','rpt.dashboard'],

  // Employee — operational menus only
  4: ['dashboard','crm','crm.accounts','crm.contacts','crm.leads','crm.activities',
      'crm.cases','sales','sales.quotes','sales.invoices','sales.customers',
      'inv','inv.products','hr','hr.expenses','rpt','rpt.dashboard'],

  // Customer — portal only
  5: ['dashboard','sales.invoices','sales.payments','sales.quotes','sales.customers'],
};


// ─────────────────────────────────────────────────────────────────────────────
// SEEDER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed Roles — upsert by Id so numeric IDs stay stable across environments.
 */
const seedRoles = async (client) => {
  console.log('  → Seeding Roles...');
  for (const role of ROLES) {
    await client.query(`
      INSERT INTO "Roles" ("Id", "RoleName", "IsActive", "IsDeleted", "Flag")
      VALUES ($1, $2, TRUE, FALSE, TRUE)
      ON CONFLICT ("Id") DO UPDATE
        SET "RoleName" = EXCLUDED."RoleName",
            "IsActive" = TRUE,
            "IsDeleted" = FALSE;
    `, [role.id, role.name]);
  }

  // Advance the sequence past our manually inserted IDs
  await client.query(`
    SELECT setval(pg_get_serial_sequence('"Roles"', 'Id'), GREATEST(
      (SELECT MAX("Id") FROM "Roles"), 5
    ), true);
  `);
  console.log(`     ✓ ${ROLES.length} roles upserted`);
};

/**
 * Seed Modules — upsert by ModuleKey.
 * Returns a map: moduleKey → ModuleId
 */
const seedModules = async (client) => {
  console.log('  → Seeding Modules...');
  const moduleIdMap = {};

  // First pass: insert root modules (no parent)
  for (const mod of MODULES.filter(m => m.parent === null)) {
    const result = await client.query(`
      INSERT INTO "Modules" ("ModuleName", "ModuleKey", "Icon", "DisplayOrder", "IsActive", "IsDeleted")
      VALUES ($1, $2, $3, $4, TRUE, FALSE)
      ON CONFLICT ("ModuleKey") DO UPDATE
        SET "ModuleName"    = EXCLUDED."ModuleName",
            "Icon"          = EXCLUDED."Icon",
            "DisplayOrder"  = EXCLUDED."DisplayOrder",
            "IsActive"      = TRUE,
            "IsDeleted"     = FALSE
      RETURNING "ModuleId";
    `, [mod.name, mod.key, mod.icon, mod.order]);
    moduleIdMap[mod.key] = result.rows[0].ModuleId;
  }

  // Second pass: insert child modules that reference a parent
  for (const mod of MODULES.filter(m => m.parent !== null)) {
    const parentId = moduleIdMap[mod.parent] || null;
    const result = await client.query(`
      INSERT INTO "Modules" ("ModuleName", "ModuleKey", "Icon", "DisplayOrder", "ParentModuleId", "IsActive", "IsDeleted")
      VALUES ($1, $2, $3, $4, $5, TRUE, FALSE)
      ON CONFLICT ("ModuleKey") DO UPDATE
        SET "ModuleName"     = EXCLUDED."ModuleName",
            "Icon"           = EXCLUDED."Icon",
            "DisplayOrder"   = EXCLUDED."DisplayOrder",
            "ParentModuleId" = EXCLUDED."ParentModuleId",
            "IsActive"       = TRUE,
            "IsDeleted"      = FALSE
      RETURNING "ModuleId";
    `, [mod.name, mod.key, mod.icon, mod.order, parentId]);
    moduleIdMap[mod.key] = result.rows[0].ModuleId;
  }

  console.log(`     ✓ ${MODULES.length} modules upserted`);
  return moduleIdMap;
};


/**
 * Seed Permissions — one row per (moduleKey × action).
 * Returns a map: permissionKey → PermissionId
 */
const seedPermissions = async (client, moduleIdMap) => {
  console.log('  → Seeding Permissions...');
  const permissionIdMap = {};
  let count = 0;

  for (const mod of MODULES) {
    const moduleId = moduleIdMap[mod.key];
    if (!moduleId) continue;

    for (const action of ACTIONS) {
      const permKey  = `${mod.key}.${action.key}`;
      const permName = `${mod.name} ${action.label}`;

      const result = await client.query(`
        INSERT INTO "Permissions"
          ("ModuleId", "PermissionName", "PermissionKey", "Action", "IsActive", "IsDeleted")
        VALUES ($1, $2, $3, $4, TRUE, FALSE)
        ON CONFLICT ("PermissionKey") DO UPDATE
          SET "ModuleId"       = EXCLUDED."ModuleId",
              "PermissionName" = EXCLUDED."PermissionName",
              "Action"         = EXCLUDED."Action",
              "IsActive"       = TRUE,
              "IsDeleted"      = FALSE
        RETURNING "PermissionId";
      `, [moduleId, permName, permKey, action.key]);

      permissionIdMap[permKey] = result.rows[0].PermissionId;
      count++;
    }
  }

  console.log(`     ✓ ${count} permissions upserted`);
  return permissionIdMap;
};

/**
 * Seed Menus — upsert by MenuKey.
 * Returns a map: menuKey → MenuId
 */
const seedMenus = async (client, moduleIdMap) => {
  console.log('  → Seeding Menus...');
  const menuIdMap = {};

  // First pass: root menus (parent === null)
  for (const menu of MENUS.filter(m => m.parent === null)) {
    const moduleId = moduleIdMap[menu.module] || null;
    const result = await client.query(`
      INSERT INTO "Menus"
        ("ModuleId", "MenuName", "MenuKey", "MenuPath", "MenuIcon",
         "DisplayOrder", "MenuType", "IsVisible", "IsActive", "IsDeleted")
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, FALSE)
      ON CONFLICT ("MenuKey") DO UPDATE
        SET "ModuleId"     = EXCLUDED."ModuleId",
            "MenuName"     = EXCLUDED."MenuName",
            "MenuPath"     = EXCLUDED."MenuPath",
            "MenuIcon"     = EXCLUDED."MenuIcon",
            "DisplayOrder" = EXCLUDED."DisplayOrder",
            "MenuType"     = EXCLUDED."MenuType",
            "IsActive"     = TRUE,
            "IsDeleted"    = FALSE
      RETURNING "MenuId";
    `, [moduleId, menu.name, menu.key, menu.path, menu.icon, menu.order, menu.type]);
    menuIdMap[menu.key] = result.rows[0].MenuId;
  }

  // Second pass: child menus
  for (const menu of MENUS.filter(m => m.parent !== null)) {
    const moduleId   = moduleIdMap[menu.module]  || null;
    const parentId   = menuIdMap[menu.parent]    || null;
    const result = await client.query(`
      INSERT INTO "Menus"
        ("ModuleId", "ParentMenuId", "MenuName", "MenuKey", "MenuPath", "MenuIcon",
         "DisplayOrder", "MenuType", "IsVisible", "IsActive", "IsDeleted")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE, FALSE)
      ON CONFLICT ("MenuKey") DO UPDATE
        SET "ModuleId"     = EXCLUDED."ModuleId",
            "ParentMenuId" = EXCLUDED."ParentMenuId",
            "MenuName"     = EXCLUDED."MenuName",
            "MenuPath"     = EXCLUDED."MenuPath",
            "MenuIcon"     = EXCLUDED."MenuIcon",
            "DisplayOrder" = EXCLUDED."DisplayOrder",
            "MenuType"     = EXCLUDED."MenuType",
            "IsActive"     = TRUE,
            "IsDeleted"    = FALSE
      RETURNING "MenuId";
    `, [moduleId, parentId, menu.name, menu.key, menu.path, menu.icon, menu.order, menu.type]);
    menuIdMap[menu.key] = result.rows[0].MenuId;
  }

  console.log(`     ✓ ${MENUS.length} menus upserted`);
  return menuIdMap;
};


/**
 * Seed RolePermissions
 * SuperAdmin (roleId=1) gets every single permission.
 * Other roles follow ROLE_PERMISSION_MATRIX.
 */
const seedRolePermissions = async (client, permissionIdMap) => {
  console.log('  → Seeding RolePermissions...');
  let count = 0;

  // SuperAdmin — grant everything
  const allPermIds = Object.values(permissionIdMap);
  for (const permId of allPermIds) {
    await client.query(`
      INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "Allowed")
      VALUES (1, $1, TRUE)
      ON CONFLICT ("RoleId", "PermissionId") DO UPDATE
        SET "Allowed" = TRUE;
    `, [permId]);
    count++;
  }

  // Other roles
  for (const [roleIdStr, moduleMap] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleId = parseInt(roleIdStr, 10);
    for (const [moduleKey, actions] of Object.entries(moduleMap)) {
      for (const action of actions) {
        const permKey = `${moduleKey}.${action}`;
        const permId  = permissionIdMap[permKey];
        if (!permId) continue;

        await client.query(`
          INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "Allowed")
          VALUES ($1, $2, TRUE)
          ON CONFLICT ("RoleId", "PermissionId") DO UPDATE
            SET "Allowed" = TRUE;
        `, [roleId, permId]);
        count++;
      }
    }
  }

  console.log(`     ✓ ${count} role-permission rows upserted`);
};

/**
 * Seed MenuPermissions
 * SuperAdmin (roleId=1) can see and act on every menu.
 * Other roles follow ROLE_MENU_VISIBILITY.
 */
const seedMenuPermissions = async (client, menuIdMap) => {
  console.log('  → Seeding MenuPermissions...');
  let count = 0;

  const allMenuIds = Object.values(menuIdMap);

  // SuperAdmin — full access to all menus
  for (const menuId of allMenuIds) {
    await client.query(`
      INSERT INTO "MenuPermissions"
        ("RoleId", "MenuId", "CanView", "CanCreate", "CanEdit", "CanDelete", "IsActive", "IsDeleted")
      VALUES (1, $1, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE)
      ON CONFLICT ("RoleId", "MenuId") DO UPDATE
        SET "CanView"   = TRUE, "CanCreate" = TRUE,
            "CanEdit"   = TRUE, "CanDelete" = TRUE,
            "IsActive"  = TRUE, "IsDeleted" = FALSE;
    `, [menuId]);
    count++;
  }

  // Other roles — grant CanView for visible menus, CanCreate/Edit based on matrix
  for (const [roleIdStr, menuKeys] of Object.entries(ROLE_MENU_VISIBILITY)) {
    const roleId = parseInt(roleIdStr, 10);
    const modPerms = ROLE_PERMISSION_MATRIX[roleId] || {};

    // Derive CRUD capability from permission matrix for this role
    const canCreate = (mk) => {
      const seg = mk.split('.')[0];
      return (modPerms[seg] || []).includes('create');
    };
    const canEdit = (mk) => {
      const seg = mk.split('.')[0];
      return (modPerms[seg] || []).includes('update');
    };
    const canDelete = (mk) => {
      const seg = mk.split('.')[0];
      return (modPerms[seg] || []).includes('delete');
    };

    for (const menuKey of menuKeys) {
      const menuId = menuIdMap[menuKey];
      if (!menuId) continue;

      await client.query(`
        INSERT INTO "MenuPermissions"
          ("RoleId", "MenuId", "CanView", "CanCreate", "CanEdit", "CanDelete", "IsActive", "IsDeleted")
        VALUES ($1, $2, TRUE, $3, $4, $5, TRUE, FALSE)
        ON CONFLICT ("RoleId", "MenuId") DO UPDATE
          SET "CanView"   = TRUE,
              "CanCreate" = EXCLUDED."CanCreate",
              "CanEdit"   = EXCLUDED."CanEdit",
              "CanDelete" = EXCLUDED."CanDelete",
              "IsActive"  = TRUE,
              "IsDeleted" = FALSE;
      `, [roleId, menuId, canCreate(menuKey), canEdit(menuKey), canDelete(menuKey)]);
      count++;
    }
  }

  console.log(`     ✓ ${count} menu-permission rows upserted`);
};


/**
 * Seed SuperAdmin user.
 * Uses env vars SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD with safe fallbacks.
 * Skips if a user with roleId=1 already exists.
 */
const seedSuperAdmin = async (client) => {
  console.log('  → Seeding SuperAdmin user...');

  const existing = await client.query(`
    SELECT "UserId" FROM "Users" WHERE "RoleId" = 1 LIMIT 1;
  `);

  if (existing.rows.length > 0) {
    console.log('     ✓ SuperAdmin already exists — skipped');
    return;
  }

  const email    = process.env.SUPERADMIN_EMAIL    || 'superadmin@erp.local';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
  const name     = process.env.SUPERADMIN_NAME     || 'Super Admin';

  const hash = await bcrypt.hash(password, 12);

  await client.query(`
    INSERT INTO "Users"
      ("Name", "Email", "Password", "RoleId", "IsActive", "IsDelete",
       "EmailVerified", "Status", "PasswordChangedAt", "CreatedAt", "UpdatedAt")
    VALUES ($1, $2, $3, 1, TRUE, FALSE, TRUE, 'active', NOW(), NOW(), NOW())
    ON CONFLICT ("Email") DO NOTHING;
  `, [name, email, hash]);

  console.log(`     ✓ SuperAdmin created → ${email}`);
  if (!process.env.SUPERADMIN_PASSWORD) {
    console.warn('     ⚠️  Default password used. Set SUPERADMIN_PASSWORD in .env immediately!');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────

const runRbacSeeder = async () => {
  const client = await appPool.connect();
  try {
    console.log('\n🌱 Starting RBAC seeder...\n');
    await client.query('BEGIN');

    await seedRoles(client);
    const moduleIdMap     = await seedModules(client);
    const permissionIdMap = await seedPermissions(client, moduleIdMap);
    const menuIdMap       = await seedMenus(client, moduleIdMap);
    await seedRolePermissions(client, permissionIdMap);
    await seedMenuPermissions(client, menuIdMap);
    await seedSuperAdmin(client);

    await client.query('COMMIT');
    console.log('\n✅ RBAC seeder completed successfully.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ RBAC seeder failed — transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { runRbacSeeder };

// Allow direct execution: node seeders/rbacSeeder.js
if (require.main === module) {
  runRbacSeeder()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
