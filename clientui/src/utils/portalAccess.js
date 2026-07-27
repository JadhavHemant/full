// src/utils/portalAccess.js
// Utility functions for determining portal access permissions

// Import React hooks
import { useMemo } from "react";
// Import React Router hooks
import { useLocation } from "react-router-dom";
// Import session user utilities
import { getSessionUser } from "./sessionUser";

// Role ID constants - loaded dynamically from backend if available
let SUPER_ADMIN_ROLE_ID = 1;
let ADMIN_ROLE_ID = 2;

/**
 * Fetch role configuration from backend API
 */
export const loadRoleConfig = async () => {
  try {
    const response = await fetch('/api/roles/config', {
      headers: { 'Authorization': `Bearer ${getSessionUser()?.token || ''}` }
    });
    if (response.ok) {
      const config = await response.json();
      SUPER_ADMIN_ROLE_ID = config.SUPERADMIN || 1;
      ADMIN_ROLE_ID = config.ADMIN || 2;
    }
  } catch (error) {
    console.warn('Could not load role config from backend, using defaults:', error);
  }
};

/**
 * Normalize role name to lowercase string for consistent comparison
 * @param {string} value - Role name to normalize
 * @returns {string} Normalized role name
 */
const normalizeRoleName = (value) => String(value || "").trim().toLowerCase();

/**
 * Get portal access information for a user
 * Determines user roles, portal type, and permission levels
 * @param {string} pathname - Current route pathname (default: "")
 * @param {object} user - User object (defaults to current session user)
 * @returns {object} Portal access information object
 */
export const getPortalAccess = (pathname = "", user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const hierarchyLevel = Number(user?.hierarchyLevel ?? user?.HierarchyLevel ?? -1);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  const isSuperAdmin = roleId === SUPER_ADMIN_ROLE_ID || roleName === "super admin";
  const isAdmin = roleId === ADMIN_ROLE_ID || roleName === "admin";
  const isAdminPortal = pathname.startsWith("/Admin");
  const isUserPortal = pathname.startsWith("/user");
  const canManageRestrictedActions =
    isAdminPortal && (isSuperAdmin || (isAdmin && (hierarchyLevel === 1 || hierarchyLevel === 2)));

  return {
    roleId,
    roleName,
    hierarchyLevel,
    isSuperAdmin,
    isAdmin,
    isAdminPortal,
    isUserPortal,
    canManageRestrictedActions,
  };
};

/**
 * React hook to get portal access information
 * Automatically uses current location pathname
 * @returns {object} Portal access information object
 */
export const usePortalAccess = () => {
  const location = useLocation();

  return useMemo(() => getPortalAccess(location.pathname), [location.pathname]);
};
