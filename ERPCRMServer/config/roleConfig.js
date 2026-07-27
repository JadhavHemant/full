/**
 * Centralized Role Configuration
 * 
 * This file defines all role-related constants and helper functions.
 * Role IDs are loaded dynamically from the database at startup.
 * Use this instead of hardcoding role IDs or role names throughout the codebase.
 */

const { appPool } = require('../config/db');

// Default fallback role IDs (used before DB is available)
let ROLE_IDS = {
  SUPERADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  EMPLOYEE: 4,
  CUSTOMER: 5,
};

// Async function to load role IDs from database
const loadRoleIdsFromDb = async () => {
  try {
    const result = await appPool.query(
      `SELECT "Id", "RoleName" FROM "Roles" WHERE "IsActive" = TRUE AND COALESCE("IsDeleted", FALSE) = FALSE`
    );
    
    const roleMap = new Map();
    result.rows.forEach(row => {
      roleMap.set(row.RoleName.toLowerCase(), row.Id);
    });

    ROLE_IDS = {
      SUPERADMIN: roleMap.get('superadmin') || ROLE_IDS.SUPERADMIN,
      ADMIN: roleMap.get('admin') || ROLE_IDS.ADMIN,
      MANAGER: roleMap.get('manager') || ROLE_IDS.MANAGER,
      EMPLOYEE: roleMap.get('employee') || ROLE_IDS.EMPLOYEE,
      CUSTOMER: roleMap.get('customer') || ROLE_IDS.CUSTOMER,
    };

    return ROLE_IDS;
  } catch (error) {
    console.warn('⚠️ roleConfig: Could not load role IDs from DB, using defaults:', error.message);
    return ROLE_IDS;
  }
};

// Role name mappings (lowercase for comparisons)
const ROLE_NAMES = {
  [ROLE_IDS.SUPERADMIN]: 'superadmin',
  [ROLE_IDS.ADMIN]: 'admin',
  [ROLE_IDS.MANAGER]: 'manager',
  [ROLE_IDS.EMPLOYEE]: 'employee',
  [ROLE_IDS.CUSTOMER]: 'customer',
};

// Reverse mapping: name -> id
const ROLE_NAME_TO_ID = {
  [ROLE_NAMES[ROLE_IDS.SUPERADMIN]]: ROLE_IDS.SUPERADMIN,
  [ROLE_NAMES[ROLE_IDS.ADMIN]]: ROLE_IDS.ADMIN,
  [ROLE_NAMES[ROLE_IDS.MANAGER]]: ROLE_IDS.MANAGER,
  [ROLE_NAMES[ROLE_IDS.EMPLOYEE]]: ROLE_IDS.EMPLOYEE,
  [ROLE_NAMES[ROLE_IDS.CUSTOMER]]: ROLE_IDS.CUSTOMER,
};

// Helper to get current ROLE_IDS (in case they were loaded from DB)
const getRoleIds = () => ROLE_IDS;

// Role sets for quick checks (will be updated after DB load)
let PRIVILEGED_ROLE_IDS = new Set([ROLE_IDS.SUPERADMIN, ROLE_IDS.ADMIN]);
let PRIVILEGED_ROLE_NAMES = new Set([ROLE_NAMES[ROLE_IDS.SUPERADMIN], ROLE_NAMES[ROLE_IDS.ADMIN]]);
let NON_CUSTOMER_ROLE_IDS = new Set([ROLE_IDS.SUPERADMIN, ROLE_IDS.ADMIN, ROLE_IDS.MANAGER, ROLE_IDS.EMPLOYEE]);
let ASSIGNABLE_ROLE_IDS = new Set([ROLE_IDS.ADMIN, ROLE_IDS.MANAGER, ROLE_IDS.EMPLOYEE]); // roles that can be assigned by superadmin

// Function to update role sets after loading from DB
const updateRoleSets = () => {
  PRIVILEGED_ROLE_IDS = new Set([ROLE_IDS.SUPERADMIN, ROLE_IDS.ADMIN]);
  PRIVILEGED_ROLE_NAMES = new Set([ROLE_NAMES[ROLE_IDS.SUPERADMIN], ROLE_NAMES[ROLE_IDS.ADMIN]]);
  NON_CUSTOMER_ROLE_IDS = new Set([ROLE_IDS.SUPERADMIN, ROLE_IDS.ADMIN, ROLE_IDS.MANAGER, ROLE_IDS.EMPLOYEE]);
  ASSIGNABLE_ROLE_IDS = new Set([ROLE_IDS.ADMIN, ROLE_IDS.MANAGER, ROLE_IDS.EMPLOYEE]);
};

// Default permissions for roles without custom DB permissions
const ROLE_DEFAULTS = {
  [ROLE_IDS.MANAGER]: { view: true, create: true, edit: true, delete: false, export: false },
  [ROLE_IDS.EMPLOYEE]: { view: true, create: true, edit: false, delete: false, export: false },
  [ROLE_IDS.CUSTOMER]: { view: true, create: false, edit: false, delete: false, export: false },
};

// Customer-allowed modules (read-only)
const CUSTOMER_ALLOWED_MODULES = {
  'sales-orders': ['view'],
  'invoices': ['view'],
  'customers': ['view'],
};

// Helper: normalize role name for comparisons
const normalizeRoleName = (value) => String(value || "").trim().toLowerCase();

// Helper: check if user is superadmin by roleId or roleName
const isSuperAdmin = (user) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === ROLE_IDS.SUPERADMIN || roleName === ROLE_NAMES[ROLE_IDS.SUPERADMIN];
};

// Helper: check if user is admin or superadmin by roleId or roleName
const isAdminOrSuperAdmin = (user) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === ROLE_IDS.SUPERADMIN || roleId === ROLE_IDS.ADMIN ||
         PRIVILEGED_ROLE_NAMES.has(roleName);
};

// Helper: resolve numeric roleId from user object
const resolveRoleId = (user) => {
  if (user?.roleId) return Number(user.roleId);
  if (user?.RoleId) return Number(user.RoleId);
  if (user?.roleName) {
    const mapped = ROLE_NAME_TO_ID[normalizeRoleName(user.roleName)];
    if (mapped) return mapped;
  }
  if (user?.RoleName) {
    const mapped = ROLE_NAME_TO_ID[normalizeRoleName(user.RoleName)];
    if (mapped) return mapped;
  }
  return null;
};

// Helper: get role name from roleId
const getRoleName = (roleId) => {
  return ROLE_NAMES[Number(roleId)] || null;
};

module.exports = {
  ROLE_IDS,
  ROLE_NAMES,
  ROLE_NAME_TO_ID,
  PRIVILEGED_ROLE_IDS,
  PRIVILEGED_ROLE_NAMES,
  NON_CUSTOMER_ROLE_IDS,
  ASSIGNABLE_ROLE_IDS,
  ROLE_DEFAULTS,
  CUSTOMER_ALLOWED_MODULES,
  normalizeRoleName,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  resolveRoleId,
  getRoleName,
  loadRoleIdsFromDb,
  updateRoleSets,
  getRoleIds,
};
