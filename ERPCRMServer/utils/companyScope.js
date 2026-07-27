const toInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const { isSuperAdmin } = require('../config/roleConfig');
const isSuperAdminUser = (user) => isSuperAdmin(user);

const resolveCompanyScope = ({
  req,
  requestedCompanyId = null,
  allowAllForSuperAdmin = false,
  requireCompany = true,
}) => {
  const requesterCompanyId = toInt(req?.user?.companyId);
  const requested = toInt(requestedCompanyId);
  const superAdmin = isSuperAdminUser(req?.user);

  // Single-company mode: always resolve to one concrete company.
  // We prefer the company mapped to the authenticated user and only
  // fall back to an explicit request when the user itself has no mapping.
  if (requesterCompanyId) {
    if (requested && Number(requested) !== Number(requesterCompanyId)) {
      return {
        ok: false,
        status: 403,
        message: "Forbidden for requested company",
      };
    }

    return {
      ok: true,
      companyId: requesterCompanyId,
      requesterCompanyId,
      requestedCompanyId: requested,
      isSuperAdmin: superAdmin,
    };
  }

  if (superAdmin) {
    // SuperAdmin has access to all companies
    // If a specific company is requested, scope to that company
    // If no company is requested, allow access without company scope
    return {
      ok: true,
      companyId: requested || null,
      requesterCompanyId,
      requestedCompanyId: requested,
      isSuperAdmin: true,
    };
  }

  if (!requesterCompanyId && requireCompany) {
    return {
      ok: false,
      status: 400,
      message: "Your account is not mapped to a company",
    };
  }

  if (requested && requesterCompanyId && Number(requested) !== Number(requesterCompanyId)) {
    return {
      ok: false,
      status: 403,
      message: "Forbidden for requested company",
    };
  }

  return {
    ok: true,
    companyId: requesterCompanyId,
    requesterCompanyId,
    requestedCompanyId: requested,
    isSuperAdmin: false,
  };
};

module.exports = {
  toInt,
  isSuperAdminUser,
  resolveCompanyScope,
};
