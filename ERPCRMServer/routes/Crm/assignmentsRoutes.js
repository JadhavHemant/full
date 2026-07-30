const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { appPool } = require("../../config/db");
const { resolveCompanyScope } = require("../../utils/companyScope");

const listAssignments = async (req, res) => {
  try {
    const entityType = req.query.entityType;
    const entityId = parseInt(req.query.entityId, 10);

    if (!entityType || !entityId) {
      return res.status(400).json({ message: "entityType and entityId are required" });
    }

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const query = `
      SELECT
        a.*,
        u1."Name" AS "AssignedFromName",
        u2."Name" AS "AssignedToName",
        u3."Name" AS "AssignedByName"
      FROM "Assignments" a
      LEFT JOIN "Users" u1 ON u1."UserId" = a."AssignedFrom"
      LEFT JOIN "Users" u2 ON u2."UserId" = a."AssignedTo"
      LEFT JOIN "Users" u3 ON u3."UserId" = a."AssignedBy"
      WHERE a."EntityType" = $1
        AND a."EntityId" = $2
        AND a."CompanyId" = $3
      ORDER BY a."CreatedAt" DESC, a."Id" DESC;
    `;

    const { rows } = await appPool.query(query, [entityType, entityId, scope.companyId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", checkPermission("assignments", "view"), listAssignments);

module.exports = router;