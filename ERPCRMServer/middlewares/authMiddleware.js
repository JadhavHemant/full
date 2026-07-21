'use strict';

/**
 * Auth Middleware
 *
 * Exports:
 *   authenticate()        — primary middleware; validates JWT, checks revocation,
 *                           attaches req.user. Replaces the old verifyAccessToken
 *                           while keeping that name as an alias for backward compat.
 *   companyIsolation()    — enforces company-scoped data access.
 *   requireSuperAdmin()   — gate that allows only roleId = 1.
 *   requireAdmin()        — gate that allows roleId 1 or 2.
 *   optionalAuth()        — sets req.user when a token is present but does NOT
 *                           reject requests without one (public + hybrid routes).
 */

const jwt = require('jsonwebtoken');
const { verifyAccessToken: verifyWithRevocation } = require('../utils/tokenUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract raw JWT string from Authorization header or accessToken cookie. */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const cookies = Object.fromEntries(
      rawCookie.split(';').map((entry) => {
        const [name, ...rest] = entry.trim().split('=');
        return [name.trim(), decodeURIComponent(rest.join('='))];
      })
    );
    return cookies.accessToken || null;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// authenticate  (primary — replaces verifyAccessToken)
// ─────────────────────────────────────────────────────────────────────────────

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Access token missing' });
    }

    // Verify signature AND check token_revocation_list
    const decoded = await verifyWithRevocation(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid, expired, or revoked token' });
    }

    req.user = decoded;
    return next();
  } catch (err) {
    console.error('authenticate middleware error:', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// Backward-compatible alias — existing routes that import verifyAccessToken keep working
const verifyAccessToken = authenticate;

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuth
// ─────────────────────────────────────────────────────────────────────────────

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = await verifyWithRevocation(token);
      if (decoded) req.user = decoded;
    }
    return next();
  } catch (_) {
    return next(); // silently ignore invalid tokens on optional routes
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// companyIsolation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforces that every non-SuperAdmin request is scoped to their own company.
 *
 * After this middleware:
 *   - req.authCompanyId   is set to the authenticated company (or null for SuperAdmin)
 *   - req.isSuperAdmin    is true when roleId === 1
 *
 * It also rejects requests where body/query/params contain a CompanyId that
 * does not match the authenticated user's company (cross-company attempt).
 */
const companyIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const roleId = req.user.roleId || req.user.RoleId;

  // SuperAdmin bypasses all company restrictions
  if (roleId === 1) {
    req.isSuperAdmin   = true;
    req.authCompanyId  = null; // access all companies

    // If SA explicitly targets a company, respect it
    const explicit = req.body?.CompanyId || req.query?.companyId || req.params?.companyId;
    if (explicit) req.authCompanyId = parseInt(explicit, 10);

    return next();
  }

  req.isSuperAdmin  = false;

  const userCompanyId = req.user.companyId || req.user.CompanyId;

  if (!userCompanyId) {
    return res.status(403).json({ message: 'User is not associated with a company' });
  }

  // Detect cross-company attempt in request payload / query / params
  const submittedCompanyId =
    req.body?.CompanyId    ||
    req.query?.companyId   ||
    req.params?.companyId  ||
    null;

  if (submittedCompanyId && parseInt(submittedCompanyId, 10) !== parseInt(userCompanyId, 10)) {
    return res.status(403).json({ message: 'Cross-company access denied' });
  }

  req.authCompanyId = parseInt(userCompanyId, 10);
  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Role gates
// ─────────────────────────────────────────────────────────────────────────────

/** Only SuperAdmin (roleId = 1) may proceed. */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const roleId = req.user.roleId || req.user.RoleId;
  if (roleId !== 1) return res.status(403).json({ message: 'SuperAdmin access required' });
  return next();
};

/** SuperAdmin (1) or CompanyAdmin (2) may proceed. */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const roleId = req.user.roleId || req.user.RoleId;
  if (roleId !== 1 && roleId !== 2) return res.status(403).json({ message: 'Admin access required' });
  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  authenticate,
  verifyAccessToken,   // backward-compat alias
  optionalAuth,
  companyIsolation,
  requireSuperAdmin,
  requireAdmin,
};
