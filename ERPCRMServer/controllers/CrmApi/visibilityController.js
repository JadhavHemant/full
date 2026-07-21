const { appPool } = require("../../config/db");
const { resolveCompanyScope } = require("../../utils/companyScope");

const listVisibility = async (req, res) => {
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
        ev.*,
        u."Name" AS "UserName",
        g."Name" AS "GroupName"
      FROM "EntityVisibility" ev
      LEFT JOIN "Users" u ON u."UserId" = ev."UserId"
      LEFT JOIN "Groups" g ON g."Id" = ev."GroupId"
      WHERE ev."EntityType" = $1
        AND ev."EntityId" = $2
        AND ev."CompanyId" = $3
      ORDER BY ev."CreatedAt" DESC, ev."Id" DESC;
    `;

    const { rows } = await appPool.query(query, [entityType, entityId, scope.companyId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching visibility:", error);
    res.status(500).json({ message: "Failed to fetch visibility" });
  }
};

const upsertVisibility = async (req, res) => {
  const client = await appPool.connect();
  const entityType = req.body.entityType;
  const entityId = parseInt(req.body.entityId, 10);
  const visibilityType = req.body.visibilityType;
  const userId = req.body.userId ? parseInt(req.body.userId, 10) : null;
  const groupId = req.body.groupId ? parseInt(req.body.groupId, 10) : null;

  if (!entityType || !entityId || !visibilityType) {
    return res.status(400).json({ message: "entityType, entityId, and visibilityType are required" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.body.companyId || req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    const upsertQuery = `
      INSERT INTO "EntityVisibility" ("EntityType", "EntityId", "VisibilityType", "UserId", "GroupId", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("EntityType", "EntityId", "UserId", "GroupId")
      DO UPDATE SET "VisibilityType" = EXCLUDED."VisibilityType", "UpdatedAt" = NOW()
      RETURNING *;
    `;

    const { rows } = await client.query(upsertQuery, [
      entityType,
      entityId,
      visibilityType,
      userId,
      groupId,
      scope.companyId,
    ]);

    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error upserting visibility:", error);
    res.status(500).json({ message: "Failed to upsert visibility" });
  } finally {
    client.release();
  }
};

const deleteVisibility = async (req, res) => {
  const client = await appPool.connect();
  const visibilityId = parseInt(req.params.id, 10);

  if (!visibilityId) {
    return res.status(400).json({ message: "Invalid visibility id" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    await client.query(
      `DELETE FROM "EntityVisibility" WHERE "Id" = $1 AND "CompanyId" = $2;`,
      [visibilityId, scope.companyId]
    );

    await client.query("COMMIT");
    res.json({ message: "Visibility deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting visibility:", error);
    res.status(500).json({ message: "Failed to delete visibility" });
  } finally {
    client.release();
  }
};

module.exports = {
  listVisibility,
  upsertVisibility,
  deleteVisibility,
};