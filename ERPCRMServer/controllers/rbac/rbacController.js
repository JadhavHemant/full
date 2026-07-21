'use strict';

/**
 * RBAC Controller
 *
 * Manages: Modules, Permissions, Menus, UserRoles,
 *          RolePermissions, MenuPermissions
 *
 * All write operations are guarded by role hierarchy checks and
 * emit audit log entries via auditLogService.
 */

const { validationResult } = require('express-validator');
const { appPool }          = require('../../config/db');
const { logPermissionChange, logRoleAssignment, logDataChange }
                           = require('../../services/auditLogService');
const { invalidateRoleCache } = require('../../middlewares/rbac');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  }
  return null;
};

const isSuperAdmin    = (user) => (user?.roleId || user?.RoleId) === 1;
const isCompanyAdmin  = (user) => (user?.roleId || user?.RoleId) === 2;
const isPrivileged    = (user) => isSuperAdmin(user) || isCompanyAdmin(user);
const getIp           = (req)  => req.ip || req.connection?.remoteAddress || '0.0.0.0';
const getUserId       = (req)  => req.user?.userId || req.user?.UserId;

// ─────────────────────────────────────────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────────────────────────────────────────

const getModules = async (req, res) => {
  try {
    const result = await appPool.query(`
      SELECT m."ModuleId", m."ModuleName", m."ModuleKey", m."Description",
             m."ParentModuleId", m."Icon", m."DisplayOrder", m."IsActive",
             p."ModuleName" AS "ParentModuleName"
      FROM "Modules" m
      LEFT JOIN "Modules" p ON p."ModuleId" = m."ParentModuleId"
      WHERE m."IsDeleted" = FALSE
      ORDER BY m."DisplayOrder", m."ModuleName"
    `);
    return res.status(200).json({ modules: result.rows });
  } catch (e) {
    console.error('getModules error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getModuleById = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const result = await appPool.query(`
      SELECT * FROM "Modules"
      WHERE "ModuleId" = $1 AND "IsDeleted" = FALSE
    `, [moduleId]);
    if (!result.rows.length) return res.status(404).json({ message: 'Module not found' });
    return res.status(200).json({ module: result.rows[0] });
  } catch (e) {
    console.error('getModuleById error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const createModule = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Only SuperAdmin can create modules' });
  }

  const { moduleName, moduleKey, description, parentModuleId, icon, displayOrder } = req.body;

  try {
    const result = await appPool.query(`
      INSERT INTO "Modules" ("ModuleName","ModuleKey","Description","ParentModuleId","Icon","DisplayOrder","IsActive","IsDeleted","CreatedBy","CreatedAt","UpdatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,$7,NOW(),NOW())
      RETURNING *
    `, [moduleName, moduleKey, description || null, parentModuleId || null,
        icon || null, displayOrder ?? 0, getUserId(req)]);

    await logDataChange({
      userId: getUserId(req), action: 'INSERT', entityType: 'Module',
      entityId: result.rows[0].ModuleId, newValue: result.rows[0],
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ message: 'Module created', module: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Module key already exists' });
    console.error('createModule error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateModule = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Only SuperAdmin can update modules' });
  }

  const { moduleId } = req.params;
  const { moduleName, description, parentModuleId, icon, displayOrder, isActive } = req.body;

  try {
    const old = await appPool.query(`SELECT * FROM "Modules" WHERE "ModuleId" = $1`, [moduleId]);
    if (!old.rows.length) return res.status(404).json({ message: 'Module not found' });

    const result = await appPool.query(`
      UPDATE "Modules"
      SET "ModuleName"    = COALESCE($1, "ModuleName"),
          "Description"   = COALESCE($2, "Description"),
          "ParentModuleId"= COALESCE($3, "ParentModuleId"),
          "Icon"          = COALESCE($4, "Icon"),
          "DisplayOrder"  = COALESCE($5, "DisplayOrder"),
          "IsActive"      = COALESCE($6, "IsActive"),
          "UpdatedBy"     = $7,
          "UpdatedAt"     = NOW()
      WHERE "ModuleId" = $8
      RETURNING *
    `, [moduleName, description, parentModuleId, icon, displayOrder, isActive, getUserId(req), moduleId]);

    await logDataChange({
      userId: getUserId(req), action: 'UPDATE', entityType: 'Module',
      entityId: parseInt(moduleId), oldValue: old.rows[0], newValue: result.rows[0],
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Module updated', module: result.rows[0] });
  } catch (e) {
    console.error('updateModule error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const deleteModule = async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Only SuperAdmin can delete modules' });
  }
  const { moduleId } = req.params;
  try {
    await appPool.query(`
      UPDATE "Modules" SET "IsDeleted" = TRUE, "IsActive" = FALSE, "UpdatedAt" = NOW()
      WHERE "ModuleId" = $1
    `, [moduleId]);
    return res.status(200).json({ message: 'Module deleted' });
  } catch (e) {
    console.error('deleteModule error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const getAllPermissions = async (req, res) => {
  try {
    const result = await appPool.query(`
      SELECT p."PermissionId", p."PermissionKey", p."PermissionName",
             p."Action", p."Description", p."IsActive",
             m."ModuleId", m."ModuleName", m."ModuleKey"
      FROM "Permissions" p
      JOIN "Modules" m ON m."ModuleId" = p."ModuleId"
      WHERE p."IsDeleted" = FALSE AND m."IsDeleted" = FALSE
      ORDER BY m."DisplayOrder", p."Action"
    `);

    // Group by module for convenient frontend consumption
    const grouped = result.rows.reduce((acc, row) => {
      const key = row.ModuleKey;
      if (!acc[key]) acc[key] = { moduleId: row.ModuleId, moduleName: row.ModuleName, permissions: [] };
      acc[key].permissions.push({
        permissionId: row.PermissionId, permissionKey: row.PermissionKey,
        permissionName: row.PermissionName, action: row.Action,
        description: row.Description, isActive: row.IsActive,
      });
      return acc;
    }, {});

    return res.status(200).json({ permissions: result.rows, grouped });
  } catch (e) {
    console.error('getAllPermissions error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const createPermission = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Only SuperAdmin can create permissions' });
  }

  const { moduleId, permissionName, permissionKey, action, description } = req.body;

  try {
    const result = await appPool.query(`
      INSERT INTO "Permissions" ("ModuleId","PermissionName","PermissionKey","Action","Description","IsActive","IsDeleted","CreatedBy","CreatedAt","UpdatedAt")
      VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,$6,NOW(),NOW())
      RETURNING *
    `, [moduleId, permissionName, permissionKey, action, description || null, getUserId(req)]);

    return res.status(201).json({ message: 'Permission created', permission: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Permission key already exists for this module/action' });
    console.error('createPermission error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const deletePermission = async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Only SuperAdmin can delete permissions' });
  }
  const { permissionId } = req.params;
  try {
    await appPool.query(`
      UPDATE "Permissions" SET "IsDeleted" = TRUE, "IsActive" = FALSE, "UpdatedAt" = NOW()
      WHERE "PermissionId" = $1
    `, [permissionId]);
    return res.status(200).json({ message: 'Permission deleted' });
  } catch (e) {
    console.error('deletePermission error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MENUS
// ─────────────────────────────────────────────────────────────────────────────

const getMenus = async (req, res) => {
  try {
    const result = await appPool.query(`
      SELECT m."MenuId", m."ModuleId", m."ParentMenuId", m."MenuName",
             m."MenuKey", m."MenuPath", m."MenuIcon", m."DisplayOrder",
             m."IsVisible", m."IsActive", m."MenuType",
             mo."ModuleName",
             pm."MenuName" AS "ParentMenuName"
      FROM "Menus" m
      LEFT JOIN "Modules" mo ON mo."ModuleId" = m."ModuleId"
      LEFT JOIN "Menus" pm  ON pm."MenuId" = m."ParentMenuId"
      WHERE m."IsDeleted" = FALSE
      ORDER BY m."DisplayOrder", m."MenuName"
    `);
    return res.status(200).json({ menus: result.rows });
  } catch (e) {
    console.error('getMenus error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getUserMenus = async (req, res) => {
  const userId = getUserId(req);
  try {
    // SuperAdmin sees everything
    if (isSuperAdmin(req.user)) {
      const result = await appPool.query(`
        SELECT "MenuId","ParentMenuId","MenuName","MenuKey","MenuPath","MenuIcon","DisplayOrder","MenuType"
        FROM "Menus"
        WHERE "IsDeleted" = FALSE AND "IsActive" = TRUE AND "IsVisible" = TRUE
        ORDER BY "DisplayOrder"
      `);
      return res.status(200).json({ menus: result.rows });
    }

    // Other users: fetch via their role
    const roleId = req.user?.roleId || req.user?.RoleId;
    const result = await appPool.query(`
      SELECT DISTINCT
        m."MenuId", m."ParentMenuId", m."MenuName", m."MenuKey",
        m."MenuPath", m."MenuIcon", m."DisplayOrder", m."MenuType",
        mp."CanView", mp."CanCreate", mp."CanEdit", mp."CanDelete"
      FROM "MenuPermissions" mp
      JOIN "Menus" m ON m."MenuId" = mp."MenuId"
      WHERE mp."RoleId" = $1
        AND mp."CanView" = TRUE
        AND mp."IsActive" = TRUE
        AND mp."IsDeleted" = FALSE
        AND m."IsActive" = TRUE
        AND m."IsDeleted" = FALSE
        AND m."IsVisible" = TRUE
      ORDER BY m."DisplayOrder"
    `, [roleId]);

    return res.status(200).json({ menus: result.rows });
  } catch (e) {
    console.error('getUserMenus error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const createMenu = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ message: 'Insufficient privileges to create menus' });
  }
  const { menuName, menuKey, moduleId, parentMenuId, menuPath, menuIcon, displayOrder, menuType } = req.body;
  try {
    const result = await appPool.query(`
      INSERT INTO "Menus" ("ModuleId","ParentMenuId","MenuName","MenuKey","MenuPath","MenuIcon","DisplayOrder","MenuType","IsVisible","IsActive","IsDeleted","CreatedBy","CreatedAt","UpdatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE,FALSE,$9,NOW(),NOW())
      RETURNING *
    `, [moduleId || null, parentMenuId || null, menuName, menuKey, menuPath || null,
        menuIcon || null, displayOrder ?? 0, menuType || 'menu', getUserId(req)]);
    return res.status(201).json({ message: 'Menu created', menu: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Menu key already exists' });
    console.error('createMenu error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateMenu = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;
  if (!isPrivileged(req.user)) return res.status(403).json({ message: 'Insufficient privileges' });
  const { menuId } = req.params;
  const { menuName, menuPath, menuIcon, displayOrder, menuType, isVisible, isActive } = req.body;
  try {
    const result = await appPool.query(`
      UPDATE "Menus"
      SET "MenuName"    = COALESCE($1,"MenuName"),
          "MenuPath"    = COALESCE($2,"MenuPath"),
          "MenuIcon"    = COALESCE($3,"MenuIcon"),
          "DisplayOrder"= COALESCE($4,"DisplayOrder"),
          "MenuType"    = COALESCE($5,"MenuType"),
          "IsVisible"   = COALESCE($6,"IsVisible"),
          "IsActive"    = COALESCE($7,"IsActive"),
          "UpdatedBy"   = $8, "UpdatedAt" = NOW()
      WHERE "MenuId" = $9 AND "IsDeleted" = FALSE
      RETURNING *
    `, [menuName, menuPath, menuIcon, displayOrder, menuType, isVisible, isActive, getUserId(req), menuId]);
    if (!result.rows.length) return res.status(404).json({ message: 'Menu not found' });
    return res.status(200).json({ message: 'Menu updated', menu: result.rows[0] });
  } catch (e) {
    console.error('updateMenu error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const deleteMenu = async (req, res) => {
  if (!isPrivileged(req.user)) return res.status(403).json({ message: 'Insufficient privileges' });
  const { menuId } = req.params;
  try {
    await appPool.query(`UPDATE "Menus" SET "IsDeleted"=TRUE,"IsActive"=FALSE,"UpdatedAt"=NOW() WHERE "MenuId"=$1`, [menuId]);
    return res.status(200).json({ message: 'Menu deleted' });
  } catch (e) {
    console.error('deleteMenu error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER ROLES
// ─────────────────────────────────────────────────────────────────────────────

const getUserRoles = async (req, res) => {
  const { userId, roleId, companyId } = req.query;
  const requestingRoleId = req.user?.roleId || req.user?.RoleId;
  const requestingCompanyId = req.user?.companyId || req.user?.CompanyId;

  try {
    let query = `
      SELECT ur."UserRoleId", ur."UserId", ur."RoleId", ur."CompanyId",
             ur."AssignedAt", ur."ExpiresAt", ur."IsActive",
             u."Name" AS "UserName", u."Email" AS "UserEmail",
             r."RoleName",
             c."CompanyName"
      FROM "UserRoles" ur
      JOIN "Users" u   ON u."UserId"  = ur."UserId"
      JOIN "Roles" r   ON r."Id"      = ur."RoleId"
      LEFT JOIN "Companies" c ON c."Id" = ur."CompanyId"
      WHERE ur."IsDeleted" = FALSE
    `;
    const params = [];
    let p = 1;

    // Non-SuperAdmin can only see their own company's data
    if (requestingRoleId !== 1) {
      query += ` AND ur."CompanyId" = $${p++}`;
      params.push(requestingCompanyId);
    }
    if (userId)    { query += ` AND ur."UserId"    = $${p++}`; params.push(parseInt(userId));    }
    if (roleId)    { query += ` AND ur."RoleId"    = $${p++}`; params.push(parseInt(roleId));    }
    if (companyId) { query += ` AND ur."CompanyId" = $${p++}`; params.push(parseInt(companyId)); }

    query += ' ORDER BY ur."AssignedAt" DESC';

    const result = await appPool.query(query, params);
    return res.status(200).json({ userRoles: result.rows });
  } catch (e) {
    console.error('getUserRoles error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const assignRole = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { userId, roleId, companyId, expiresAt } = req.body;
  const requestingUser   = req.user;
  const requestingRoleId = requestingUser?.roleId || requestingUser?.RoleId;

  try {
    // Permission check: only SuperAdmin or CompanyAdmin may assign
    if (requestingRoleId !== 1 && requestingRoleId !== 2) {
      return res.status(403).json({ message: 'Insufficient privileges to assign roles' });
    }

    // CompanyAdmin cannot assign roles ≥ their own (roleId 1 or 2)
    if (requestingRoleId === 2 && parseInt(roleId) <= 2) {
      return res.status(403).json({ message: 'CompanyAdmin cannot assign SuperAdmin or CompanyAdmin roles' });
    }

    // CompanyAdmin can only assign within their company
    if (requestingRoleId === 2) {
      const adminCompany = requestingUser.companyId || requestingUser.CompanyId;
      if (companyId && parseInt(companyId) !== adminCompany) {
        return res.status(403).json({ message: 'Cross-company role assignment not allowed' });
      }
    }

    const result = await appPool.query(`
      INSERT INTO "UserRoles" ("UserId","RoleId","CompanyId","AssignedBy","ExpiresAt","IsActive","IsDeleted","AssignedAt","CreatedAt","UpdatedAt")
      VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,NOW(),NOW(),NOW())
      ON CONFLICT ("UserId","RoleId","CompanyId") DO UPDATE
        SET "IsActive"  = TRUE,
            "IsDeleted" = FALSE,
            "AssignedBy"= EXCLUDED."AssignedBy",
            "ExpiresAt" = EXCLUDED."ExpiresAt",
            "UpdatedAt" = NOW()
      RETURNING *
    `, [userId, roleId, companyId || null, getUserId(req), expiresAt || null]);

    await logRoleAssignment({
      assignedBy: getUserId(req), targetUserId: userId, roleId,
      action: 'ASSIGN_ROLE',
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Role assigned', userRole: result.rows[0] });
  } catch (e) {
    console.error('assignRole error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const revokeRole = async (req, res) => {
  const requestingRoleId = req.user?.roleId || req.user?.RoleId;
  if (requestingRoleId !== 1 && requestingRoleId !== 2) {
    return res.status(403).json({ message: 'Insufficient privileges to revoke roles' });
  }
  const { userRoleId } = req.params;
  try {
    const old = await appPool.query(`SELECT * FROM "UserRoles" WHERE "UserRoleId" = $1`, [userRoleId]);
    if (!old.rows.length) return res.status(404).json({ message: 'UserRole record not found' });

    await appPool.query(`
      UPDATE "UserRoles" SET "IsActive"=FALSE,"IsDeleted"=TRUE,"UpdatedAt"=NOW() WHERE "UserRoleId"=$1
    `, [userRoleId]);

    await logRoleAssignment({
      assignedBy: getUserId(req), targetUserId: old.rows[0].UserId, roleId: old.rows[0].RoleId,
      action: 'REVOKE_ROLE',
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Role revoked' });
  } catch (e) {
    console.error('revokeRole error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const getRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  try {
    const result = await appPool.query(`
      SELECT rp."RolePermissionId", rp."RoleId", rp."PermissionId",
             rp."IsGranted", rp."GrantedAt",
             p."PermissionKey", p."PermissionName", p."Action",
             m."ModuleKey", m."ModuleName"
      FROM "RolePermissions" rp
      JOIN "Permissions" p ON p."PermissionId" = rp."PermissionId"
      JOIN "Modules"     m ON m."ModuleId"     = p."ModuleId"
      WHERE rp."RoleId" = $1
        AND rp."IsActive"   = TRUE
        AND rp."IsDeleted"  = FALSE
        AND p."IsActive"    = TRUE
        AND m."IsDeleted"   = FALSE
      ORDER BY m."DisplayOrder", p."Action"
    `, [roleId]);
    return res.status(200).json({ roleId: parseInt(roleId), permissions: result.rows });
  } catch (e) {
    console.error('getRolePermissions error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const assignPermissionsToRole = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;
  if (!isPrivileged(req.user)) return res.status(403).json({ message: 'Insufficient privileges' });

  const { roleId } = req.params;
  const { permissionIds } = req.body;

  // CompanyAdmin cannot grant permissions to SuperAdmin or CompanyAdmin roles
  const requestingRoleId = req.user?.roleId || req.user?.RoleId;
  if (requestingRoleId === 2 && parseInt(roleId) <= 2) {
    return res.status(403).json({ message: 'CompanyAdmin cannot modify SuperAdmin/CompanyAdmin permissions' });
  }

  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    for (const permId of permissionIds) {
      await client.query(`
        INSERT INTO "RolePermissions" ("RoleId","PermissionId","IsGranted","GrantedBy","IsActive","IsDeleted","GrantedAt","CreatedAt","UpdatedAt")
        VALUES ($1,$2,TRUE,$3,TRUE,FALSE,NOW(),NOW(),NOW())
        ON CONFLICT ("RoleId","PermissionId") DO UPDATE
          SET "IsGranted"  = TRUE,
              "GrantedBy"  = EXCLUDED."GrantedBy",
              "GrantedAt"  = NOW(),
              "IsActive"   = TRUE,
              "IsDeleted"  = FALSE,
              "UpdatedAt"  = NOW()
      `, [roleId, permId, getUserId(req)]);
    }
    await client.query('COMMIT');
    invalidateRoleCache(parseInt(roleId));

    await logPermissionChange({
      userId: getUserId(req), roleId: parseInt(roleId),
      action: 'GRANT_PERMISSIONS',
      permissionId: null, permissionKey: `bulk:${permissionIds.length} permissions`,
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: `${permissionIds.length} permissions granted to role ${roleId}` });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('assignPermissionsToRole error:', e);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

const revokePermissionFromRole = async (req, res) => {
  if (!isPrivileged(req.user)) return res.status(403).json({ message: 'Insufficient privileges' });
  const { roleId, permissionId } = req.params;

  try {
    await appPool.query(`
      UPDATE "RolePermissions" SET "IsGranted"=FALSE,"IsActive"=FALSE,"UpdatedAt"=NOW()
      WHERE "RoleId"=$1 AND "PermissionId"=$2
    `, [roleId, permissionId]);
    invalidateRoleCache(parseInt(roleId));

    await logPermissionChange({
      userId: getUserId(req), roleId: parseInt(roleId),
      action: 'REVOKE_PERMISSION', permissionId: parseInt(permissionId), permissionKey: '',
      ipAddress: getIp(req), userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Permission revoked from role' });
  } catch (e) {
    console.error('revokePermissionFromRole error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MENU PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const getMenuPermissions = async (req, res) => {
  const { roleId } = req.params;
  try {
    const result = await appPool.query(`
      SELECT mp."MenuPermissionId", mp."RoleId", mp."MenuId",
             mp."CanView", mp."CanCreate", mp."CanEdit", mp."CanDelete",
             mp."GrantedAt", mp."IsActive",
             m."MenuName", m."MenuKey", m."MenuPath", m."MenuType"
      FROM "MenuPermissions" mp
      JOIN "Menus" m ON m."MenuId" = mp."MenuId"
      WHERE mp."RoleId"     = $1
        AND mp."IsActive"   = TRUE
        AND mp."IsDeleted"  = FALSE
        AND m."IsDeleted"   = FALSE
      ORDER BY m."DisplayOrder"
    `, [roleId]);
    return res.status(200).json({ roleId: parseInt(roleId), menuPermissions: result.rows });
  } catch (e) {
    console.error('getMenuPermissions error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

const setMenuPermissions = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;
  if (!isPrivileged(req.user)) return res.status(403).json({ message: 'Insufficient privileges' });

  const { roleId } = req.params;
  const { menuPermissions } = req.body; // [{ menuId, canView, canCreate, canEdit, canDelete }]

  const requestingRoleId = req.user?.roleId || req.user?.RoleId;
  if (requestingRoleId === 2 && parseInt(roleId) <= 2) {
    return res.status(403).json({ message: 'CompanyAdmin cannot modify SuperAdmin/CompanyAdmin menus' });
  }

  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    for (const mp of menuPermissions) {
      await client.query(`
        INSERT INTO "MenuPermissions"
          ("RoleId","MenuId","CanView","CanCreate","CanEdit","CanDelete","GrantedBy","IsActive","IsDeleted","GrantedAt","CreatedAt","UpdatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,FALSE,NOW(),NOW(),NOW())
        ON CONFLICT ("RoleId","MenuId") DO UPDATE
          SET "CanView"   = EXCLUDED."CanView",
              "CanCreate" = EXCLUDED."CanCreate",
              "CanEdit"   = EXCLUDED."CanEdit",
              "CanDelete" = EXCLUDED."CanDelete",
              "GrantedBy" = EXCLUDED."GrantedBy",
              "IsActive"  = TRUE,
              "IsDeleted" = FALSE,
              "UpdatedAt" = NOW()
      `, [roleId, mp.menuId,
          mp.canView  ?? true,
          mp.canCreate ?? false,
          mp.canEdit   ?? false,
          mp.canDelete ?? false,
          getUserId(req)]);
    }
    await client.query('COMMIT');

    return res.status(200).json({ message: `Menu permissions set for role ${roleId}` });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('setMenuPermissions error:', e);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER PERMISSIONS SUMMARY (GET /rbac/users/:userId/permissions)
// ─────────────────────────────────────────────────────────────────────────────

const getUserPermissionsSummary = async (req, res) => {
  const targetUserId = parseInt(req.params.userId, 10);
  const requestingUser = req.user;
  const requestingRoleId = requestingUser?.roleId || requestingUser?.RoleId;

  // Users can view their own permissions; admins can view any
  if (getUserId(req) !== targetUserId && requestingRoleId !== 1 && requestingRoleId !== 2) {
    return res.status(403).json({ message: 'Cannot view permissions of another user' });
  }

  try {
    const result = await appPool.query(`
      SELECT DISTINCT
        p."PermissionId", p."PermissionKey", p."PermissionName",
        p."Action", m."ModuleKey", m."ModuleName"
      FROM "UserRoles" ur
      JOIN "RolePermissions" rp ON rp."RoleId"      = ur."RoleId"
      JOIN "Permissions"     p  ON p."PermissionId" = rp."PermissionId"
      JOIN "Modules"         m  ON m."ModuleId"     = p."ModuleId"
      WHERE ur."UserId"     = $1
        AND ur."IsActive"   = TRUE
        AND ur."IsDeleted"  = FALSE
        AND (ur."ExpiresAt" IS NULL OR ur."ExpiresAt" > NOW())
        AND rp."IsGranted"  = TRUE
        AND rp."IsActive"   = TRUE
        AND p."IsActive"    = TRUE
        AND m."IsDeleted"   = FALSE
      ORDER BY m."ModuleName", p."Action"
    `, [targetUserId]);

    return res.status(200).json({ userId: targetUserId, permissions: result.rows });
  } catch (e) {
    console.error('getUserPermissionsSummary error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Modules
  getModules, getModuleById, createModule, updateModule, deleteModule,
  // Permissions
  getAllPermissions, createPermission, deletePermission,
  // Menus
  getMenus, getUserMenus, createMenu, updateMenu, deleteMenu,
  // UserRoles
  getUserRoles, assignRole, revokeRole,
  // RolePermissions
  getRolePermissions, assignPermissionsToRole, revokePermissionFromRole,
  // MenuPermissions
  getMenuPermissions, setMenuPermissions,
  // User summary
  getUserPermissionsSummary,
};
