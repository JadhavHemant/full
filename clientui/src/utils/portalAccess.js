// src/utils/portalAccess.js
// Utility functions for determining portal access permissions

// Import React hooks
import { useMemo } from "react";
// Import React Router hooks
import { useLocation } from "react-router-dom";
// Import session user utilities
import {
  getSessionUser,
  isSuperAdminUser,
  isAdminUser,
  canAccessAdminPortal,
} from "./sessionUser";



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
  const isSuperAdmin = isSuperAdminUser(user);
  const isAdmin = isAdminUser(user);
  const isAdminPortal = pathname.startsWith("/Admin");
  const isUserPortal = pathname.startsWith("/user");
  const hasAdminPortalAccess = canAccessAdminPortal(user);
  const canManageRestrictedActions =
    hasAdminPortalAccess && (isSuperAdmin || (isAdmin && (hierarchyLevel === 1 || hierarchyLevel === 2)));

  return {
    roleId,
    roleName,
    hierarchyLevel,
    isSuperAdmin,
    isAdmin,
    isAdminPortal,
    isUserPortal,
    hasAdminPortalAccess,
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
