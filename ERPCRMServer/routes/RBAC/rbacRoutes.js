'use strict';

/**
 * RBAC Routes  — mounted at /api/rbac
 *
 * Modules:
 *   GET    /api/rbac/modules
 *   GET    /api/rbac/modules/:moduleId
 *   POST   /api/rbac/modules
 *   PUT    /api/rbac/modules/:moduleId
 *   DELETE /api/rbac/modules/:moduleId
 *
 * Permissions:
 *   GET    /api/rbac/permissions
 *   POST   /api/rbac/permissions
 *   DELETE /api/rbac/permissions/:permissionId
 *
 * Menus:
 *   GET    /api/rbac/menus
 *   GET    /api/rbac/menus/my-menus          (authenticated user's visible menus)
 *   POST   /api/rbac/menus
 *   PUT    /api/rbac/menus/:menuId
 *   DELETE /api/rbac/menus/:menuId
 *
 * User Roles:
 *   GET    /api/rbac/user-roles
 *   POST   /api/rbac/user-roles
 *   DELETE /api/rbac/user-roles/:userRoleId
 *
 * Role Permissions:
 *   GET    /api/rbac/roles/:roleId/permissions
 *   POST   /api/rbac/roles/:roleId/permissions
 *   DELETE /api/rbac/roles/:roleId/permissions/:permissionId
 *
 * Menu Permissions:
 *   GET    /api/rbac/roles/:roleId/menu-permissions
 *   POST   /api/rbac/roles/:roleId/menu-permissions
 *
 * User Permission Summary:
 *   GET    /api/rbac/users/:userId/permissions
 */

const express = require('express');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');
const { checkPermission, checkAssignPermission } = require('../../middlewares/rbac');

const {
  getModules, getModuleById, createModule, updateModule, deleteModule,
  getAllPermissions, createPermission, deletePermission,
  getMenus, getUserMenus, createMenu, updateMenu, deleteMenu,
  getUserRoles, assignRole, revokeRole,
  getRolePermissions, assignPermissionsToRole, revokePermissionFromRole,
  getMenuPermissions, setMenuPermissions,
  getUserPermissionsSummary,
} = require('../../controllers/rbac/rbacController');

const {
  validateCreateModule, validateUpdateModule, validateModuleId,
  validateCreatePermission, validatePermissionId,
  validateCreateMenu, validateUpdateMenu, validateMenuId,
  validateAssignRole, validateRevokeRole, validateUserRoleQuery,
  validateAssignPermissionToRole, validateRolePermissionsRoleId, validateRevokePermissionFromRole,
  validateSetMenuPermissions, validateMenuPermissionsRoleId,
} = require('../../validators/rbacValidators');

const router = express.Router();

// All RBAC routes require authentication
router.use(verifyAccessToken);

// ── Modules ───────────────────────────────────────────────────────────────────
router.get   ('/modules',                    checkPermission('roles', 'view'), validateUserRoleQuery, getModules);
router.get   ('/modules/:moduleId',          checkPermission('roles', 'view'), validateModuleId,     getModuleById);
router.post  ('/modules',                    checkAssignPermission, validateCreateModule,  createModule);
router.put   ('/modules/:moduleId',          checkAssignPermission, validateUpdateModule,  updateModule);
router.delete('/modules/:moduleId',          checkAssignPermission, validateModuleId,     deleteModule);

// ── Permissions ───────────────────────────────────────────────────────────────
router.get   ('/permissions',                checkPermission('roles', 'view'), getAllPermissions);
router.post  ('/permissions',                checkAssignPermission, validateCreatePermission, createPermission);
router.delete('/permissions/:permissionId',  checkAssignPermission, validatePermissionId, deletePermission);

// ── Menus ─────────────────────────────────────────────────────────────────────
router.get   ('/menus',                      checkPermission('roles', 'view'), getMenus);
router.get   ('/menus/my-menus',             getUserMenus);
router.post  ('/menus',                      checkAssignPermission, validateCreateMenu,   createMenu);
router.put   ('/menus/:menuId',              checkAssignPermission, validateUpdateMenu,   updateMenu);
router.delete('/menus/:menuId',              checkAssignPermission, validateMenuId,       deleteMenu);

// ── User Roles ────────────────────────────────────────────────────────────────
router.get   ('/user-roles',                 checkPermission('users', 'view'), validateUserRoleQuery, getUserRoles);
router.post  ('/user-roles',                 checkAssignPermission, validateAssignRole,   assignRole);
router.delete('/user-roles/:userRoleId',     checkAssignPermission, validateRevokeRole,   revokeRole);

// ── Role Permissions ──────────────────────────────────────────────────────────
router.get   ('/roles/:roleId/permissions',                checkPermission('roles', 'view'), validateRolePermissionsRoleId, getRolePermissions);
router.post  ('/roles/:roleId/permissions',                checkAssignPermission, validateAssignPermissionToRole, assignPermissionsToRole);
router.delete('/roles/:roleId/permissions/:permissionId',  checkAssignPermission, validateRevokePermissionFromRole, revokePermissionFromRole);

// ── Menu Permissions ──────────────────────────────────────────────────────────
router.get   ('/roles/:roleId/menu-permissions',  checkPermission('roles', 'view'), validateMenuPermissionsRoleId, getMenuPermissions);
router.post  ('/roles/:roleId/menu-permissions',  checkAssignPermission, validateSetMenuPermissions,    setMenuPermissions);

// ── User Permission Summary ───────────────────────────────────────────────────
router.get   ('/users/:userId/permissions',  checkPermission('users', 'view'), getUserPermissionsSummary);

module.exports = router;
