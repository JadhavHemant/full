'use strict';
/**
 * Module Assignment Controller
 *
 * Allows administrators to assign/revoke specific modules to individual users or roles.
 * The user's sidebar is built dynamically from these assignments.
 *
 * Tables used:
 *   UserModuleAssignments  — per-user module overrides
 *   RoleModuleAssignments  — per-role module defaults (optional, falls back to userTypePermissions.js)
 *
 * If no explicit assignment exists for a user, the system falls back to their user-type defaults
 * defined in config/userTypePermissions.js — maintaining full backward compatibility.
 */

const { appPool } = require('../../config/db');
const { ROLE_IDS, resolveRoleId } = require('../../config/roleConfig');
const { MODULE_VISIBILITY, getUserTypePermissions, getVisibleModules } = require('../../config/userTypePermissions');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSuperAdmin = (user) => Number(user?.roleId || user?.RoleId) === ROLE_IDS.SUPERADMIN;

const ensureModuleAssignmentTable = async () => {
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "UserModuleAssignments" (
      "Id"         SERIAL PRIMARY KEY,
      "UserId"     INTEGER NOT NULL,
      "CompanyId"  INTEGER,
      "Modules"    JSONB NOT NULL DEFAULT '[]',
      "CreatedBy"  INTEGER,
      "UpdatedBy"  INTEGER,
      "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "UpdatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("UserId")
    );
  `);
};

// ─── GET /api/user-modules/my  ────────────────────────────────────────────────
/**
 * Returns the full navigation tree for the authenticated user.
 * Used by the frontend sidebar to build the menu dynamically.
 */
const getMyModules = async (req, res) => {
  try {
    const userId   = req.user?.UserId || req.user?.userId;
    const roleId   = resolveRoleId(req.user);
    const userType = req.user?.userTypeId || req.user?.UserTypeId || 4;

    // SuperAdmin always gets everything
    if (Number(roleId) === ROLE_IDS.SUPERADMIN) {
      return res.json({
        modules: buildFullNavigation(true),
        isSuperAdmin: true,
        source: 'superadmin',
      });
    }

    await ensureModuleAssignmentTable();

    // Check for an explicit per-user assignment first
    const userResult = await appPool.query(
      `SELECT "Modules" FROM "UserModuleAssignments" WHERE "UserId" = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      const assignedModules = userResult.rows[0].Modules || [];
      return res.json({
        modules: buildFilteredNavigation(assignedModules),
        isSuperAdmin: false,
        source: 'user_assignment',
      });
    }

    // Fall back to user-type defaults
    const visibleKeys = getVisibleModules(userType);
    return res.json({
      modules: buildFilteredNavigation(visibleKeys),
      isSuperAdmin: false,
      source: 'user_type_default',
    });
  } catch (err) {
    console.error('getMyModules error:', err);
    res.status(500).json({ message: 'Failed to load module assignments' });
  }
};

// ─── GET /api/user-modules/:userId  ──────────────────────────────────────────
const getUserModules = async (req, res) => {
  try {
    const { userId } = req.params;
    await ensureModuleAssignmentTable();

    const result = await appPool.query(
      `SELECT uma.*, u."UserTypeId"
       FROM "UserModuleAssignments" uma
       LEFT JOIN "Users" u ON u."Id" = uma."UserId"
       WHERE uma."UserId" = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults based on user type
      const userRow = await appPool.query(`SELECT "UserTypeId" FROM "Users" WHERE "Id" = $1`, [userId]);
      const userType = userRow.rows[0]?.UserTypeId || 4;
      const visibleKeys = getVisibleModules(userType);
      return res.json({ modules: visibleKeys, source: 'user_type_default' });
    }

    res.json({ modules: result.rows[0].Modules, source: 'user_assignment' });
  } catch (err) {
    console.error('getUserModules error:', err);
    res.status(500).json({ message: 'Failed to get user modules' });
  }
};

// ─── POST /api/user-modules/:userId  ─────────────────────────────────────────
const assignModulesToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { modules } = req.body;
    const adminId = req.user?.UserId || req.user?.userId;

    if (!Array.isArray(modules)) {
      return res.status(400).json({ message: 'modules must be an array of module keys' });
    }

    // Validate module keys
    const allKeys = Object.keys(MODULE_VISIBILITY);
    const invalid = modules.filter(m => !allKeys.includes(m));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Unknown modules: ${invalid.join(', ')}` });
    }

    await ensureModuleAssignmentTable();

    await appPool.query(`
      INSERT INTO "UserModuleAssignments" ("UserId","Modules","CreatedBy","UpdatedBy","UpdatedAt")
      VALUES ($1,$2,$3,$3,NOW())
      ON CONFLICT ("UserId") DO UPDATE
        SET "Modules" = $2, "UpdatedBy" = $3, "UpdatedAt" = NOW()
    `, [userId, JSON.stringify(modules), adminId]);

    res.json({ message: 'Modules assigned successfully', userId, modules });
  } catch (err) {
    console.error('assignModulesToUser error:', err);
    res.status(500).json({ message: 'Failed to assign modules' });
  }
};

// ─── DELETE /api/user-modules/:userId  ───────────────────────────────────────
const resetUserModules = async (req, res) => {
  try {
    const { userId } = req.params;
    await ensureModuleAssignmentTable();
    await appPool.query(`DELETE FROM "UserModuleAssignments" WHERE "UserId" = $1`, [userId]);
    res.json({ message: 'User module assignment reset to defaults', userId });
  } catch (err) {
    console.error('resetUserModules error:', err);
    res.status(500).json({ message: 'Failed to reset user modules' });
  }
};

// ─── GET /api/user-modules/available  ────────────────────────────────────────
const getAvailableModules = async (_req, res) => {
  try {
    res.json({
      modules: MODULE_VISIBILITY,
      total: Object.keys(MODULE_VISIBILITY).length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available modules' });
  }
};

// ─── Navigation builders ──────────────────────────────────────────────────────

/** Builds the full navigation tree (SuperAdmin). */
function buildFullNavigation() {
  return buildFilteredNavigation(Object.keys(MODULE_VISIBILITY));
}

/** Builds a navigation tree filtered to the given module keys. */
function buildFilteredNavigation(allowedKeys) {
  const allowed = new Set(allowedKeys);

  const nav = [
    { key: 'dashboard', name: 'Dashboard', href: '/Admin', icon: 'HomeIcon' },
  ];

  // ── CRM ────────────────────────────────────────────────────────────────────
  const crmChildren = [];
  if (allowed.has('crm') || allowed.has('accounts'))      crmChildren.push({ name: 'Accounts',      href: '/Admin/Accounts' });
  if (allowed.has('crm') || allowed.has('contacts'))      crmChildren.push({ name: 'Contacts',      href: '/Admin/Contact' });
  if (allowed.has('crm') || allowed.has('leads'))         crmChildren.push({ name: 'Leads',         href: '/Admin/Leads' });
  if (allowed.has('crm') || allowed.has('opportunities')) crmChildren.push({ name: 'Opportunities', href: '/Admin/Opportunities' });
  if (allowed.has('crm') || allowed.has('activities'))    crmChildren.push({ name: 'Activities',    href: '/Admin/Activities' });
  if (allowed.has('crm') || allowed.has('quotes'))        crmChildren.push({ name: 'Quotes',        href: '/Admin/Quotes' });
  if (allowed.has('crm') || allowed.has('invoices'))      crmChildren.push({ name: 'Invoices',      href: '/Admin/Invoices' });
  if (allowed.has('crm') || allowed.has('payments'))      crmChildren.push({ name: 'Payments',      href: '/Admin/Payments' });
  if (allowed.has('crm'))                                 crmChildren.push({ name: 'Pre-Sales',     href: '/Admin/PreSales' });
  if (allowed.has('crm') || allowed.has('cases'))         crmChildren.push({ name: 'Cases',         href: '/Admin/Cases' });
  if (allowed.has('crm'))                                 crmChildren.push({ name: 'Retentions',    href: '/Admin/Retentions' });
  if (crmChildren.length) nav.push({ key: 'crm', name: 'CRM', icon: 'FolderIcon', children: crmChildren });

  // ── Inventory ──────────────────────────────────────────────────────────────
  const invChildren = [];
  if (allowed.has('inventory')) {
    invChildren.push(
      { name: 'Overview',           href: '/Admin/ERP' },
      { name: 'Products',           href: '/Admin/ERP/Products' },
      { name: 'Product Categories', href: '/Admin/ERP/ProductCategory' },
      { name: 'Units',              href: '/Admin/ERP/Units' },
      { name: 'Brands',             href: '/Admin/ERP/Brands' },
      { name: 'Warehouse',          href: '/Admin/ERP/Warehouse' },
      { name: 'Product Stock',      href: '/Admin/ERP/ProductStock' },
      { name: 'Stock Movements',    href: '/Admin/ERP/StockMovements' },
      { name: 'Stock Transfers',    href: '/Admin/ERP/StockTransfers' },
      { name: 'Stock Adjustments',  href: '/Admin/ERP/StockAdjustments' },
      { name: 'Batches',            href: '/Admin/ERP/Batches' },
      { name: 'Serial Numbers',     href: '/Admin/ERP/SerialNumbers' },
      { name: 'Stock Valuation',    href: '/Admin/ERP/StockValuation' },
      { name: 'Reorder Levels',     href: '/Admin/ERP/ReorderLevels' },
      { name: 'HSN / SAC Codes',    href: '/Admin/ERP/HSNCodes' },
      { name: 'Price Lists',        href: '/Admin/ERP/PriceLists' },
    );
  }
  if (invChildren.length) nav.push({ key: 'inventory', name: 'Inventory', icon: 'FolderIcon', children: invChildren });

  // ── WMS ────────────────────────────────────────────────────────────────────
  if (allowed.has('inventory') || allowed.has('wms')) {
    nav.push({
      key: 'wms', name: 'Warehouse Ops', icon: 'FolderIcon',
      children: [
        { name: 'Putaway Tasks',  href: '/Admin/ERP/WMS/Putaway' },
        { name: 'Picking Lists',  href: '/Admin/ERP/WMS/Picking' },
        { name: 'Cycle Count',    href: '/Admin/ERP/WMS/CycleCount' },
      ],
    });
  }

  // ── Procurement ────────────────────────────────────────────────────────────
  const procChildren = [];
  if (allowed.has('purchase-orders') || allowed.has('inventory')) {
    procChildren.push(
      { name: 'Purchase Orders',   href: '/Admin/ERP/PurchaseOrders' },
      { name: 'Purchase Items',    href: '/Admin/ERP/PurchaseOrderItems' },
      { name: 'Requisitions',      href: '/Admin/ERP/PurchaseRequisitions' },
      { name: 'RFQs',              href: '/Admin/ERP/RFQs' },
      { name: 'GRN',               href: '/Admin/ERP/GRN' },
      { name: 'Suppliers',         href: '/Admin/ERP/Suppliers' },
    );
  }
  if (procChildren.length) nav.push({ key: 'procurement', name: 'Procurement', icon: 'FolderIcon', children: procChildren });

  // ── Sales ──────────────────────────────────────────────────────────────────
  const salesChildren = [];
  if (allowed.has('sales-orders') || allowed.has('inventory')) {
    salesChildren.push(
      { name: 'Sales Orders',      href: '/Admin/ERP/SalesOrders' },
      { name: 'Sales Quotations',  href: '/Admin/ERP/SalesQuotations' },
      { name: 'Delivery Challans', href: '/Admin/ERP/DeliveryChallans' },
      { name: 'Sales Returns',     href: '/Admin/ERP/SalesReturns' },
      { name: 'Sell',              href: '/Admin/ERP/Sell' },
      { name: 'Customers',         href: '/Admin/ERP/Customers' },
    );
  }
  if (salesChildren.length) nav.push({ key: 'sales', name: 'Sales', icon: 'FolderIcon', children: salesChildren });

  // ── Finance & Accounting ───────────────────────────────────────────────────
  const finChildren = [];
  if (allowed.has('finance') || allowed.has('inventory')) {
    finChildren.push(
      { name: 'Chart of Accounts',  href: '/Admin/ERP/ChartOfAccounts' },
      { name: 'Financial Years',    href: '/Admin/ERP/FinancialYears' },
      { name: 'Invoice Matching',   href: '/Admin/ERP/InvoiceMatching' },
      { name: 'Currencies',         href: '/Admin/ERP/Currencies' },
      { name: 'Expenses',           href: '/Admin/ERP/Expenses' },
      { name: 'Purchase Returns',   href: '/Admin/ERP/PurchaseReturns' },
    );
  }
  if (finChildren.length) nav.push({ key: 'finance', name: 'Finance', icon: 'FolderIcon', children: finChildren });

  // ── Production ─────────────────────────────────────────────────────────────
  if (allowed.has('inventory') || allowed.has('production')) {
    nav.push({
      key: 'production', name: 'Production', icon: 'FolderIcon',
      children: [
        { name: 'Bill of Materials', href: '/Admin/ERP/BOM' },
        { name: 'Production Orders', href: '/Admin/ERP/ProductionOrders' },
      ],
    });
  }

  // ── Approvals ──────────────────────────────────────────────────────────────
  if (allowed.has('inventory') || allowed.has('approvals')) {
    nav.push({
      key: 'approvals', name: 'Approvals', icon: 'FolderIcon',
      children: [{ name: 'Approval Requests', href: '/Admin/ERP/Approvals' }],
    });
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  if (allowed.has('inventory') || allowed.has('documents')) {
    nav.push({ key: 'documents', name: 'Documents', href: '/Admin/ERP/Documents', icon: 'FolderIcon' });
  }

  // ── HR & Admin ─────────────────────────────────────────────────────────────
  const hrChildren = [];
  if (allowed.has('users'))   hrChildren.push({ name: 'Users',      href: '/Admin/HR/Users' });
  if (allowed.has('users'))   hrChildren.push({ name: 'Org Chart',  href: '/Admin/HR/OrgChart' });
  if (allowed.has('company')) hrChildren.push({ name: 'Companies',  href: '/Admin/HR/Companies' });
  if (allowed.has('roles'))   hrChildren.push({ name: 'Roles',      href: '/Admin/HR/Roles' });
  if (allowed.has('roles'))   hrChildren.push({ name: 'User Types', href: '/Admin/HR/UserTypes' });
  if (hrChildren.length) nav.push({ key: 'hr', name: 'HR & Admin', icon: 'FolderIcon', children: hrChildren });

  // ── Reports ────────────────────────────────────────────────────────────────
  if (allowed.has('reports')) nav.push({ key: 'reports', name: 'Reports', href: '/Admin/Reports', icon: 'FolderIcon' });

  // ── Chat ───────────────────────────────────────────────────────────────────
  if (allowed.has('chat')) nav.push({ key: 'chat', name: 'Chat', href: '/Admin/Chat', icon: 'FolderIcon' });

  // ── Settings (always visible) ──────────────────────────────────────────────
  nav.push({
    key: 'settings', name: 'Settings', icon: 'FolderIcon',
    children: [
      { name: 'Profile',         href: '/Admin/profile' },
      { name: 'App Settings',    href: '/Admin/settings' },
      { name: 'Import / Export', href: '/Admin/ERP/ImportExport' },
    ],
  });

  return nav;
}

module.exports = {
  getMyModules,
  getUserModules,
  assignModulesToUser,
  resetUserModules,
  getAvailableModules,
};
