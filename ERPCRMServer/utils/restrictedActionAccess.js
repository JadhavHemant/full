const { ROLE_IDS, isSuperAdmin, isAdminOrSuperAdmin, normalizeRoleName } = require("../config/roleConfig");

const getRestrictedActionAccess = (user = {}) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const hierarchyLevel = Number(user?.hierarchyLevel ?? user?.HierarchyLevel ?? -1);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);

  const isSuperAdminUser = roleId === ROLE_IDS.SUPERADMIN || isSuperAdmin(user);
  const isAdminUser = isAdminOrSuperAdmin(user);
  const isAllowedAdminLevel = hierarchyLevel === 1 || hierarchyLevel === 2;

  return {
    roleId,
    roleName,
    hierarchyLevel,
    isSuperAdmin: isSuperAdminUser,
    isAdmin: isAdminUser,
    canManageRestrictedActions: isSuperAdminUser || (isAdminUser && isAllowedAdminLevel),
  };
};

module.exports = {
  getRestrictedActionAccess,
};
