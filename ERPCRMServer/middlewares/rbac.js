/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * Complete rewrite implementing the 5-role permission system:
 *   1 = superadmin, 2 = admin, 3 = manager, 4 = employee, 5 = customer
 * 
 * Implements priority chain, custom permission overrides, role defaults,
 * customer lockdown, and a cache with TTL.
 */

const { appPool } = require('../config/db');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/**
 * Map HTTP methods to action names used in the permissions JSON.
 */
const METHOD_TO_ACTION = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

/**
 * Map URL path prefixes to module keys.
 */
const URL_TO_MODULE = [
  // ── CRM ──
  { pattern: '/api/crm/accounts', module: 'accounts' },
  { pattern: '/api/crm/contacts', module: 'contacts' },
  { pattern: '/api/crm/leads', module: 'leads' },
  { pattern: '/api/crm/opportunities', module: 'opportunities' },
  { pattern: '/api/crm/opportunity-products', module: 'opportunityProducts' },
  { pattern: '/api/crm/activities', module: 'activities' },
  { pattern: '/api/crm/quotes', module: 'quotes' },
  { pattern: '/api/crm/invoices', module: 'invoices' },
  { pattern: '/api/crm/payments', module: 'payments' },
  { pattern: '/api/crm/retentions', module: 'retentions' },
  { pattern: '/api/crm/presales', module: 'presales' },
  { pattern: '/api/crm/cases', module: 'cases' },
  { pattern: '/api/crm/task-types', module: 'settings' },
  { pattern: '/api/crm/sales-stages', module: 'settings' },
  { pattern: '/api/crm/industries', module: 'settings' },
  { pattern: '/api/crm/followup-types', module: 'settings' },
  { pattern: '/api/crm/lead-sources', module: 'settings' },
  { pattern: '/api/crm/comments', module: 'comments' },
  { pattern: '/api/crm/assignments', module: 'assignments' },
  { pattern: '/api/crm/visibility', module: 'visibility' },
  { pattern: '/api/crm/groups', module: 'groups' },
  { pattern: '/api/crm/group-members', module: 'groupMembers' },

  // ── Inventory ──
  { pattern: '/api/products', module: 'products' },
  { pattern: '/api/productcategory', module: 'productCategory' },
  { pattern: '/api/units', module: 'units' },
  { pattern: '/api/warehouses', module: 'warehouses' },
  { pattern: '/api/product-stock', module: 'productStock' },
  { pattern: '/api/stock-movements', module: 'stockMovements' },
  { pattern: '/api/purchase-orders', module: 'purchaseOrders' },
  { pattern: '/api/purchase-order-items', module: 'purchaseOrderItems' },
  { pattern: '/api/sales-orders', module: 'salesOrders' },
  { pattern: '/api/suppliers', module: 'suppliers' },
  { pattern: '/api/customers', module: 'customers' },
  { pattern: '/api/taxes', module: 'taxes' },
  { pattern: '/api/product-tax-map', module: 'productTaxMap' },
  { pattern: '/api/profit-loss-reports', module: 'profitLossReports' },
  { pattern: '/api/brands', module: 'brands' },
  { pattern: '/api/stock-transfers', module: 'stockTransfers' },
  { pattern: '/api/stock-adjustments', module: 'stockAdjustments' },
  { pattern: '/api/grn', module: 'grn' },
  { pattern: '/api/batches', module: 'batches' },
  { pattern: '/api/serial-numbers', module: 'serialNumbers' },
  { pattern: '/api/erp', module: 'erp' },

  // ── User / Auth (needed for profile/settings) ──
  { pattern: '/api/users', module: 'users' },
  { pattern: '/api/profile', module: 'users' },
  { pattern: '/api/company', module: 'company' },
  { pattern: '/api/roles', module: 'roles' },
  { pattern: '/api/usertypes', module: 'userTypes' },
  { pattern: '/api/audit-logs', module: 'auditLogs' },
];

/**
 * Routes/paths that should be excluded from RBAC checks.
 * These are typically public or authentication endpoints.
 */
const EXCLUDED_PATHS = [
  '/users/login',
  '/users/register',
  '/users/forgot-password',
  '/users/reset-password',
  '/users/register/send-otp',
  '/users/verify-otp',
  '/token/refresh-token',
  '/token/logout',
  '/health',
  '/metrics',
  '/uploads',
  '/monitoring/execution-log',
];

/**
 * Customer-allowed modules and actions.
 * Customers can ONLY access what is listed here — always read-only.
 * roleId === 5 is locked to this set regardless of DB contents.
 */
const CUSTOMER_ALLOWED_MODULES = {
  'sales-orders': ['view'],
  'invoices': ['view'],
  'customers': ['view'], // own profile only — controller handles scoping
};

/**
 * Default permission sets for roles without custom permissions in DB.
 * Used when Roles.Permissions is null/empty for roleId 3 or 4.
 */
const ROLE_DEFAULTS = {
  3: { view: true, create: true, edit: true, delete: false, export: false },  // manager
  4: { view: true, create: true, edit: false, delete: false, export: false }, // employee
  5: { view: true, create: false, edit: false, delete: false, export: false }, // customer — view own data only
};

/**
 * Map roleName strings to their numeric roleId.
 * Used as fallback when req.user.roleId is falsy.
 */
const ROLE_NAME_TO_ID = {
  superadmin: 1,
  admin: 2,
  manager: 3,
  employee: 4,
  customer: 5,
};

// ──────────────────────────────────────────────
// In-memory role permissions cache with TTL
// ──────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<number, { permissions: Object|null, roleName: string, expiresAt: number }>} */
const rolePermissionsCache = new Map();

/**
 * Get cached role permissions for a given roleId.
 * Returns null if not cached or expired.
 */
const getCachedRolePermissions = (roleId) => {
  const entry = rolePermissionsCache.get(Number(roleId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rolePermissionsCache.delete(Number(roleId));
    return null;
  }
  return entry;
};

/**
 * Invalidate the cache entry for a given roleId.
 * Call this after updating a role's permissions in the DB.
 *
 * @param {number} roleId
 */
const invalidateRoleCache = (roleId) => {
  rolePermissionsCache.delete(Number(roleId));
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🗑️ RBAC Cache: Invalidated roleId ${roleId}`);
  }
};

/**
 * Internal: fetch role row from DB (with caching).
 * Returns { permissions, roleName, companyId } or null.
 */
const fetchRoleRow = async (roleId) => {
  const numericId = Number(roleId);

  // Try cache first
  const cached = getCachedRolePermissions(numericId);
  if (cached) {
    return cached;
  }

  // Fetch from DB
  const result = await appPool.query(
    `SELECT "Permissions", "RoleName", "CompanyId"
     FROM "Roles"
     WHERE "Id" = $1 AND COALESCE("IsDeleted", FALSE) = FALSE AND "IsActive" = TRUE`,
    [numericId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const entry = {
    permissions: row.Permissions,
    roleName: row.RoleName,
    companyId: row.CompanyId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  // Store in cache
  rolePermissionsCache.set(numericId, entry);

  return entry;
};

// ──────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────

/**
 * Extract the module key from a URL path by matching against known patterns.
 * Returns null if no mapping is found.
 */
const getModuleFromPath = (path) => {
  for (const mapping of URL_TO_MODULE) {
    if (path.startsWith(mapping.pattern)) {
      return mapping.module;
    }
  }
  return null;
};

/**
 * Extract the action from the HTTP method.
 * 'export' is a special action that maps to GET requests on /api/utils/export
 * 'import' is a special action that maps to POST requests on /api/utils/import
 */
const getActionFromMethod = (method, path) => {
  if (path.startsWith('/api/utils/export')) return 'export';
  if (path.startsWith('/api/utils/import')) return 'import';
  return METHOD_TO_ACTION[method] || 'view';
};

/**
 * Check if a path should be excluded from RBAC.
 */
const isExcludedPath = (path) => {
  return EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
};

/**
 * Resolve the effective roleId from req.user.
 * Falls back to ROLE_NAME_TO_ID if roleId is falsy but roleName exists.
 *
 * @param {Object} user - req.user object
 * @returns {number|null}
 */
const resolveRoleId = (user) => {
  if (user.roleId) return Number(user.roleId);
  if (user.roleName) {
    const mapped = ROLE_NAME_TO_ID[user.roleName.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
};

/**
 * Resolve the effective permissions for a given role, applying the full
 * priority chain:
 *
 *   1. superadmin (roleId=1) → full access (return null = bypass)
 *   2. customer (roleId=5)   → CUSTOMER_ALLOWED_MODULES only
 *   3. admin (roleId=2)      → custom DB permissions if non-null/non-empty, else full access
 *   4. manager/employee (3/4)→ custom DB permissions if non-null/non-empty, else ROLE_DEFAULTS
 *
 * @param {number} roleId
 * @returns {Promise<{ resolvedPermissions: Object|null, isSuperAdmin: boolean, roleName: string|null, companyId: number|null }>}
 *   resolvedPermissions = null means "full access" (superadmin or admin without overrides)
 */
const resolveEffectivePermissions = async (roleId) => {
  const numericId = Number(roleId);

  // Priority 1: superadmin
  if (numericId === 1) {
    return {
      resolvedPermissions: null, // full access
      isSuperAdmin: true,
      roleName: 'superadmin',
      companyId: null,
    };
  }

  // Priority 2: customer — always locked to CUSTOMER_ALLOWED_MODULES
  if (numericId === 5) {
    return {
      resolvedPermissions: CUSTOMER_ALLOWED_MODULES,
      isSuperAdmin: false,
      roleName: 'customer',
      companyId: null,
    };
  }

  // Fetch role row from DB (with cache)
  const roleRow = await fetchRoleRow(numericId);

  if (!roleRow) {
    // Role not found/inactive
    return {
      resolvedPermissions: null,
      isSuperAdmin: false,
      roleName: null,
      companyId: null,
    };
  }

  const dbPermissions = roleRow.permissions;
  const hasCustomPermissions = dbPermissions !== null && dbPermissions !== undefined &&
    typeof dbPermissions === 'object' && Object.keys(dbPermissions).length > 0;

  // Priority 3: admin
  if (numericId === 2) {
    if (hasCustomPermissions) {
      // Superadmin has overridden this admin's permissions
      return {
        resolvedPermissions: dbPermissions,
        isSuperAdmin: false,
        roleName: roleRow.roleName,
        companyId: roleRow.companyId,
      };
    }
    // No custom permissions → full access within company scope
    return {
      resolvedPermissions: null, // full access
      isSuperAdmin: false,
      roleName: roleRow.roleName,
      companyId: roleRow.companyId,
    };
  }

  // Priority 4: manager (3) or employee (4)
  if (numericId === 3 || numericId === 4) {
    if (hasCustomPermissions) {
      // Custom permissions assigned by superadmin or admin
      return {
        resolvedPermissions: dbPermissions,
        isSuperAdmin: false,
        roleName: roleRow.roleName,
        companyId: roleRow.companyId,
      };
    }
    // Fall back to ROLE_DEFAULTS
    return {
      resolvedPermissions: ROLE_DEFAULTS[numericId] || {},
      isSuperAdmin: false,
      roleName: roleRow.roleName,
      companyId: roleRow.companyId,
    };
  }

  // Unknown roleId — deny
  return {
    resolvedPermissions: {},
    isSuperAdmin: false,
    roleName: roleRow ? roleRow.roleName : null,
    companyId: roleRow ? roleRow.companyId : null,
  };
};

/**
 * Check whether a given role has the requested module+action permission
 * according to the resolved permissions map.
 *
 * @param {Object} resolvedPermissions - The effective permissions object (or null for full access)
 * @param {string} moduleKey
 * @param {string} action
 * @returns {boolean}
 */
const hasModulePermission = (resolvedPermissions, moduleKey, action) => {
  // null = full access (superadmin or unrestricted admin)
  if (resolvedPermissions === null) return true;

  const modulePerms = resolvedPermissions[moduleKey];
  if (!modulePerms) return false;

  // modulePerms could be an object like { view: true } or an array like ['view']
  if (Array.isArray(modulePerms)) {
    return modulePerms.includes(action);
  }

  // Object format e.g. { view: true, create: false }
  return modulePerms[action] === true;
};

/**
 * Validate that the assigner has permission to assign custom permissions to the target role.
 *
 * Rules:
 *  - superadmin (1) can assign to roleId 2, 3, 4 across any company
 *  - admin (2) can assign to roleId 3, 4 only within same companyId
 *  - admin (2) CANNOT assign to another admin (roleId 2)
 *  - admin (2) cannot grant permission they themselves don't have
 *  - nobody can assign to customer (roleId 5)
 *  - nobody can assign to superadmin (roleId 1)
 *
 * @param {number} assignerRoleId
 * @param {number} targetRoleId
 * @param {number} [assignerCompanyId]
 * @param {number} [targetCompanyId]
 * @returns {{ allowed: boolean, reason?: string }}
 */
const canAssignPermissions = (assignerRoleId, targetRoleId, assignerCompanyId, targetCompanyId) => {
  const assigner = Number(assignerRoleId);
  const target = Number(targetRoleId);

  // Nobody can assign to superadmin
  if (target === 1) {
    return { allowed: false, reason: 'Cannot modify superadmin permissions' };
  }

  // Nobody can assign to customer
  if (target === 5) {
    return { allowed: false, reason: 'Customers cannot have custom permissions' };
  }

  // superadmin can assign to admin, manager, employee across any company
  if (assigner === 1) {
    return { allowed: true };
  }

  // admin can assign to manager and employee only within same company
  if (assigner === 2) {
    if (target === 2) {
      return { allowed: false, reason: 'Admin cannot modify another admin\'s permissions' };
    }
    if (target === 3 || target === 4) {
      if (assignerCompanyId && targetCompanyId && Number(assignerCompanyId) !== Number(targetCompanyId)) {
        return { allowed: false, reason: 'Admin can only assign permissions within their own company' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Admin can only assign permissions to managers and employees' };
  }

  // manager/employee/customer cannot assign permissions
  return { allowed: false, reason: 'You do not have permission to assign roles' };
};

// ──────────────────────────────────────────────
// Middleware: checkAssignPermission
// ──────────────────────────────────────────────

/**
 * Middleware for the roles update route (PUT /api/roles/:id).
 * Validates that the authenticated user can assign/update permissions
 * for the target role.
 *
 * Steps:
 *  1. Fetch target role's roleId from DB using req.params.id
 *  2. Call canAssignPermissions() with req.user vs target
 *  3. If admin is assigning, validate every granted permission
 *     is also in the admin's own current Permissions JSON
 *  4. If valid → next(); else 403 with reason
 */
const checkAssignPermission = async (req, res, next) => {
  try {
    const targetRoleId = Number(req.params.id);

    if (!targetRoleId) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    // Fetch target role row from DB
    const roleRow = await fetchRoleRow(targetRoleId);
    if (!roleRow) {
      return res.status(404).json({ message: 'Role not found or inactive' });
    }

    // Resolve assigner's roleId
    const assignerRoleId = resolveRoleId(req.user);
    if (!assignerRoleId) {
      return res.status(403).json({ message: 'Forbidden: No role assigned to you' });
    }

    // Get target companyId from the role row OR from the request body/target user
    const targetCompanyId = roleRow.companyId || req.body.companyId || null;
    const assignerCompanyId = req.user.companyId || null;

    // Check assignment rules
    const assignmentCheck = canAssignPermissions(
      assignerRoleId,
      targetRoleId,
      assignerCompanyId,
      targetCompanyId
    );

    if (!assignmentCheck.allowed) {
      return res.status(403).json({ message: assignmentCheck.reason });
    }

    // If admin is assigning, validate no privilege escalation
    if (assignerRoleId === 2) {
      const permissionsBeingGranted = req.body.permissions;
      if (permissionsBeingGranted && typeof permissionsBeingGranted === 'object' && Object.keys(permissionsBeingGranted).length > 0) {
        // Fetch admin's own effective permissions
        const adminPerms = await resolveEffectivePermissions(assignerRoleId);
        const adminPermissions = adminPerms.resolvedPermissions;

        // Admin without custom permissions has full access — no escalation check needed
        if (adminPermissions !== null) {
          for (const [moduleKey, moduleActions] of Object.entries(permissionsBeingGranted)) {
            // Check each action being granted
            const actionsToCheck = typeof moduleActions === 'object'
              ? (Array.isArray(moduleActions) ? moduleActions : Object.keys(moduleActions).filter(a => moduleActions[a] === true))
              : [moduleActions];

            for (const action of actionsToCheck) {
              if (!hasModulePermission(adminPermissions, moduleKey, action)) {
                return res.status(403).json({
                  message: `Cannot grant "${action}" on "${moduleKey}": you do not have this permission yourself`,
                });
              }
            }
          }
        }
      }
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('checkAssignPermission middleware error:', error);
    return res.status(500).json({ message: 'Server error during authorization check' });
  }
};

// ──────────────────────────────────────────────
// Middleware: checkPermission (per-route)
// ──────────────────────────────────────────────

/**
 * Middleware factory: Returns middleware that checks if the authenticated user's role
 * has permission for the specified module and action.
 *
 * @param {string} moduleKey - The module key (e.g., 'products', 'users', 'leads')
 * @param {string} action - The action (e.g., 'view', 'create', 'edit', 'delete', 'export')
 * @returns {Function} Express middleware
 */
const checkPermission = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const roleId = resolveRoleId(req.user);

      // Super admin (roleId = 1) gets full access to everything
      if (Number(roleId) === 1) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ RBAC: Super admin bypass for ${req.method} ${req.path}`);
        }
        return next();
      }

      if (!roleId) {
        console.warn(`⚠️ RBAC: No role assigned for user ${req.user.UserId} on ${req.path}`);
        return res.status(403).json({ message: 'Forbidden: No role assigned' });
      }

      // Resolve effective permissions using the full priority chain
      const effective = await resolveEffectivePermissions(roleId);

      if (!effective.roleName) {
        console.warn(`⚠️ RBAC: Role ${roleId} not found or inactive for ${req.path}`);
        return res.status(403).json({ message: 'Forbidden: Role not found or inactive' });
      }

      const { resolvedPermissions } = effective;

      // Check if the role has the required module+action permission
      if (!hasModulePermission(resolvedPermissions, moduleKey, action)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `🔒 RBAC: Role "${effective.roleName}" (ID: ${roleId}) denied "${action}" access to module "${moduleKey}" on ${req.path}`
          );
        }
        return res.status(403).json({
          message: `Forbidden: Missing "${action}" permission for module "${moduleKey}"`,
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `✅ RBAC: Role "${effective.roleName}" (ID: ${roleId}) granted ${action} access to ${moduleKey} for ${req.path}`
        );
      }
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ message: 'Server error during authorization check' });
    }
  };
};

// ──────────────────────────────────────────────
// Middleware: rbacMiddleware (global)
// ──────────────────────────────────────────────

/**
 * Global RBAC middleware: Automatically determines the module and action from the
 * request URL and HTTP method, then checks permissions.
 *
 * Use this as a global middleware applied to all /api/* routes after authentication.
 *
 * Implements the full permission priority chain:
 *   1. superadmin → full access (bypass)
 *   2. customer   → CUSTOMER_ALLOWED_MODULES only
 *   3. admin      → custom DB permissions or full access
 *   4. manager/employee → custom DB permissions or ROLE_DEFAULTS
 */
const rbacMiddleware = async (req, res, next) => {
  try {
    // Skip RBAC for OPTIONS (CORS preflight) requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Skip RBAC for excluded paths (public endpoints, auth endpoints, etc.)
    if (isExcludedPath(req.path)) {
      return next();
    }

    // If user is not authenticated (no token), skip RBAC check.
    // The route's own auth middleware (verifyAccessToken) will handle authentication.
    if (!req.user) {
      return next();
    }

    // Priority 1: Super admin (roleId = 1) bypasses ALL RBAC checks — always.
    const roleId = resolveRoleId(req.user);
    if (Number(roleId) === 1) {
      return next();
    }

    // Resolve module key from request path
    const moduleKey = getModuleFromPath(req.path);
    if (!moduleKey) {
      // If no module mapping found, allow the request (fallback to existing behavior)
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ RBAC: No module mapping for path: ${req.path}`);
      }
      return next();
    }

    // Determine action from HTTP method
    const action = getActionFromMethod(req.method, req.path);

    // Guard: roleId must be resolvable
    if (!roleId) {
      console.warn(`⚠️ RBAC: User has no role assigned for ${req.path}`);
      return res.status(403).json({ message: 'Forbidden: No role assigned' });
    }

    // Resolve effective permissions using the full priority chain
    const effective = await resolveEffectivePermissions(roleId);

    if (!effective.roleName) {
      console.warn(`⚠️ RBAC: Role ${roleId} not found for user ${req.user.UserId} on ${req.path}`);
      return res.status(403).json({ message: 'Forbidden: Role not found' });
    }

    const { resolvedPermissions, companyId } = effective;

    // Admin company scope enforcement — tag the request for controllers
    if (Number(roleId) === 2 && resolvedPermissions === null) {
      // Admin with full access (no custom overrides) — tag with company scope
      const userCompanyId = req.user.companyId || companyId;
      if (userCompanyId) {
        req.rbac = { companyScoped: true, companyId: userCompanyId };
      }
    }

    // Check if the role has the required module+action permission
    if (!hasModulePermission(resolvedPermissions, moduleKey, action)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `🔒 RBAC: Role "${effective.roleName}" (ID: ${roleId}) denied "${action}" action on "${moduleKey}" for ${req.path}`
        );
      }
      return res.status(403).json({
        message: `Forbidden: Missing "${action}" permission for "${moduleKey}"`,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `✅ RBAC: Role "${effective.roleName}" (ID: ${roleId}) granted ${action} access to ${moduleKey} for ${req.method} ${req.path}`
      );
    }
    next();
  } catch (error) {
    console.error('RBAC global middleware error:', error);
    return res.status(500).json({ message: 'Server error during authorization check' });
  }
};

// ──────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────

module.exports = {
  checkPermission,
  rbacMiddleware,
  getModuleFromPath,
  URL_TO_MODULE,
  checkAssignPermission,
  canAssignPermissions,
  invalidateRoleCache,
};