/**
 * Record-Level Permission Middleware
 *
 * Provides utilities to check and enforce record-level (row-level) access control
 * based on the authenticated user's role and the entity being accessed.
 *
 * Scope types:
 *   - 'company'  : All records belonging to a specific company
 *   - 'department': All records belonging to a specific department
 *   - 'user'     : Records owned by a specific user
 *   - 'record'   : A specific record (by RecordId)
 *
 * Permission levels:
 *   - 'view'    : Can view the record(s)
 *   - 'edit'    : Can edit the record(s)
 *   - 'delete'  : Can delete the record(s)
 *   - 'own'     : Can only access records they own
 */

const { appPool } = require('../config/db');
const { ROLE_IDS, isSuperAdmin } = require('../config/roleConfig');

/**
 * Cache for record permissions (with TTL)
 */
const RECORD_PERM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const recordPermCache = new Map();

/**
 * Get cached record permissions for a role and entity.
 * Returns null if not cached or expired.
 */
const getCachedRecordPerms = (roleId, entityName) => {
  const key = `${roleId}:${entityName}`;
  const entry = recordPermCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    recordPermCache.delete(key);
    return null;
  }
  return entry.permissions;
};

/**
 * Fetch record permissions from DB for a role and entity.
 * Results are cached for RECORD_PERM_CACHE_TTL_MS.
 */
const fetchRecordPerms = async (roleId, entityName) => {
  const cached = getCachedRecordPerms(roleId, entityName);
  if (cached) return cached;

  const result = await appPool.query(
    `SELECT "ScopeType", "ScopeId", "RecordId", "PermissionLevel"
     FROM "RecordPermissions"
     WHERE "RoleId" = $1 AND "EntityName" = $2 AND "IsActive" = TRUE`,
    [roleId, entityName]
  );

  const perms = result.rows;

  const key = `${roleId}:${entityName}`;
  recordPermCache.set(key, {
    permissions: perms,
    expiresAt: Date.now() + RECORD_PERM_CACHE_TTL_MS,
  });

  return perms;
};

/**
 * Invalidate the record permission cache for a role and entity.
 */
const invalidateRecordPermCache = (roleId, entityName) => {
  const key = `${roleId}:${entityName}`;
  recordPermCache.delete(key);
};

/**
 * Check if a user has record-level access for a given entity and action.
 *
 * @param {number} roleId - The user's role ID
 * @param {string} entityName - The entity/table name
 * @param {string} action - The action ('view', 'edit', 'delete')
 * @param {number} recordId - Optional specific record ID
 * @param {number} userId - The user's ID
 * @param {number} companyId - The user's company ID
 * @returns {Promise<{hasAccess: boolean, permissions: Array}>}
 */
const checkRecordAccess = async (roleId, entityName, action, recordId = null, userId = null, companyId = null) => {
  // Super admin always has access
  if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin({ roleId })) {
    return { hasAccess: true, permissions: [], reason: 'Super admin' };
  }

  const perms = await fetchRecordPerms(roleId, entityName);

  if (perms.length === 0) {
    // No record-level permissions defined - fall back to module-level RBAC
    return { hasAccess: true, permissions: [], reason: 'No record-level restrictions' };
  }

  const hasAccess = perms.some(perm => {
    // Check scope matching
    if (perm.ScopeType === 'company' && perm.ScopeId === companyId) {
      // Company-wide permission
      if (perm.PermissionLevel === action ||
          (perm.PermissionLevel === 'edit' && action === 'view') ||
          (perm.PermissionLevel === 'delete' && ['view', 'edit'].includes(action))) {
        return true;
      }
    }

    if (perm.ScopeType === 'user' && perm.ScopeId === userId) {
      // User-specific permission
      if (perm.PermissionLevel === action ||
          (perm.PermissionLevel === 'edit' && action === 'view') ||
          (perm.PermissionLevel === 'delete' && ['view', 'edit'].includes(action))) {
        return true;
      }
    }

    if (perm.ScopeType === 'record' && perm.RecordId === recordId) {
      // Record-specific permission
      if (perm.PermissionLevel === action ||
          (perm.PermissionLevel === 'edit' && action === 'view') ||
          (perm.PermissionLevel === 'delete' && ['view', 'edit'].includes(action))) {
        return true;
      }
    }

    if (perm.ScopeType === 'department' && perm.ScopeId === null) {
      // Department-level (fallback - no specific department)
      if (perm.PermissionLevel === action) {
        return true;
      }
    }

    // 'own' permission - user can access their own records
    if (perm.PermissionLevel === 'own') {
      if (perm.ScopeType === 'user' && perm.ScopeId === userId) return true;
      if (perm.ScopeType === 'company' && perm.ScopeId === companyId) return true;
    }

    return false;
  });

  return { hasAccess, permissions: perms };
};

/**
 * Middleware factory: Check record-level access for a specific entity.
 *
 * @param {string} entityName - The entity/table name
 * @param {string} action - The action ('view', 'edit', 'delete')
 * @returns {Function} Express middleware
 */
const checkRecordPermission = (entityName, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const roleId = req.user.roleId || req.user.RoleId;
      const userId = req.user.UserId;
      const companyId = req.user.CompanyId;

      // Super admin bypasses
      if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(req.user)) {
        return next();
      }

      // Get record ID from params or body
      const recordId = req.params.id || req.params.recordId || req.body.id || req.body.RecordId || null;

      const { hasAccess, reason } = await checkRecordAccess(
        roleId, entityName, action, recordId, userId, companyId
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: `Forbidden: No ${action} permission for ${entityName}`,
        });
      }

      next();
    } catch (error) {
      console.error('Record permission middleware error:', error);
      next(); // Don't block on error
    }
  };
};

/**
 * Middleware factory: Add a WHERE clause filter for record-level access.
 * This is used to filter query results based on record permissions.
 *
 * @param {string} entityName - The entity/table name
 * @param {string} idColumn - The ID column name (default: 'Id')
 * @param {string} ownerColumn - The owner column name (default: 'CreatedBy')
 * @param {string} companyColumn - The company column name (default: 'CompanyId')
 * @returns {Function} Express middleware
 */
const applyRecordFilter = (entityName, idColumn = 'Id', ownerColumn = 'CreatedBy', companyColumn = 'CompanyId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const roleId = req.user.roleId || req.user.RoleId;
      const userId = req.user.UserId;
      const companyId = req.user.CompanyId;

      // Super admin bypasses
      if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(req.user)) {
        req.recordFilter = null;
        return next();
      }

      const perms = await fetchRecordPerms(roleId, entityName);

      if (perms.length === 0) {
        // No record-level restrictions
        req.recordFilter = null;
        return next();
      }

      // Build a list of allowed record IDs
      const allowedRecordIds = [];
      const allowedCompanyIds = [];
      const allowedUserIds = [];

      for (const perm of perms) {
        if (perm.ScopeType === 'record' && perm.RecordId) {
          allowedRecordIds.push(perm.RecordId);
        }
        if (perm.ScopeType === 'company' && perm.ScopeId) {
          allowedCompanyIds.push(perm.ScopeId);
        }
        if (perm.ScopeType === 'user' && perm.ScopeId) {
          allowedUserIds.push(perm.ScopeId);
        }
      }

      // Build filter conditions
      const conditions = [];
      const filterParams = [];
      let paramIdx = 1;

      if (allowedRecordIds.length > 0) {
        conditions.push(`${idColumn} IN (${allowedRecordIds.map(() => `$${paramIdx++}`).join(', ')})`);
        allowedRecordIds.forEach(id => filterParams.push(id));
      }

      if (allowedCompanyIds.length > 0) {
        conditions.push(`${companyColumn} IN (${allowedCompanyIds.map(() => `$${paramIdx++}`).join(', ')})`);
        allowedCompanyIds.forEach(id => filterParams.push(id));
      }

      if (allowedUserIds.length > 0) {
        conditions.push(`${ownerColumn} IN (${allowedUserIds.map(() => `$${paramIdx++}`).join(', ')})`);
        allowedUserIds.forEach(id => filterParams.push(id));
      }

      // Always include company filter for company-scoped users
      if (companyId && !allowedCompanyIds.includes(companyId)) {
        conditions.push(`${companyColumn} = $${paramIdx++}`);
        filterParams.push(companyId);
      }

      req.recordFilter = {
        conditions: conditions.length > 0 ? conditions.join(' OR ') : null,
        params: filterParams,
      };

      next();
    } catch (error) {
      console.error('Record filter middleware error:', error);
      req.recordFilter = null;
      next();
    }
  };
};

module.exports = {
  fetchRecordPerms,
  invalidateRecordPermCache,
  checkRecordAccess,
  checkRecordPermission,
  applyRecordFilter,
};