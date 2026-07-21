const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");

const nonEmpty = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveCase = async (req, res) => {
  const client = await appPool.connect();
  const caseId = toInt(req.params.id);
  if (!caseId) {
    return res.status(400).json({ message: "Invalid case id" });
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

    const resolution = nonEmpty(req.body.resolution);
    if (!resolution) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Resolution is required" });
    }

    const existingResult = await client.query(
      `
      SELECT *
      FROM "Cases"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [caseId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Case not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Cases"
      SET "Resolution" = $2,
          "Status" = 'Closed',
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [caseId, resolution, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "case.resolved",
      action: "update",
      entityType: "Case",
      entityId: caseId,
      beforeData: existing,
      afterData: updated,
      metadata: { resolution },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error resolving case:", error);
    res.status(500).json({ message: "Failed to resolve case" });
  } finally {
    client.release();
  }
};

const reassignCase = async (req, res) => {
  const client = await appPool.connect();
  const caseId = toInt(req.params.id);
  if (!caseId) {
    return res.status(400).json({ message: "Invalid case id" });
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
      FROM "Cases"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [caseId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Case not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Cases"
      SET "AssignedFrom" = COALESCE("AssignedTo", "AssignedFrom"),
          "AssignedTo" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [caseId, assignedTo, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `
      INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      ["Case", caseId, existing.AssignedTo, assignedTo, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "case.reassigned",
      action: "update",
      entityType: "Case",
      entityId: caseId,
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
    console.error("Error reassigning case:", error);
    res.status(500).json({ message: "Failed to reassign case" });
  } finally {
    client.release();
  }
};

module.exports = {
  resolveCase,
  reassignCase,
};