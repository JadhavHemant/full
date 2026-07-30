// Import js-cookie for managing browser cookies
import Cookies from "js-cookie";
import { API_BASE_URL } from "../Components/Endpoint/Endpoint";
// Import token utility functions for JWT management
import { getUserFromToken } from "../Components/AdminSite/utils/tokenUtils";

/**
 * Normalize role name to lowercase string for consistent comparison
 * @param {string} value - Role name to normalize
 * @returns {string} Normalized role name
 */
const normalizeRoleName = (value) => String(value || "").trim().toLowerCase();

/**
 * Get the current session user from cookies or token
 * First tries to get user data from the 'user' cookie
 * Falls back to extracting user data from the JWT token
 * @returns {object|null} User object or null if not found
 */
export const getSessionUser = () => {
  try {
    // Try to get user from cookie first
    const rawUser = Cookies.get("user");
    if (rawUser) {
      return JSON.parse(rawUser);
    }
  } catch {
    // If parsing fails, fall back to token payload
  }

  // Fall back to extracting user from JWT token
  return getUserFromToken() || null;
};

// Role ID constants - loaded dynamically from backend
// Exported for use in components that need role-based logic
export let SUPER_ADMIN_ROLE_ID = 1;
export let ADMIN_ROLE_ID = 2;
export let MANAGER_ROLE_ID = 3;

/**
 * Load role configuration from backend
 */
export const loadRoleConfig = async () => {
  try {
    const token = Cookies.get("accessToken");
    const response = await fetch(`${API_BASE_URL}/roles/config`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (response.ok) {
      const config = await response.json();
      SUPER_ADMIN_ROLE_ID = config.SUPERADMIN || 1;
      ADMIN_ROLE_ID = config.ADMIN || 2;
      MANAGER_ROLE_ID = config.MANAGER || 3;
    }
  } catch (error) {
    console.warn('Could not load role config from backend, using defaults:', error);
  }
};

/**
 * Check if the user is a Super Admin
 * Super Admin has roleId matching SUPER_ADMIN_ROLE_ID or roleName "super admin"
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user is Super Admin
 */
export const isSuperAdminUser = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === SUPER_ADMIN_ROLE_ID || roleName === "super admin";
};

/**
 * Check if the user is an Admin
 * Admin has roleId matching ADMIN_ROLE_ID or roleName "admin"
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user is Admin
 */
export const isAdminUser = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === ADMIN_ROLE_ID || roleName === "admin";
};

/**
 * Check if the user can access the Admin Portal
 * User must be either Super Admin, Admin, or have a user type
 * that includes ERP/CRM modules (user types 1-6)
 * User types 7-9 (Support, Employee, Viewer) use the limited User Portal
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user can access Admin Portal
 */
export const canAccessAdminPortal = (user = getSessionUser()) => {
  if (isSuperAdminUser(user) || isAdminUser(user)) {
    return true;
  }

  // Allow user types 3-6 (Company Owner, Manager, Team Lead, Sales Executive)
  // to access the Admin portal since they have ERP/CRM module permissions
  const userTypeId = Number(user?.userTypeId ?? user?.UserTypeId ?? 0);
  return [3, 4, 5, 6].includes(userTypeId);
};

/**
 * Get the default portal path for the user
 * Returns "/Admin" for admin users, "/user" for regular users
 * @param {object} user - User object (defaults to current session user)
 * @returns {string} Default portal path
 */
export const getDefaultPortalPath = (user = getSessionUser()) =>
  canAccessAdminPortal(user) ? "/Admin" : "/user";
