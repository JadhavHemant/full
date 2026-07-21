const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");

const completeActivity = async (req, res) => {
  const client = await appPool.connect();
  const activityId = toInt(req.params.id);
  if (!activityId) {
    return res.status(400).json({ message: "Invalid activity id" });
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

    const existingResult = await client.query(
      `
      SELECT *
      FROM "Activities"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [activityId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Activity not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Activities"
      SET "Status" = 'Completed',
          "UpdatedBy" = $2,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $3
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [activityId, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "activity.completed",
      action: "update",
      entityType: "Activity",
      entityId: activityId,
      beforeData: existing,
      afterData: updated,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error completing activity:", error);
    res.status(500).json({ message: "Failed to complete activity" });
  } finally {
    client.release();
  }
};

const reassignActivity = async (req, res) => {
  const client = await appPool.connect();
  const activityId = toInt(req.params.id);
  if (!activityId) {
    return res.status(400).json({ message: "Invalid activity id" });
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
      FROM "Activities"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [activityId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Activity not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Activities"
      SET "AssignedFrom" = COALESCE("AssignedTo", "AssignedFrom"),
          "AssignedTo" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [activityId, assignedTo, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `
      INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      ["Activity", activityId, existing.AssignedTo, assignedTo, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "activity.reassigned",
      action: "update",
      entityType: "Activity",
      entityId: activityId,
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
    console.error("Error reassigning activity:", error);
    res.status(500).json({ message: "Failed to reassign activity" });
  } finally {
    client.release();
  }
};

module.exports = {
  completeActivity,
  reassignActivity,
};