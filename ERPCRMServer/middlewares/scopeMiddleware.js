/**
 * Scope Enforcement Middleware
 * ============================
 * Enforces company, branch, and warehouse access boundaries.
 * Must run AFTER authentication middleware.
 */

const { appPool } = require('../config/db');
const { ROLE_IDS, isSuperAdmin } = require('../config/roleConfig');

/**
 * Company Scope Middleware
 * Ensures the authenticated user can only access records belonging to their company.
 * 
 * Usage: router.get('/products', authenticate, requireCompanyScope, controller.list)
 */
const requireCompanyScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Super admin bypass — tagged for audit
    if (isSuperAdmin(req.user)) {
      if (req.body.CompanyId || req.query.companyId) {
        req.authCompanyId = Number(req.body.CompanyId || req.query.companyId);
      }
      return next();
    }

    // Get company from authenticated user
    const userCompanyId = req.user.companyId || req.user.CompanyId;
    if (!userCompanyId) {
      return res.status(403).json({ success: false, message: 'User not associated with a company' });
    }

    // Validate that any submitted CompanyId matches the user's company
    const submittedCompanyId = req.body.CompanyId || req.query.companyId || req.params.companyId;
    if (submittedCompanyId && Number(submittedCompanyId) !== Number(userCompanyId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-company access denied' });
    }

    // Tag request with authenticated company ID
    req.authCompanyId = Number(userCompanyId);
    next();
  } catch (err) {
    console.error('Company scope middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error checking company scope' });
  }
};

/**
 * Validate that a requested CompanyId matches the authenticated user's company.
 * Rejects cross-company access attempts.
 */
const assertCompanyAccess = (authUser, requestedCompanyId) => {
  if (!authUser) return false;
  if (isSuperAdmin(authUser)) return true;
  const userCompanyId = authUser.companyId || authUser.CompanyId;
  if (!userCompanyId) return false;
  if (requestedCompanyId && Number(requestedCompanyId) !== Number(userCompanyId)) return false;
  return true;
};

/**
 * Build a company-scoped WHERE clause for SQL queries.
 * Returns { clause: string, params: array, paramIndex: number }
 */
const buildCompanyScope = (alias, companyId, params = [], paramIndex = 1) => {
  if (!companyId) return { clause: '', params, paramIndex };
  params.push(companyId);
  return {
    clause: ` AND ${alias}."CompanyId" = $${paramIndex}`,
    params,
    paramIndex: paramIndex + 1,
  };
};

/**
 * Warehouse Scope Middleware
 * Ensures the authenticated user can only access their assigned warehouses.
 * 
 * Usage in controller: assertWarehouseAccess(req.user, warehouseId, 'view')
 */
const WAREHOUSE_ACTIONS = {
  view: 'view',
  receive: 'receive',
  dispatch: 'dispatch',
  adjust: 'adjust',
  transferOut: 'transferOut',
  transferIn: 'transferIn',
};

const assertWarehouseAccess = (authUser, warehouseId, action = 'view') => {
  if (!authUser || !warehouseId) return false;
  if (isSuperAdmin(authUser)) return true; // Super admin
  if (authUser.roleId === ROLE_IDS.ADMIN) return true; // Company admin (all warehouses in company)

  // Check warehouse IDs assigned to user
  const userWarehouses = authUser.warehouseIds || [];
  if (userWarehouses.length === 0) return false;
  return userWarehouses.includes(Number(warehouseId));
};

/**
 * Middleware factory for warehouse scope
 * Validates WarehouseId from req.body or req.query
 */
const requireWarehouseScope = (field = 'WarehouseId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const warehouseId = req.body[field] || req.query[field] || req.params[field];
      if (!warehouseId) {
        // No warehouse specified — let the controller decide
        return next();
      }

      if (!assertWarehouseAccess(req.user, warehouseId)) {
        return res.status(403).json({ success: false, message: `Forbidden: Warehouse access denied for ${field}` });
      }

      next();
    } catch (err) {
      console.error('Warehouse scope middleware error:', err);
      return res.status(500).json({ success: false, message: 'Server error checking warehouse scope' });
    }
  };
};

module.exports = {
  requireCompanyScope,
  assertCompanyAccess,
  buildCompanyScope,
  assertWarehouseAccess,
  requireWarehouseScope,
  WAREHOUSE_ACTIONS,
};