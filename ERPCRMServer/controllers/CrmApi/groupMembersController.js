const { appPool } = require("../../config/db");
const { resolveCompanyScope } = require("../../utils/companyScope");

const listGroupMembers = async (req, res) => {
  try {
    const groupId = parseInt(req.query.groupId, 10);

    if (!groupId) {
      return res.status(400).json({ message: "groupId is required" });
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
        gm.*,
        u."Name" AS "UserName",
        u."Email" AS "UserEmail"
      FROM "GroupMembers" gm
      LEFT JOIN "Users" u ON u."UserId" = gm."UserId"
      WHERE gm."GroupId" = $1
        AND gm."CompanyId" = $2
      ORDER BY gm."CreatedAt" DESC, gm."Id" DESC;
    `;

    const { rows } = await appPool.query(query, [groupId, scope.companyId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ message: "Failed to fetch group members" });
  }
};

const addGroupMember = async (req, res) => {
  const client = await appPool.connect();
  const groupId = parseInt(req.body.groupId, 10);
  const userId = parseInt(req.body.userId, 10);

  if (!groupId || !userId) {
    return res.status(400).json({ message: "groupId and userId are required" });
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

    const insert = await client.query(
      `
      INSERT INTO "GroupMembers" ("GroupId", "UserId", "CompanyId")
      VALUES ($1, $2, $3)
      ON CONFLICT ("GroupId", "UserId", "CompanyId")
      DO NOTHING
      RETURNING *;
      `,
      [groupId, userId, scope.companyId]
    );

    await client.query("COMMIT");
    res.status(201).json(insert.rows[0] || { message: "Member already exists" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding group member:", error);
    res.status(500).json({ message: "Failed to add group member" });
  } finally {
    client.release();
  }
};

const removeGroupMember = async (req, res) => {
  const client = await appPool.connect();
  const groupId = parseInt(req.params.groupId, 10);
  const userId = parseInt(req.params.userId, 10);

  if (!groupId || !userId) {
    return res.status(400).json({ message: "groupId and userId are required" });
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
      `
      DELETE FROM "GroupMembers"
      WHERE "GroupId" = $1
        AND "UserId" = $2
        AND "CompanyId" = $3;
      `,
      [groupId, userId, scope.companyId]
    );

    await client.query("COMMIT");
    res.json({ message: "Group member removed successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing group member:", error);
    res.status(500).json({ message: "Failed to remove group member" });
  } finally {
    client.release();
  }
};

module.exports = {
  listGroupMembers,
  addGroupMember,
  removeGroupMember,
};