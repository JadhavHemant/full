const { appPool } = require('../../config/db');

/**
 * Permission Service
 * 
 * Handles permission queries, user permission checks, and role-based access.
 */

/**
 * Get all permissions for a user (aggregated from all roles)
 */
const getUserPermissions = async (userId) => {
  const result = await appPool.query(
    `SELECT DISTINCT 
       p."PermissionId",
       p."PermissionKey",
       p."PermissionName",
       p."Action",
       m."ModuleKey",
       m."ModuleName"
     FROM "UserRoles" ur
     JOIN "RolePermissions" rp ON ur."RoleId" = rp."RoleId"
     JOIN "Permissions" p ON rp."PermissionId" = p."PermissionId"
     JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
     WHERE ur."UserId" = $1
       AND ur."IsActive" = TRUE
       AND ur."IsDeleted" = FALSE
       AND rp."IsGranted" = TRUE
       AND rp."IsActive" = TRUE
       AND p."IsActive" = TRUE
       AND m."IsActive" = TRUE
     ORDER BY m."ModuleName", p."Action"`,
    [userId]
  );

  return result.rows;
};

/**
 * Get permissions for a specific role
 */
const getRolePermissions = async (roleId) => {
  const result = await appPool.query(
    `SELECT 
       p."PermissionId",
       p."PermissionKey",
       p."PermissionName",
       p."Action",
       m."ModuleKey",
       m."ModuleName",
       rp."IsGranted"
     FROM "RolePermissions" rp
     JOIN "Permissions" p ON rp."PermissionId" = p."PermissionId"
     JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
     WHERE rp."RoleId" = $1
       AND rp."IsActive" = TRUE
       AND p."IsActive" = TRUE
       AND m."IsActive" = TRUE
     ORDER BY m."ModuleName", p."Action"`,
    [roleId]
  );

  return result.rows;
};

/**
 * Check if user has specific permission
 */
const hasPermission = async (userId, permissionKey) => {
  const result = await appPool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM "UserRoles" ur
       JOIN "RolePermissions" rp ON ur."RoleId" = rp."RoleId"
       JOIN "Permissions" p ON rp."PermissionId" = p."PermissionId"
       WHERE ur."UserId" = $1
         AND p."PermissionKey" = $2
         AND ur."IsActive" = TRUE
         AND ur."IsDeleted" = FALSE
         AND rp."IsGranted" = TRUE
         AND rp."IsActive" = TRUE
         AND p."IsActive" = TRUE
     ) as "HasPermission"`,
    [userId, permissionKey]
  );

  return result.rows[0]?.HasPermission || false;
};

/**
 * Check if user has permission for module action
 */
const hasModuleAccess = async (userId, moduleKey, action) => {
  const permissionKey = `${moduleKey}.${action}`;
  return await hasPermission(userId, permissionKey);
};

/**
 * Get user's accessible modules
 */
const getUserModules = async (userId) => {
  const result = await appPool.query(
    `SELECT DISTINCT
       m."ModuleId",
       m."ModuleKey",
       m."ModuleName",
       m."Icon",
       m."ParentModuleId"
     FROM "UserRoles" ur
     JOIN "RolePermissions" rp ON ur."RoleId" = rp."RoleId"
     JOIN "Permissions" p ON rp."PermissionId" = p."PermissionId"
     JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
     WHERE ur."UserId" = $1
       AND ur."IsActive" = TRUE
       AND ur."IsDeleted" = FALSE
       AND rp."IsGranted" = TRUE
       AND rp."IsActive" = TRUE
       AND m."IsActive" = TRUE
     ORDER BY m."DisplayOrder"`,
    [userId]
  );

  return result.rows;
};

/**
 * Assign permission to role
 */
const assignPermissionToRole = async (roleId, permissionId, grantedBy) => {
  await appPool.query(
    `INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "IsGranted", "GrantedBy", "IsActive")
     VALUES ($1, $2, TRUE, $3, TRUE)
     ON CONFLICT ("RoleId", "PermissionId") 
     DO UPDATE SET
       "IsGranted" = TRUE,
       "GrantedBy" = $3,
       "GrantedAt" = NOW(),
       "IsActive" = TRUE,
       "UpdatedAt" = NOW()`,
    [roleId, permissionId, grantedBy]
  );

  return { success: true, message: 'Permission assigned to role' };
};

/**
 * Revoke permission from role
 */
const revokePermissionFromRole = async (roleId, permissionId, revokedBy) => {
  await appPool.query(
    `UPDATE "RolePermissions"
     SET "IsGranted" = FALSE,
         "GrantedBy" = $3,
         "GrantedAt" = NOW(),
         "UpdatedAt" = NOW()
     WHERE "RoleId" = $1 AND "PermissionId" = $2`,
    [roleId, permissionId, revokedBy]
  );

  return { success: true, message: 'Permission revoked from role' };
};

/**
 * Bulk assign permissions to role
 */
const bulkAssignPermissions = async (roleId, permissionIds, grantedBy) => {
  const client = await appPool.connect();

  try {
    await client.query('BEGIN');

    for (const permissionId of permissionIds) {
      await client.query(
        `INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "IsGranted", "GrantedBy", "IsActive")
         VALUES ($1, $2, TRUE, $3, TRUE)
         ON CONFLICT ("RoleId", "PermissionId") 
         DO UPDATE SET
           "IsGranted" = TRUE,
           "GrantedBy" = $3,
           "GrantedAt" = NOW(),
           "IsActive" = TRUE,
           "UpdatedAt" = NOW()`,
        [roleId, permissionId, grantedBy]
      );
    }

    await client.query('COMMIT');

    return { 
      success: true, 
      message: `${permissionIds.length} permissions assigned to role` 
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all available permissions grouped by module
 */
const getAllPermissions = async () => {
  const result = await appPool.query(
    `SELECT 
       p."PermissionId",
       p."PermissionKey",
       p."PermissionName",
       p."Action",
       p."Description",
       m."ModuleId",
       m."ModuleKey",
       m."ModuleName"
     FROM "Permissions" p
     JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
     WHERE p."IsActive" = TRUE 
       AND p."IsDeleted" = FALSE
       AND m."IsActive" = TRUE
     ORDER BY m."DisplayOrder", p."Action"`
  );

  // Group by module
  const grouped = result.rows.reduce((acc, perm) => {
    const moduleKey = perm.ModuleKey;
    if (!acc[moduleKey]) {
      acc[moduleKey] = {
        moduleId: perm.ModuleId,
        moduleName: perm.ModuleName,
        permissions: []
      };
    }
    acc[moduleKey].permissions.push({
      permissionId: perm.PermissionId,
      permissionKey: perm.PermissionKey,
      permissionName: perm.PermissionName,
      action: perm.Action,
      description: perm.Description
    });
    return acc;
  }, {});

  return grouped;
};

module.exports = {
  getUserPermissions,
  getRolePermissions,
  hasPermission,
  hasModuleAccess,
  getUserModules,
  assignPermissionToRole,
  revokePermissionFromRole,
  bulkAssignPermissions,
  getAllPermissions,
};
