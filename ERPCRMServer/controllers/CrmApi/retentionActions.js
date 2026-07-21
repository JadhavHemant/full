const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");

const getDueToday = async (req, res) => {
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
      SELECT r.*,
        a."Name" AS "AccountName",
        TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName"
      FROM "Retentions" r
      LEFT JOIN "Accounts" a ON a."Id" = r."AccountId"
      LEFT JOIN "Contacts" c ON c."Id" = r."ContactId"
      WHERE r."CompanyId" = $1
        AND COALESCE(r."IsDeleted", FALSE) = FALSE
        AND r."ReminderDate" <= CURRENT_DATE
        AND COALESCE(r."Status", 'Active') <> 'Completed'
      ORDER BY r."ReminderDate" ASC, r."Id" ASC;
    `;

    const { rows } = await appPool.query(query, [scope.companyId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching due retentions:", error);
    res.status(500).json({ message: "Failed to fetch due retentions" });
  }
};

const reassignRetention = async (req, res) => {
  const client = await appPool.connect();
  const retentionId = toInt(req.params.id);
  if (!retentionId) {
    return res.status(400).json({ message: "Invalid retention id" });
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

    const assignedTo = toInt(req.body.assignedTo);
    if (!assignedTo) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "assignedTo is required" });
    }

    const existingResult = await client.query(
      `
      SELECT *
      FROM "Retentions"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [retentionId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Retention not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Retentions"
      SET "AssignedFrom" = COALESCE("AssignedTo", "AssignedFrom"),
          "AssignedTo" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [retentionId, assignedTo, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `
      INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      ["Retention", retentionId, existing.AssignedTo, assignedTo, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "retention.reassigned",
      action: "update",
      entityType: "Retention",
      entityId: retentionId,
      beforeData: existing,
      afterData: updated,
      metadata: { assignedFrom: existing.AssignedTo, assignedTo },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error reassigning retention:", error);
    res.status(500).json({ message: "Failed to reassign retention" });
  } finally {
    client.release();
  }
};

module.exports = {
  getDueToday,
  reassignRetention,
};