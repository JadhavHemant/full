// Import js-cookie for managing browser cookies
import Cookies from "js-cookie";
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

/**
 * Check if the user is a Super Admin
 * Super Admin has roleId 1 or roleName "super admin"
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user is Super Admin
 */
export const isSuperAdminUser = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === 1 || roleName === "super admin";
};

/**
 * Check if the user is an Admin
 * Admin has roleId 2 or roleName "admin"
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user is Admin
 */
export const isAdminUser = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return roleId === 2 || roleName === "admin";
};

/**
 * Check if the user can access the Admin Portal
 * User must be either Super Admin or Admin
 * @param {object} user - User object (defaults to current session user)
 * @returns {boolean} True if user can access Admin Portal
 */
export const canAccessAdminPortal = (user = getSessionUser()) =>
  isSuperAdminUser(user) || isAdminUser(user);

/**
 * Get the default portal path for the user
 * Returns "/Admin" for admin users, "/user" for regular users
 * @param {object} user - User object (defaults to current session user)
 * @returns {string} Default portal path
 */
export const getDefaultPortalPath = (user = getSessionUser()) =>
  canAccessAdminPortal(user) ? "/Admin" : "/user";
