/**
 * Centralized Permission Checker
 * 
 * Single `can()` function used across all routes/controllers for RBAC enforcement.
 * Replaces scattered roleId === N checks throughout the codebase.
 * 
 * Usage:
 *   const { can } = require('./utils/permissionChecker');
 *   
 *   // In middleware:
 *   can(user, 'users:view')            // -> boolean
 *   can(user, 'users:edit', { companyId: 5 }) // with scope
 *   
 *   // Throwing variant:
 *   can(req.user, 'products:delete') || res.status(403).json(...)
 */

const { appPool } = require('../config/db');

// ── Constants ──────────────────────────────────────────────────────────

const SUPER_ADMIN_ID = 1;
const ADMIN_ID = 2;
const MANAGER_ID = 3;
const EMPLOYEE_ID = 4;
const CUSTOMER_ID = 5;

/**
 * Parses a permission string like "users:view" into { resource, action }
 */
const parsePermission = (perm) => {
  const [resource, action] = perm.split(':');
  return { resource, action: action || 'view' };
};

/**
 * Default permissions for roles without custom overrides.
 */
const ROLE_DEFAULTS = {
  [MANAGER_ID]: {
    dashboard: ['view', 'export'],
    users: ['view', 'edit'],           // team-scoped
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
  },
  [EMPLOYEE_ID]: {
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
  [CUSTOMER_ID]: {
    salesOrders: ['view'],
    invoices: ['view'],
    customers: ['view'],
    notifications: ['view'],
  },
};

/**
 * Customer-allowed modules — hardcoded, cannot be overridden.
 */
const CUSTOMER_ALLOWED_MODULES = {
  'sales-orders': ['view'],
  'invoices': ['view'],
  'customers': ['view'],
};

// ── Cache ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const permCache = new Map();

const getCached = (roleId) => {
  const entry = permCache.get(Number(roleId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    permCache.delete(Number(roleId));
    return null;
  }
  return entry;
};

const invalidateCache = (roleId) => {
  permCache.delete(Number(roleId));
};

// ── Permission Resolution ──────────────────────────────────────────────

/**
 * Resolve the effective permissions for a user.
 * Returns { permissions: Object|null, roleName: string, companyId: number|null }
 * permissions = null means "full access" (superadmin/admin without overrides)
 */
const resolvePermissions = async (user) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);

  // Superadmin — full access
  if (roleId === SUPER_ADMIN_ID) {
    return { permissions: null, roleName: 'superadmin', companyId: null };
  }

  // Customer — locked to allowed modules
  if (roleId === CUSTOMER_ID) {
    return { permissions: CUSTOMER_ALLOWED_MODULES, roleName: 'customer', companyId: null };
  }

  // Fetch role from DB with caching
  const cached = getCached(roleId);
  if (cached) return cached;

  const result = await appPool.query(
    `SELECT "Permissions", "RoleName", "CompanyId"
     FROM "Roles"
     WHERE "Id" = $1 AND COALESCE("IsDeleted", FALSE) = FALSE AND "IsActive" = TRUE`,
    [roleId]
  );

  if (result.rows.length === 0) {
    return { permissions: {}, roleName: null, companyId: null };
  }

  const row = result.rows[0];
  const dbPerms = row.Permissions;
  const hasCustom = dbPerms !== null && typeof dbPerms === 'object' && Object.keys(dbPerms).length > 0;

  let resolved;
  if (roleId === ADMIN_ID) {
    resolved = hasCustom ? dbPerms : null; // null = full access
  } else if (roleId === MANAGER_ID || roleId === EMPLOYEE_ID) {
    resolved = hasCustom ? dbPerms : (ROLE_DEFAULTS[roleId] || {});
  } else {
    resolved = {};
  }

  const entry = {
    permissions: resolved,
    roleName: row.RoleName,
    companyId: row.CompanyId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  permCache.set(roleId, entry);
  return entry;
};

/**
 * Check if a resolved permissions object grants access to a given resource+action.
 */
const hasPermission = (permissions, resource, action) => {
  if (permissions === null) return true; // full access
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;

  if (Array.isArray(resourcePerms)) {
    return resourcePerms.includes(action);
  }
  // Object format { view: true, create: false }
  return resourcePerms[action] === true;
};

// ── Main API ───────────────────────────────────────────────────────────

/**
 * Central permission check.
 * 
 * @param {Object} user - The user object (from req.user or decoded token)
 * @param {string} permission - Permission string like "users:view" or "products:create"
 * @param {Object} [options] - Optional context
 * @param {number} [options.companyId] - Company for scope checking
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
const can = async (user, permission, options = {}) => {
  if (!user) {
    return { allowed: false, reason: 'No user provided' };
  }

  const { resource, action } = parsePermission(permission);
  const effective = await resolvePermissions(user);

  if (!effective.roleName) {
    return { allowed: false, reason: 'Role not found or inactive' };
  }

  const { permissions } = effective;

  if (!hasPermission(permissions, resource, action)) {
    return {
      allowed: false,
      reason: `Missing "${action}" permission for "${resource}"`,
    };
  }

  return { allowed: true };
};

/**
 * Synchronous permission check for cases where permissions are already resolved.
 * 
 * @param {Object} permissions - Resolved permissions object (or null for full access)
 * @param {string} resource - Resource key (e.g., 'users', 'products')
 * @param {string} action - Action key (e.g., 'view', 'create')
 * @returns {boolean}
 */
const canSync = (permissions, resource, action) => {
  return hasPermission(permissions, resource, action);
};

/**
 * Express middleware factory. Returns middleware that checks permission.
 * 
 * @param {string} permission - Permission string (e.g., "users:view")
 * @param {Object} [options]
 * @returns {Function} Express middleware
 */
const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await can(req.user, permission, options);

      if (!result.allowed) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔒 RBAC: Denied "${permission}" for user ${req.user.userId || req.user.UserId}`);
        }
        return res.status(403).json({ message: result.reason || 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};

/**
 * Get the effective permissions for a user (useful for frontend).
 * 
 * @param {Object} user
 * @returns {Promise<{ permissions: Object|null, roleId: number, roleName: string }>}
 */
const getEffectivePermissions = async (user) => {
  const effective = await resolvePermissions(user);
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  return {
    permissions: effective.permissions,
    roleId,
    roleName: effective.roleName,
    companyId: effective.companyId,
  };
};

// ── Exports ────────────────────────────────────────────────────────────

module.exports = {
  can,
  canSync,
  requirePermission,
  getEffectivePermissions,
  invalidateCache,
  resolvePermissions,
  hasPermission,
  parsePermission,
  // Constants for external use
  SUPER_ADMIN_ID,
  ADMIN_ID,
  MANAGER_ID,
  EMPLOYEE_ID,
  CUSTOMER_ID,
};