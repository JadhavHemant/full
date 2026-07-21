'use strict';

/**
 * Permission Middleware
 *
 * DB-driven permission checks that integrate with the Permissions /
 * RolePermissions / MenuPermissions tables seeded by rbacSeeder.
 *
 * SuperAdmin (roleId = 1) bypasses every check.
 *
 * Exports:
 *   hasPermission(permissionKey)                     — e.g. 'products.create'
 *   hasModuleAccess(moduleKey, action)               — e.g. ('products', 'create')
 *   hasMenuAccess(menuKey)                           — e.g. 'inv.products'
 *   hasAnyPermission([...keys])                      — OR semantics
 *   hasAllPermissions([...keys])                     — AND semantics
 *   enforceCompanyIsolation                          — attach companyFilter
 *   requireOwnership(userIdField)                    — own-resource guard
 *   enforceRoleHierarchy                             — prevent upward role assignment
 */

const { appPool } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const getUserId = (req)  => req.user?.userId || req.user?.UserId;
const getRoleId = (req)  => req.user?.roleId  || req.user?.RoleId;

const isSuperAdmin = (req) => getRoleId(req) === 1;

/**
 * Check permission using DB-driven RolePermissions table.
 * Falls back to the legacy Roles.Permissions JSONB if no DB row found,
 * preserving compatibility with the existing RBAC middleware.
 */
const checkPermissionInDb = async (userId, roleId, permissionKey) => {
  // 1. Try DB-driven table first
  const result = await appPool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM "UserRoles" ur
      JOIN "RolePermissions" rp ON rp."RoleId"      = ur."RoleId"
      JOIN "Permissions"     p  ON p."PermissionId" = rp."PermissionId"
      WHERE ur."UserId"     = $1
        AND p."PermissionKey" = $2
        AND ur."IsActive"   = TRUE
        AND ur."IsDeleted"  = FALSE
        AND (ur."ExpiresAt" IS NULL OR ur."ExpiresAt" > NOW())
        AND rp."IsGranted"  = TRUE
        AND rp."IsActive"   = TRUE
        AND p."IsActive"    = TRUE
    ) AS "HasPermission"
  `, [userId, permissionKey]);

  if (result.rows[0]?.HasPermission) return true;

  // 2. Fallback: check legacy Roles.Permissions JSONB (backward compat)
  const roleResult = await appPool.query(`
    SELECT "Permissions" FROM "Roles" WHERE "Id" = $1 AND "IsActive" = TRUE
  `, [roleId]);

  const jsonbPerms = roleResult.rows[0]?.Permissions;
  if (!jsonbPerms || typeof jsonbPerms !== 'object') return false;

  // permissionKey format is "moduleKey.action"
  const [moduleKey, action] = permissionKey.split('.');
  const modulePerm = jsonbPerms[moduleKey];
  if (!modulePerm) return false;
  if (Array.isArray(modulePerm)) return modulePerm.includes(action);
  if (typeof modulePerm === 'object') return modulePerm[action] === true;
  return false;
};

/**
 * Check menu visibility using MenuPermissions table.
 */
const checkMenuAccessInDb = async (roleId, menuKey) => {
  const result = await appPool.query(`
    SELECT mp."CanView"
    FROM "MenuPermissions" mp
    JOIN "Menus" m ON m."MenuId" = mp."MenuId"
    WHERE mp."RoleId"     = $1
      AND m."MenuKey"     = $2
      AND mp."CanView"    = TRUE
      AND mp."IsActive"   = TRUE
      AND mp."IsDeleted"  = FALSE
      AND m."IsActive"    = TRUE
      AND m."IsDeleted"   = FALSE
    LIMIT 1
  `, [roleId, menuKey]);

  return result.rows.length > 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// hasPermission(permissionKey)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage: router.get('/products', authenticate, hasPermission('products.read'), handler)
 */
const hasPermission = (permissionKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  try {
    const allowed = await checkPermissionInDb(getUserId(req), getRoleId(req), permissionKey);
    if (!allowed) {
      return res.status(403).json({
        message: `Forbidden: missing permission '${permissionKey}'`,
        requiredPermission: permissionKey,
      });
    }
    return next();
  } catch (e) {
    console.error('hasPermission middleware error:', e);
    return res.status(500).json({ message: 'Permission check failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// hasModuleAccess(moduleKey, action)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage: router.post('/products', authenticate, hasModuleAccess('products', 'create'), handler)
 */
const hasModuleAccess = (moduleKey, action) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  const permKey = `${moduleKey}.${action}`;
  try {
    const allowed = await checkPermissionInDb(getUserId(req), getRoleId(req), permKey);
    if (!allowed) {
      return res.status(403).json({
        message: `Forbidden: missing ${action} access to '${moduleKey}'`,
        requiredPermission: permKey,
      });
    }
    return next();
  } catch (e) {
    console.error('hasModuleAccess middleware error:', e);
    return res.status(500).json({ message: 'Permission check failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// hasMenuAccess(menuKey)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage: router.get('/crm/leads', authenticate, hasMenuAccess('crm.leads'), handler)
 */
const hasMenuAccess = (menuKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  try {
    const allowed = await checkMenuAccessInDb(getRoleId(req), menuKey);
    if (!allowed) {
      return res.status(403).json({
        message: `Forbidden: no access to menu '${menuKey}'`,
        requiredMenu: menuKey,
      });
    }
    return next();
  } catch (e) {
    console.error('hasMenuAccess middleware error:', e);
    return res.status(500).json({ message: 'Menu access check failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// hasAnyPermission([...keys])  — OR semantics
// ─────────────────────────────────────────────────────────────────────────────

const hasAnyPermission = (permissionKeys) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  try {
    const userId = getUserId(req);
    const roleId = getRoleId(req);
    for (const key of permissionKeys) {
      if (await checkPermissionInDb(userId, roleId, key)) return next();
    }
    return res.status(403).json({
      message: 'Forbidden: missing one of the required permissions',
      requiredPermissions: permissionKeys,
    });
  } catch (e) {
    console.error('hasAnyPermission middleware error:', e);
    return res.status(500).json({ message: 'Permission check failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// hasAllPermissions([...keys])  — AND semantics
// ─────────────────────────────────────────────────────────────────────────────

const hasAllPermissions = (permissionKeys) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  try {
    const userId = getUserId(req);
    const roleId = getRoleId(req);
    for (const key of permissionKeys) {
      if (!(await checkPermissionInDb(userId, roleId, key))) {
        return res.status(403).json({
          message: `Forbidden: missing required permission '${key}'`,
          requiredPermissions: permissionKeys,
        });
      }
    }
    return next();
  } catch (e) {
    console.error('hasAllPermissions middleware error:', e);
    return res.status(500).json({ message: 'Permission check failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// enforceCompanyIsolation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attaches req.companyFilter = { companyId, enforced } for use in controllers.
 * Does NOT redirect — controllers must honour the filter.
 */
const enforceCompanyIsolation = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  if (isSuperAdmin(req)) return next();

  const userCompanyId = req.user.companyId || req.user.CompanyId;
  if (!userCompanyId) {
    return res.status(403).json({ message: 'User is not associated with a company' });
  }

  req.companyFilter = { companyId: parseInt(userCompanyId, 10), enforced: true };
  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// requireOwnership
// ─────────────────────────────────────────────────────────────────────────────

const requireOwnership = (userIdField = 'UserId') => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  const currentId  = getUserId(req);
  const resourceId = req.params[userIdField] || req.body[userIdField];

  if (!resourceId) return res.status(400).json({ message: `Missing ${userIdField} parameter` });

  if (parseInt(currentId) !== parseInt(resourceId)) {
    return res.status(403).json({ message: 'Forbidden: you can only access your own resources' });
  }

  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// enforceRoleHierarchy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prevents a user from assigning a role equal to or higher than their own.
 * Reads roleId from req.body.roleId or req.body.RoleId.
 */
const enforceRoleHierarchy = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (isSuperAdmin(req)) return next();

  const currentRoleId = getRoleId(req);
  const targetRoleId  = parseInt(req.body.roleId || req.body.RoleId || 0, 10);

  if (!targetRoleId) return next(); // No role in body — nothing to check

  if (targetRoleId <= currentRoleId) {
    return res.status(403).json({
      message: 'Cannot assign a role equal to or higher than your own',
    });
  }

  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports — new names + backward-compatible old names
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // New canonical names
  hasPermission,
  hasModuleAccess,
  hasMenuAccess,
  hasAnyPermission,
  hasAllPermissions,
  enforceCompanyIsolation,
  requireOwnership,
  enforceRoleHierarchy,

  // Backward-compatible aliases for existing code that imports old names
  requirePermission:     hasPermission,
  requireModuleAccess:   hasModuleAccess,
  requireAnyPermission:  hasAnyPermission,
  requireAllPermissions: hasAllPermissions,
};
