/**
 * userModuleAccess.js
 *
 * Per-user CRM / ERP module access flags.
 *
 * Storage strategy:
 *  1. Primary  → backend  PATCH /users/:id/module-access  (authoritative)
 *  2. Cache    → localStorage key "uma:<userId>"          (instant reads)
 *
 * Shape stored / returned:
 *   { crm: boolean, erp: boolean }
 *
 * Super Admin assigns these overrides.  Role defaults apply when no
 * override is stored (managers get both, employees get ERP, customers get neither).
 */

import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
import { USER_MODULE_ACCESS } from "../Components/Endpoint/Endpoint";
import { ROLES } from "./permissions";

// ── localStorage helpers ──────────────────────────────────────────────────────

const CACHE_PREFIX = "uma:";

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`;

/** Read cached flags. Returns null if nothing stored. */
export const readCache = (userId) => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.crm === "boolean" && typeof parsed?.erp === "boolean") {
      return { crm: parsed.crm, erp: parsed.erp };
    }
    return null;
  } catch {
    return null;
  }
};

/** Write flags to localStorage cache. */
const writeCache = (userId, flags) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(flags));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
};

/** Remove cached flags for a user. */
const clearCache = (userId) => {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {}
};

// ── role defaults ─────────────────────────────────────────────────────────────

/**
 * Returns the default module flags based on roleId alone.
 * Used as fallback when no override has been set.
 */
export const getRoleDefaults = (roleId) => {
  const id = Number(roleId ?? 0);
  if (id === ROLES.SUPER_ADMIN || id === ROLES.ADMIN) return { crm: true, erp: true };
  if (id === ROLES.MANAGER)                            return { crm: true, erp: true };
  if (id === ROLES.EMPLOYEE)                           return { crm: false, erp: true };
  return                                                      { crm: false, erp: false }; // CUSTOMER
};

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Fetch a user's module-access flags from the backend.
 * Falls back to localStorage cache, then role defaults on error.
 *
 * @param {number|string} userId
 * @param {number|string} roleId  – used as fallback default
 * @returns {Promise<{crm:boolean, erp:boolean}>}
 */
export const fetchUserModuleAccess = async (userId, roleId) => {
  if (!userId) return getRoleDefaults(roleId);

  try {
    const res = await axiosInstance.get(USER_MODULE_ACCESS.GET(userId));
    const flags = res.data?.modules ?? res.data ?? null;
    if (flags && typeof flags.crm === "boolean" && typeof flags.erp === "boolean") {
      const clean = { crm: flags.crm, erp: flags.erp };
      writeCache(userId, clean);
      return clean;
    }
    // Backend returned something but no override set yet → role defaults
    const defaults = getRoleDefaults(roleId);
    writeCache(userId, defaults);
    return defaults;
  } catch {
    // Network / 404 → fall back to cache, then role defaults
    const cached = readCache(userId);
    return cached ?? getRoleDefaults(roleId);
  }
};

/**
 * Save module-access flags for a user (Super Admin action).
 * Writes to backend + localStorage cache.
 *
 * @param {number|string} userId
 * @param {{ crm: boolean, erp: boolean }} flags
 * @returns {Promise<void>}
 */
export const saveUserModuleAccess = async (userId, flags) => {
  const clean = { crm: Boolean(flags.crm), erp: Boolean(flags.erp) };
  // Optimistic cache write first so UI reflects immediately
  writeCache(userId, clean);

  await axiosInstance.patch(USER_MODULE_ACCESS.SET(userId), { modules: clean });
};

/**
 * Reset a user's module-access back to role defaults (Super Admin action).
 *
 * @param {number|string} userId
 * @param {number|string} roleId  – used to recalculate defaults
 * @returns {Promise<{crm:boolean, erp:boolean}>}  the new defaults
 */
export const resetUserModuleAccess = async (userId, roleId) => {
  clearCache(userId);
  try {
    await axiosInstance.delete(USER_MODULE_ACCESS.RESET(userId));
  } catch {
    // if backend doesn't support it yet, just clear locally
  }
  return getRoleDefaults(roleId);
};

/**
 * Synchronous read for the *current logged-in* user.
 * Used in Reports and NavigationBar where we need instant access
 * without awaiting a network call.
 *
 * Priority: localStorage cache → role defaults
 *
 * @param {number|string} userId
 * @param {number|string} roleId
 * @returns {{ crm: boolean, erp: boolean }}
 */
export const getModuleAccessSync = (userId, roleId) => {
  if (!userId) return getRoleDefaults(roleId);
  return readCache(userId) ?? getRoleDefaults(roleId);
};
