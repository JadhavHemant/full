const { appPool } = require("../../config/db");

const getCurrentUser = async (userId) => {
  const query = `
    SELECT
      "UserId",
      "CompanyId",
      "ReportingManagerId",
      "HierarchyLevel",
      "UserTypeId",
      "IsDelete"
    FROM "Users"
    WHERE "UserId" = $1
    LIMIT 1;
  `;

  const { rows } = await appPool.query(query, [userId]);
  return rows[0] || null;
};

const getHierarchyUserIds = async (rootUserId, companyId = null) => {
  const params = [rootUserId];
  const rootCompanyClause = companyId ? `AND root."CompanyId" = $2` : "";
  const childCompanyClause = companyId ? `AND child."CompanyId" = $2` : "";

  if (companyId) {
    params.push(companyId);
  }

  const query = `
    WITH RECURSIVE "UserHierarchy" AS (
      SELECT root."UserId"
      FROM "Users" root
      WHERE root."UserId" = $1
      AND root."IsDelete" = FALSE
      ${rootCompanyClause}

      UNION ALL

      SELECT child."UserId"
      FROM "Users" child
      INNER JOIN "UserHierarchy" uh
        ON child."ReportingManagerId" = uh."UserId"
      WHERE child."IsDelete" = FALSE
      ${childCompanyClause}
    )
    SELECT "UserId" FROM "UserHierarchy";
  `;

  const { rows } = await appPool.query(query, params);
  return rows.map((row) => row.UserId);
};

const canManageRow = (row, userId, visibleUserIds, ownershipColumns = ["CreatedBy"]) => {
  const allowed = new Set((visibleUserIds || []).map((value) => Number(value)));
  allowed.add(Number(userId));

  return ownershipColumns.some((column) => {
    const ownerId = row[column];
    return ownerId != null && allowed.has(Number(ownerId));
  });
};

module.exports = {
  getCurrentUser,
  getHierarchyUserIds,
  canManageRow,
};
