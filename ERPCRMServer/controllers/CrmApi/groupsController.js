const { appPool } = require("../../config/db");
const { resolveCompanyScope } = require("../../utils/companyScope");

const listGroups = async (req, res) => {
  try {
    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const query = `
      SELECT *
      FROM "Groups"
      WHERE "CompanyId" = $1
        AND COALESCE("IsDeleted", FALSE) = FALSE
      ORDER BY "Name" ASC;
    `;

    const { rows } = await appPool.query(query, [scope.companyId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

const createGroup = async (req, res) => {
  const client = await appPool.connect();
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Group name is required" });
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
      INSERT INTO "Groups" ("CompanyId", "Name", "Description", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag")
      VALUES ($1, $2, $3, $4, $4, TRUE, FALSE, FALSE)
      RETURNING *;
      `,
      [scope.companyId, name, description, req.user.userId]
    );

    await client.query("COMMIT");
    res.status(201).json(insert.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Failed to create group" });
  } finally {
    client.release();
  }
};

const updateGroup = async (req, res) => {
  const client = await appPool.connect();
  const groupId = parseInt(req.params.id, 10);

  if (!groupId) {
    return res.status(400).json({ message: "Invalid group id" });
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

    const name = req.body.name ? String(req.body.name).trim() : null;
    const description = req.body.description !== undefined ? String(req.body.description).trim() : null;

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`"Name" = $${paramCount}`);
      values.push(name);
    }
    if (description !== null) {
      paramCount++;
      updates.push(`"Description" = $${paramCount}`);
      values.push(description);
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No fields provided to update" });
    }

    paramCount++;
    updates.push(`"UpdatedBy" = $${paramCount}`);
    values.push(req.user.userId);

    paramCount++;
    updates.push(`"UpdatedAt" = NOW()`);

    values.push(groupId, scope.companyId);

    const query = `
      UPDATE "Groups"
      SET ${updates.join(", ")}
      WHERE "Id" = $${paramCount - 1}
        AND "CompanyId" = $${paramCount}
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
    `;

    const { rows } = await client.query(query, values);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Group not found" });
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Failed to update group" });
  } finally {
    client.release();
  }
};

const deleteGroup = async (req, res) => {
  const client = await appPool.connect();
  const groupId = parseInt(req.params.id, 10);

  if (!groupId) {
    return res.status(400).json({ message: "Invalid group id" });
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
      UPDATE "Groups"
      SET "IsDeleted" = TRUE,
          "IsActive" = FALSE,
          "UpdatedBy" = $2,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $3
        AND COALESCE("IsDeleted", FALSE) = FALSE;
      `,
      [groupId, req.user.userId, scope.companyId]
    );

    await client.query("COMMIT");
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Failed to delete group" });
  } finally {
    client.release();
  }
};

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};