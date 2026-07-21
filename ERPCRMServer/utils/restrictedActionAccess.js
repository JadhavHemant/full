const normalizeRoleName = (value) => String(value || "").trim().toLowerCase();

const getRestrictedActionAccess = (user = {}) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const hierarchyLevel = Number(user?.hierarchyLevel ?? user?.HierarchyLevel ?? -1);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);

  const isSuperAdmin = roleId === 1 || roleName === "super admin";
  const isAdmin = roleId === 2 || roleName === "admin";
  const isAllowedAdminLevel = hierarchyLevel === 1 || hierarchyLevel === 2;

  return {
    roleId,
    roleName,
    hierarchyLevel,
    isSuperAdmin,
    isAdmin,
    canManageRestrictedActions: isSuperAdmin || (isAdmin && isAllowedAdminLevel),
  };
};

module.exports = {
  getRestrictedActionAccess,
};
