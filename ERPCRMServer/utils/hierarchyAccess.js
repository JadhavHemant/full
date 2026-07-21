const { appPool } = require("../config/db");

const PRIVILEGED_ROLE_IDS = new Set([1, 2]);

const normalizeRoleName = (value) => String(value || "").trim().toLowerCase();

const isPrivilegedUser = (user) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const roleName = normalizeRoleName(user?.roleName ?? user?.RoleName ?? user?.role);
  return PRIVILEGED_ROLE_IDS.has(roleId) || roleName === "super admin" || roleName === "admin";
};

const getAccessibleUserIds = async ({ userId, companyId = null }) => {
  const normalizedUserId = Number(userId);
  const normalizedCompanyId = Number(companyId);

  if (!Number.isFinite(normalizedUserId)) {
    return [];
  }

  const values = [normalizedUserId];
  const rootCompanyClause = Number.isFinite(normalizedCompanyId)
    ? `AND root."CompanyId" = $2`
    : "";
  const childCompanyClause = Number.isFinite(normalizedCompanyId)
    ? `AND child."CompanyId" = $2`
    : "";

  if (Number.isFinite(normalizedCompanyId)) {
    values.push(normalizedCompanyId);
  }

  const query = `
    WITH RECURSIVE "AccessibleUsers" AS (
      SELECT root."UserId"
      FROM "Users" root
      WHERE root."UserId" = $1
        AND root."IsDelete" = FALSE
        ${rootCompanyClause}

      UNION ALL

      SELECT child."UserId"
      FROM "Users" child
      INNER JOIN "AccessibleUsers" au
        ON child."ReportingManagerId" = au."UserId"
      WHERE child."IsDelete" = FALSE
        ${childCompanyClause}
    )
    SELECT DISTINCT "UserId"
    FROM "AccessibleUsers";
  `;

  const { rows } = await appPool.query(query, values);
  return rows.map((row) => Number(row.UserId)).filter(Number.isFinite);
};

const buildHierarchyAccess = async ({ req, alias, ownerColumns = [], values = [] }) => {
  if (isPrivilegedUser(req.user) || !ownerColumns.length) {
    return { clause: "", values };
  }

  const accessibleUserIds = await getAccessibleUserIds({
    userId: req.user.userId,
    companyId: req.user.companyId ?? null,
  });

  if (!accessibleUserIds.length) {
    const nextIndex = values.length + 1;
    return { clause: `FALSE OR ${alias}."Id" = $${nextIndex}`, values: [...values, -1] };
  }

  const nextIndex = values.length + 1;
  const ownerClause = ownerColumns
    .map((column) => `${alias}."${column}" = ANY($${nextIndex}::int[])`)
    .join(" OR ");

  return {
    clause: `(${ownerClause})`,
    values: [...values, accessibleUserIds],
  };
};

module.exports = {
  isPrivilegedUser,
  getAccessibleUserIds,
  buildHierarchyAccess,
};
