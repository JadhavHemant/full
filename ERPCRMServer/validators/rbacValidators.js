'use strict';

/**
 * RBAC Validators
 * express-validator rules for all RBAC management endpoints.
 */

const { body, param, query } = require('express-validator');

// ─────────────────────────────────────────────────────────────────────────────
// Modules
// ─────────────────────────────────────────────────────────────────────────────

const validateCreateModule = [
  body('moduleName')
    .trim().notEmpty().withMessage('moduleName is required')
    .isLength({ max: 100 }).withMessage('moduleName max 100 chars'),
  body('moduleKey')
    .trim().notEmpty().withMessage('moduleKey is required')
    .isLength({ max: 50 }).withMessage('moduleKey max 50 chars')
    .matches(/^[a-zA-Z][a-zA-Z0-9._-]*$/).withMessage('moduleKey must be alphanumeric (dots, dashes, underscores allowed)'),
  body('description').optional({ nullable: true }).isString(),
  body('parentModuleId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('parentModuleId must be a positive integer'),
  body('icon').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('displayOrder').optional({ nullable: true }).isInt({ min: 0 }),
];

const validateUpdateModule = [
  param('moduleId').isInt({ min: 1 }).withMessage('moduleId must be a positive integer'),
  body('moduleName').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional({ nullable: true }).isString(),
  body('parentModuleId').optional({ nullable: true }).isInt({ min: 1 }),
  body('icon').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('displayOrder').optional({ nullable: true }).isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
];

const validateModuleId = [
  param('moduleId').isInt({ min: 1 }).withMessage('moduleId must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────────────────────

const validateCreatePermission = [
  body('moduleId').isInt({ min: 1 }).withMessage('moduleId is required'),
  body('permissionName').trim().notEmpty().withMessage('permissionName is required').isLength({ max: 100 }),
  body('permissionKey')
    .trim().notEmpty().withMessage('permissionKey is required')
    .isLength({ max: 100 })
    .matches(/^[a-zA-Z][a-zA-Z0-9._-]*\.[a-zA-Z]+$/).withMessage('permissionKey format: module.action'),
  body('action')
    .notEmpty().withMessage('action is required')
    .isIn(['create','read','update','delete','approve','export','import','view','print','manage','assign'])
    .withMessage('action must be one of: create, read, update, delete, approve, export, import, view, print, manage, assign'),
  body('description').optional({ nullable: true }).isString(),
];

const validatePermissionId = [
  param('permissionId').isInt({ min: 1 }).withMessage('permissionId must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// Menus
// ─────────────────────────────────────────────────────────────────────────────

const validateCreateMenu = [
  body('menuName').trim().notEmpty().withMessage('menuName is required').isLength({ max: 100 }),
  body('menuKey')
    .trim().notEmpty().withMessage('menuKey is required')
    .isLength({ max: 100 })
    .matches(/^[a-zA-Z][a-zA-Z0-9._-]*$/).withMessage('menuKey must be alphanumeric (dots, dashes, underscores allowed)'),
  body('moduleId').optional({ nullable: true }).isInt({ min: 1 }),
  body('parentMenuId').optional({ nullable: true }).isInt({ min: 1 }),
  body('menuPath').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('menuIcon').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('displayOrder').optional({ nullable: true }).isInt({ min: 0 }),
  body('menuType')
    .optional()
    .isIn(['menu','submenu','action','separator','heading'])
    .withMessage('menuType must be: menu, submenu, action, separator, or heading'),
];

const validateUpdateMenu = [
  param('menuId').isInt({ min: 1 }).withMessage('menuId must be a positive integer'),
  body('menuName').optional().trim().isLength({ min: 1, max: 100 }),
  body('menuPath').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('menuIcon').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('displayOrder').optional({ nullable: true }).isInt({ min: 0 }),
  body('menuType').optional().isIn(['menu','submenu','action','separator','heading']),
  body('isVisible').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

const validateMenuId = [
  param('menuId').isInt({ min: 1 }).withMessage('menuId must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// UserRoles
// ─────────────────────────────────────────────────────────────────────────────

const validateAssignRole = [
  body('userId').isInt({ min: 1 }).withMessage('userId is required'),
  body('roleId').isInt({ min: 1 }).withMessage('roleId is required'),
  body('companyId').optional({ nullable: true }).isInt({ min: 1 }),
  body('expiresAt').optional({ nullable: true }).isISO8601().withMessage('expiresAt must be a valid ISO 8601 date'),
];

const validateRevokeRole = [
  param('userRoleId').isInt({ min: 1 }).withMessage('userRoleId must be a positive integer'),
];

const validateUserRoleQuery = [
  query('userId').optional().isInt({ min: 1 }),
  query('roleId').optional().isInt({ min: 1 }),
  query('companyId').optional().isInt({ min: 1 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// RolePermissions
// ─────────────────────────────────────────────────────────────────────────────

const validateAssignPermissionToRole = [
  param('roleId').isInt({ min: 1 }).withMessage('roleId must be a positive integer'),
  body('permissionIds')
    .isArray({ min: 1 }).withMessage('permissionIds must be a non-empty array')
    .custom((arr) => arr.every(id => Number.isInteger(id) && id > 0))
    .withMessage('Each permissionId must be a positive integer'),
];

const validateRolePermissionsRoleId = [
  param('roleId').isInt({ min: 1 }).withMessage('roleId must be a positive integer'),
];

const validateRevokePermissionFromRole = [
  param('roleId').isInt({ min: 1 }).withMessage('roleId must be a positive integer'),
  param('permissionId').isInt({ min: 1 }).withMessage('permissionId must be a positive integer'),
];

// ─────────────────────────────────────────────────────────────────────────────
// MenuPermissions
// ─────────────────────────────────────────────────────────────────────────────

const validateSetMenuPermissions = [
  param('roleId').isInt({ min: 1 }).withMessage('roleId must be a positive integer'),
  body('menuPermissions')
    .isArray({ min: 1 }).withMessage('menuPermissions must be a non-empty array'),
  body('menuPermissions.*.menuId').isInt({ min: 1 }).withMessage('Each menuId must be a positive integer'),
  body('menuPermissions.*.canView').optional().isBoolean(),
  body('menuPermissions.*.canCreate').optional().isBoolean(),
  body('menuPermissions.*.canEdit').optional().isBoolean(),
  body('menuPermissions.*.canDelete').optional().isBoolean(),
];

const validateMenuPermissionsRoleId = [
  param('roleId').isInt({ min: 1 }).withMessage('roleId must be a positive integer'),
];

module.exports = {
  validateCreateModule,
  validateUpdateModule,
  validateModuleId,
  validateCreatePermission,
  validatePermissionId,
  validateCreateMenu,
  validateUpdateMenu,
  validateMenuId,
  validateAssignRole,
  validateRevokeRole,
  validateUserRoleQuery,
  validateAssignPermissionToRole,
  validateRolePermissionsRoleId,
  validateRevokePermissionFromRole,
  validateSetMenuPermissions,
  validateMenuPermissionsRoleId,
};
