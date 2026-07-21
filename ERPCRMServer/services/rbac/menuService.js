const { appPool } = require('../../config/db');

/**
 * Menu Service
 * 
 * Handles menu generation based on user roles and permissions.
 */

/**
 * Get user's accessible menus with hierarchy
 */
const getUserMenus = async (userId) => {
  // Get all menus user has access to through their roles
  const result = await appPool.query(
    `SELECT DISTINCT
       m."MenuId",
       m."MenuName",
       m."MenuKey",
       m."MenuPath",
       m."MenuIcon",
       m."MenuType",
       m."DisplayOrder",
       m."ParentMenuId",
       mp."CanView",
       mp."CanCreate",
       mp."CanEdit",
       mp."CanDelete",
       mod."ModuleKey"
     FROM "Menus" m
     LEFT JOIN "MenuPermissions" mp ON m."MenuId" = mp."MenuId"
     LEFT JOIN "UserRoles" ur ON mp."RoleId" = ur."RoleId"
     LEFT JOIN "Modules" mod ON m."ModuleId" = mod."ModuleId"
     WHERE (ur."UserId" = $1 OR ur."UserId" IS NULL)
       AND m."IsVisible" = TRUE
       AND m."IsActive" = TRUE
       AND m."IsDeleted" = FALSE
       AND (mp."CanView" = TRUE OR mp."CanView" IS NULL)
       AND (ur."IsActive" = TRUE OR ur."IsActive" IS NULL)
       AND (ur."IsDeleted" = FALSE OR ur."IsDeleted" IS NULL)
     ORDER BY m."DisplayOrder"`,
    [userId]
  );

  return buildMenuHierarchy(result.rows);
};

/**
 * Build hierarchical menu structure
 */
const buildMenuHierarchy = (menus) => {
  const menuMap = {};
  const rootMenus = [];

  // First pass: create menu map
  menus.forEach(menu => {
    menuMap[menu.MenuId] = {
      ...menu,
      children: []
    };
  });

  // Second pass: build hierarchy
  menus.forEach(menu => {
    if (menu.ParentMenuId === null) {
      rootMenus.push(menuMap[menu.MenuId]);
    } else if (menuMap[menu.ParentMenuId]) {
      menuMap[menu.ParentMenuId].children.push(menuMap[menu.MenuId]);
    }
  });

  return rootMenus;
};

/**
 * Get all menus (admin view)
 */
const getAllMenus = async () => {
  const result = await appPool.query(
    `SELECT 
       m."MenuId",
       m."MenuName",
       m."MenuKey",
       m."MenuPath",
       m."MenuIcon",
       m."MenuType",
       m."DisplayOrder",
       m."ParentMenuId",
       m."IsVisible",
       m."IsActive",
       mod."ModuleKey",
       mod."ModuleName"
     FROM "Menus" m
     LEFT JOIN "Modules" mod ON m."ModuleId" = mod."ModuleId"
     WHERE m."IsDeleted" = FALSE
     ORDER BY m."DisplayOrder"`
  );

  return buildMenuHierarchy(result.rows);
};

/**
 * Assign menu to role
 */
const assignMenuToRole = async (roleId, menuId, permissions, grantedBy) => {
  await appPool.query(
    `INSERT INTO "MenuPermissions" (
       "RoleId", "MenuId", "CanView", "CanCreate", "CanEdit", "CanDelete", 
       "GrantedBy", "IsActive"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     ON CONFLICT ("RoleId", "MenuId") 
     DO UPDATE SET
       "CanView" = $3,
       "CanCreate" = $4,
       "CanEdit" = $5,
       "CanDelete" = $6,
       "GrantedBy" = $7,
       "GrantedAt" = NOW(),
       "IsActive" = TRUE,
       "UpdatedAt" = NOW()`,
    [
      roleId,
      menuId,
      permissions.canView || true,
      permissions.canCreate || false,
      permissions.canEdit || false,
      permissions.canDelete || false,
      grantedBy
    ]
  );

  return { success: true, message: 'Menu assigned to role' };
};

/**
 * Get menu permissions for a role
 */
const getRoleMenuPermissions = async (roleId) => {
  const result = await appPool.query(
    `SELECT 
       mp."MenuPermissionId",
       mp."CanView",
       mp."CanCreate",
       mp."CanEdit",
       mp."CanDelete",
       m."MenuId",
       m."MenuName",
       m."MenuKey",
       m."MenuPath"
     FROM "MenuPermissions" mp
     JOIN "Menus" m ON mp."MenuId" = m."MenuId"
     WHERE mp."RoleId" = $1
       AND mp."IsActive" = TRUE
       AND m."IsActive" = TRUE
     ORDER BY m."DisplayOrder"`,
    [roleId]
  );

  return result.rows;
};

/**
 * Remove menu from role
 */
const removeMenuFromRole = async (roleId, menuId) => {
  await appPool.query(
    `DELETE FROM "MenuPermissions"
     WHERE "RoleId" = $1 AND "MenuId" = $2`,
    [roleId, menuId]
  );

  return { success: true, message: 'Menu removed from role' };
};

module.exports = {
  getUserMenus,
  getAllMenus,
  assignMenuToRole,
  getRoleMenuPermissions,
  removeMenuFromRole,
  buildMenuHierarchy,
};
