/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * Supports both 5-role system and 20-role seeder system:
 *   1 = superadmin, 2 = admin, 3 = manager, 4 = employee, 5 = customer
 *   6-20 = roles from 004_seed_role_permissions.js seeder
 * 
 * Permission resolution priority:
 *   1. superadmin (1) → full access
 *   2. customer (5)   → CUSTOMER_ALLOWED_MODULES only
 *   3. admin (2)      → custom DB permissions or full access
 *   4. manager/employee (3/4) → custom DB permissions or ROLE_DEFAULTS
 *   5. roles 6-20     → custom DB permissions if assigned by seeder, else fallback defaults
 */

const { appPool } = require('../config/db');
const {
  ROLE_IDS,
  ROLE_NAMES,
  ROLE_DEFAULTS,
  CUSTOMER_ALLOWED_MODULES,
  resolveRoleId,
  normalizeRoleName,
} = require('../config/roleConfig');

const METHOD_TO_ACTION = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

const URL_TO_MODULE = [
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
  { pattern: '/api/users', module: 'users' },
  { pattern: '/api/profile', module: 'users' },
  { pattern: '/api/company', module: 'company' },
  { pattern: '/api/roles', module: 'roles' },
  { pattern: '/api/usertypes', module: 'userTypes' },
  { pattern: '/api/audit-logs', module: 'auditLogs' },
];

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

// Fallback defaults for seeder roles 6-20 when no custom permissions are assigned
const SEEDER_ROLE_DEFAULTS = {
  6:  { view: true, create: true, edit: false, delete: false, export: false },
  7:  { view: true, create: true, edit: false, delete: false, export: false },
  8:  { view: true, create: true, edit: false, delete: false, export: false },
  9:  { view: true, create: true, edit: false, delete: false, export: false },
  10: { view: true, create: true, edit: false, delete: false, export: false },
  11: { view: true, create: false, edit: false, delete: false, export: false },
  12: { view: true, create: false, edit: false, delete: false, export: false },
  13: { view: true, create: true, edit: false, delete: false, export: false },
  14: { view: true, create: true, edit: false, delete: false, export: false },
  15: { view: true, create: true, edit: false, delete: false, export: false },
  16: { view: true, create: true, edit: false, delete: false, export: false },
  17: { view: true, create: true, edit: false, delete: false, export: false },
  18: { view: true, create: true, edit: false, delete: false, export: false },
  19: { view: true, create: true, edit: false, delete: false, export: false },
  20: { view: true, create: false, edit: false, delete: false, export: false },
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const rolePermissionsCache = new Map();

const getCachedRolePermissions = (roleId) => {
  const entry = rolePermissionsCache.get(Number(roleId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rolePermissionsCache.delete(Number(roleId));
    return null;
  }
  return entry;
};

const invalidateRoleCache = (roleId) => {
  rolePermissionsCache.delete(Number(roleId));
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🗑️ RBAC Cache: Invalidated roleId ${roleId}`);
  }
};

const fetchRoleRow = async (roleId) => {
  const numericId = Number(roleId);
  const cached = getCachedRolePermissions(numericId);
  if (cached) return cached;

  const result = await appPool.query(
    `SELECT "Permissions", "RoleName", "CompanyId"
     FROM "Roles"
     WHERE "Id" = $1 AND COALESCE("IsDeleted", FALSE) = FALSE AND "IsActive" = TRUE`,
    [numericId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const entry = {
    permissions: row.Permissions,
    roleName: row.RoleName,
    companyId: row.CompanyId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  rolePermissionsCache.set(numericId, entry);
  return entry;
};

const getModuleFromPath = (path) => {
  for (const mapping of URL_TO_MODULE) {
    if (path.startsWith(mapping.pattern)) return mapping.module;
  }
  return null;
};

const getActionFromMethod = (method, path) => {
  if (path.startsWith('/api/utils/export')) return 'export';
  if (path.startsWith('/api/utils/import')) return 'import';
  return METHOD_TO_ACTION[method] || 'view';
};

const isExcludedPath = (path) => {
  return EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
};

const resolveEffectivePermissions = async (roleId) => {
  const numericId = Number(roleId);

  if (numericId === ROLE_IDS.SUPERADMIN) {
    return { resolvedPermissions: null, isSuperAdmin: true, roleName: ROLE_NAMES[ROLE_IDS.SUPERADMIN], companyId: null };
  }

  if (numericId === ROLE_IDS.CUSTOMER) {
    return { resolvedPermissions: CUSTOMER_ALLOWED_MODULES, isSuperAdmin: false, roleName: ROLE_NAMES[ROLE_IDS.CUSTOMER], companyId: null };
  }

  const roleRow = await fetchRoleRow(numericId);
  if (!roleRow) {
    return { resolvedPermissions: null, isSuperAdmin: false, roleName: null, companyId: null };
  }

  const dbPermissions = roleRow.permissions;
  const hasCustomPermissions = dbPermissions !== null && dbPermissions !== undefined &&
    typeof dbPermissions === 'object' && Object.keys(dbPermissions).length > 0;

  if (numericId === ROLE_IDS.ADMIN) {
    if (hasCustomPermissions) {
      return { resolvedPermissions: dbPermissions, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
    }
    return { resolvedPermissions: null, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
  }

  if (numericId === ROLE_IDS.MANAGER || numericId === ROLE_IDS.EMPLOYEE) {
    if (hasCustomPermissions) {
      return { resolvedPermissions: dbPermissions, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
    }
    return { resolvedPermissions: ROLE_DEFAULTS[numericId] || {}, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
  }

  if (numericId >= 6 && numericId <= 20) {
    if (hasCustomPermissions) {
      return { resolvedPermissions: dbPermissions, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
    }
    return { resolvedPermissions: SEEDER_ROLE_DEFAULTS[numericId] || { view: true }, isSuperAdmin: false, roleName: roleRow.roleName, companyId: roleRow.companyId };
  }

  return { resolvedPermissions: {}, isSuperAdmin: false, roleName: roleRow ? roleRow.roleName : null, companyId: roleRow ? roleRow.companyId : null };
};

const hasModulePermission = (resolvedPermissions, moduleKey, action) => {
  if (resolvedPermissions === null) return true;

  const modulePerms = resolvedPermissions[moduleKey];

  // If the module key is not found BUT the resolvedPermissions
  // has top-level action keys (e.g. { view: true, create: true }),
  // treat as flat permissions that apply to ALL modules.
  if (!modulePerms) {
    // Check if resolvedPermissions itself is flat (action-level)
    const hasActionKeys = ['view', 'create', 'edit', 'delete', 'export', 'import']
      .some(actionKey => resolvedPermissions[actionKey] !== undefined);
    if (hasActionKeys) {
      return resolvedPermissions[action] === true;
    }
    return false;
  }

  // modulePerms could be an object like { view: true } or an array like ['view']
  if (Array.isArray(modulePerms)) return modulePerms.includes(action);
  return modulePerms[action] === true;
};

const canAssignPermissions = (assignerRoleId, targetRoleId, assignerCompanyId, targetCompanyId) => {
  const assigner = Number(assignerRoleId);
  const target = Number(targetRoleId);

  if (target === ROLE_IDS.SUPERADMIN) return { allowed: false, reason: 'Cannot modify superadmin permissions' };
  if (target === ROLE_IDS.CUSTOMER) return { allowed: false, reason: 'Customers cannot have custom permissions' };
  if (assigner === ROLE_IDS.SUPERADMIN) return { allowed: true };

  if (assigner === ROLE_IDS.ADMIN) {
    if (target === ROLE_IDS.ADMIN) return { allowed: false, reason: 'Admin cannot modify another admin\'s permissions' };
    if (target === ROLE_IDS.MANAGER || target === ROLE_IDS.EMPLOYEE) {
      if (assignerCompanyId && targetCompanyId && Number(assignerCompanyId) !== Number(targetCompanyId)) {
        return { allowed: false, reason: 'Admin can only assign permissions within their own company' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Admin can only assign permissions to managers and employees' };
  }

  return { allowed: false, reason: 'You do not have permission to assign roles' };
};

const checkAssignPermission = async (req, res, next) => {
  try {
    const targetRoleId = Number(req.params.id);
    if (!targetRoleId) return res.status(400).json({ message: 'Invalid role ID' });

    const roleRow = await fetchRoleRow(targetRoleId);
    if (!roleRow) return res.status(404).json({ message: 'Role not found or inactive' });

    const assignerRoleId = resolveRoleId(req.user);
    if (!assignerRoleId) return res.status(403).json({ message: 'Forbidden: No role assigned to you' });

    const targetCompanyId = roleRow.companyId || req.body.companyId || null;
    const assignerCompanyId = req.user.companyId || null;

    const assignmentCheck = canAssignPermissions(assignerRoleId, targetRoleId, assignerCompanyId, targetCompanyId);
    if (!assignmentCheck.allowed) return res.status(403).json({ message: assignmentCheck.reason });

    if (assignerRoleId === ROLE_IDS.ADMIN) {
      const permissionsBeingGranted = req.body.permissions;
      if (permissionsBeingGranted && typeof permissionsBeingGranted === 'object' && Object.keys(permissionsBeingGranted).length > 0) {
        const adminPerms = await resolveEffectivePermissions(assignerRoleId);
        const adminPermissions = adminPerms.resolvedPermissions;
        if (adminPermissions !== null) {
          for (const [moduleKey, moduleActions] of Object.entries(permissionsBeingGranted)) {
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

    next();
  } catch (error) {
    console.error('checkAssignPermission middleware error:', error);
    return res.status(500).json({ message: 'Server error during authorization check' });
  }
};

const checkPermission = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Authentication required' });

      const roleId = resolveRoleId(req.user);
      if (Number(roleId) === ROLE_IDS.SUPERADMIN) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ RBAC: Super admin bypass for ${req.method} ${req.path}`);
        }
        return next();
      }

      if (!roleId) {
        console.warn(`⚠️ RBAC: No role assigned for user ${req.user.UserId} on ${req.path}`);
        return res.status(403).json({ message: 'Forbidden: No role assigned' });
      }

      const effective = await resolveEffectivePermissions(roleId);
      if (!effective.roleName) {
        console.warn(`⚠️ RBAC: Role ${roleId} not found or inactive for ${req.path}`);
        return res.status(403).json({ message: 'Forbidden: Role not found or inactive' });
      }

      const { resolvedPermissions } = effective;
      if (!hasModulePermission(resolvedPermissions, moduleKey, action)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔒 RBAC: Role "${effective.roleName}" (ID: ${roleId}) denied "${action}" access to module "${moduleKey}" on ${req.path}`);
        }
        return res.status(403).json({
          message: `Forbidden: Missing "${action}" permission for module "${moduleKey}"`,
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ RBAC: Role "${effective.roleName}" (ID: ${roleId}) granted ${action} access to ${moduleKey} for ${req.path}`);
      }
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ message: 'Server error during authorization check' });
    }
  };
};

const rbacMiddleware = async (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') return next();
    if (isExcludedPath(req.path)) return next();
    if (!req.user) return next();

    const roleId = resolveRoleId(req.user);
    if (Number(roleId) === ROLE_IDS.SUPERADMIN) return next();

    const moduleKey = getModuleFromPath(req.path);
    if (!moduleKey) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ RBAC: No module mapping for path: ${req.path}`);
      }
      return next();
    }

    const action = getActionFromMethod(req.method, req.path);
    if (!roleId) {
      console.warn(`⚠️ RBAC: User has no role assigned for ${req.path}`);
      return res.status(403).json({ message: 'Forbidden: No role assigned' });
    }

    const effective = await resolveEffectivePermissions(roleId);
    if (!effective.roleName) {
      console.warn(`⚠️ RBAC: Role ${roleId} not found for user ${req.user.UserId} on ${req.path}`);
      return res.status(403).json({ message: 'Forbidden: Role not found' });
    }

    const { resolvedPermissions, companyId } = effective;
    if (Number(roleId) === ROLE_IDS.ADMIN && resolvedPermissions === null) {
      const userCompanyId = req.user.companyId || companyId;
      if (userCompanyId) {
        req.rbac = { companyScoped: true, companyId: userCompanyId };
      }
    }

    if (!hasModulePermission(resolvedPermissions, moduleKey, action)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔒 RBAC: Role "${effective.roleName}" (ID: ${roleId}) denied "${action}" action on "${moduleKey}" for ${req.path}`);
      }
      return res.status(403).json({
        message: `Forbidden: Missing "${action}" permission for "${moduleKey}"`,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ RBAC: Role "${effective.roleName}" (ID: ${roleId}) granted ${action} access to ${moduleKey} for ${req.method} ${req.path}`);
    }
    next();
  } catch (error) {
    console.error('RBAC global middleware error:', error);
    return res.status(500).json({ message: 'Server error during authorization check' });
  }
};

module.exports = {
  checkPermission,
  rbacMiddleware,
  getModuleFromPath,
  URL_TO_MODULE,
  checkAssignPermission,
  canAssignPermissions,
  invalidateRoleCache,
};