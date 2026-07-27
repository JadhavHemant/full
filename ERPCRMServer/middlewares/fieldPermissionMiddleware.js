/**
 * Field-Level Permission Middleware
 *
 * Provides utilities to check and enforce field-level permissions
 * based on the authenticated user's role.
 *
 * Permission levels:
 *   - 'hidden'   : Field is not visible to the role
 *   - 'read'     : Field is visible but read-only
 *   - 'readwrite': Field is visible and editable
 *   - 'required' : Field is visible, editable, and must be filled
 */

const { appPool } = require('../config/db');
const { ROLE_IDS, isSuperAdmin } = require('../config/roleConfig');

/**
 * Cache for field permissions (with TTL)
 */
const FIELD_PERM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const fieldPermCache = new Map();

/**
 * Get cached field permissions for a role and entity.
 * Returns null if not cached or expired.
 */
const getCachedFieldPerms = (roleId, entityName) => {
  const key = `${roleId}:${entityName}`;
  const entry = fieldPermCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fieldPermCache.delete(key);
    return null;
  }
  return entry.permissions;
};

/**
 * Fetch field permissions from DB for a role and entity.
 * Results are cached for FIELD_PERM_CACHE_TTL_MS.
 */
const fetchFieldPerms = async (roleId, entityName) => {
  const cached = getCachedFieldPerms(roleId, entityName);
  if (cached) return cached;

  const result = await appPool.query(
    `SELECT "FieldName", "PermissionLevel", "IsRequired"
     FROM "FieldPermissions"
     WHERE "RoleId" = $1 AND "EntityName" = $2 AND "IsActive" = TRUE`,
    [roleId, entityName]
  );

  const perms = {};
  for (const row of result.rows) {
    perms[row.FieldName] = {
      level: row.PermissionLevel,
      isRequired: row.IsRequired,
    };
  }

  const key = `${roleId}:${entityName}`;
  fieldPermCache.set(key, {
    permissions: perms,
    expiresAt: Date.now() + FIELD_PERM_CACHE_TTL_MS,
  });

  return perms;
};

/**
 * Invalidate the field permission cache for a role and entity.
 * Call this after updating field permissions.
 */
const invalidateFieldPermCache = (roleId, entityName) => {
  const key = `${roleId}:${entityName}`;
  fieldPermCache.delete(key);
};

/**
 * Check if a field is visible to a role.
 * @param {Object} fieldPerms - Field permissions object
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
const isFieldVisible = (fieldPerms, fieldName) => {
  if (!fieldPerms[fieldName]) return true; // Default: visible if no explicit permission
  return fieldPerms[fieldName].level !== 'hidden';
};

/**
 * Check if a field is editable by a role.
 * @param {Object} fieldPerms - Field permissions object
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
const isFieldEditable = (fieldPerms, fieldName) => {
  if (!fieldPerms[fieldName]) return true; // Default: editable if no explicit permission
  const level = fieldPerms[fieldName].level;
  return level === 'readwrite' || level === 'required';
};

/**
 * Check if a field is required for a role.
 * @param {Object} fieldPerms - Field permissions object
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
const isFieldRequired = (fieldPerms, fieldName) => {
  if (!fieldPerms[fieldName]) return false;
  return fieldPerms[fieldName].level === 'required' || fieldPerms[fieldName].isRequired === true;
};

/**
 * Middleware factory: Filter request body to only include fields
 * that the user's role has permission to edit.
 *
 * @param {string} entityName - The entity/table name (e.g., 'Products', 'PurchaseOrders')
 * @returns {Function} Express middleware
 */
const filterEditableFields = (entityName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.body) {
        return next();
      }

      // Super admin has full access
      const roleId = req.user.roleId || req.user.RoleId;
      if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(req.user)) {
        return next();
      }

      const fieldPerms = await fetchFieldPerms(roleId, entityName);

      // Filter out fields the user cannot edit
      const filteredBody = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (isFieldEditable(fieldPerms, key)) {
          filteredBody[key] = value;
        }
      }

      req.body = filteredBody;
      req.fieldPermissions = fieldPerms;
      next();
    } catch (error) {
      console.error('Field permission middleware error:', error);
      next(); // Don't block on error, just continue
    }
  };
};

/**
 * Middleware factory: Add field visibility info to the response.
 * Strips hidden fields from the response data.
 *
 * @param {string} entityName - The entity/table name
 * @returns {Function} Express middleware
 */
const filterHiddenFields = (entityName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const roleId = req.user.roleId || req.user.RoleId;
      if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(req.user)) {
        return next();
      }

      const fieldPerms = await fetchFieldPerms(roleId, entityName);

      // Store field perms for use in response filtering
      req.fieldPermissions = fieldPerms;

      // Patch res.json to filter hidden fields
      const originalJson = res.json;
      res.json = function (data) {
        const filterData = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(filterData);

          const filtered = {};
          for (const [key, value] of Object.entries(obj)) {
            if (isFieldVisible(fieldPerms, key)) {
              filtered[key] = filterData(value);
            }
          }
          return filtered;
        };

        return originalJson.call(this, filterData(data));
      };

      next();
    } catch (error) {
      console.error('Field permission response filter error:', error);
      next();
    }
  };
};

/**
 * Validate required fields for a role before creating/updating.
 *
 * @param {string} entityName - The entity/table name
 * @returns {Function} Express middleware
 */
const validateRequiredFields = (entityName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.body) {
        return next();
      }

      const roleId = req.user.roleId || req.user.RoleId;
      if (Number(roleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(req.user)) {
        return next();
      }

      const fieldPerms = await fetchFieldPerms(roleId, entityName);
      const missingFields = [];

      for (const [fieldName, perm] of Object.entries(fieldPerms)) {
        if (perm.level === 'required' || perm.isRequired === true) {
          if (req.body[fieldName] === undefined || req.body[fieldName] === null || req.body[fieldName] === '') {
            missingFields.push(fieldName);
          }
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Required fields missing: ${missingFields.join(', ')}`,
          missingFields,
        });
      }

      next();
    } catch (error) {
      console.error('Required field validation error:', error);
      next();
    }
  };
};

module.exports = {
  fetchFieldPerms,
  invalidateFieldPermCache,
  isFieldVisible,
  isFieldEditable,
  isFieldRequired,
  filterEditableFields,
  filterHiddenFields,
  validateRequiredFields,
};