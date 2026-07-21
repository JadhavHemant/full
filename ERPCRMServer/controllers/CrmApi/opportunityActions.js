const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");

const nonEmpty = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getPipeline = async (req, res) => {
  try {
    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const values = [scope.companyId];
    const where = [`o."CompanyId" = $1`, `COALESCE(o."IsDeleted", FALSE) = FALSE`];

    if (req.query.lifecycleScope === "active") {
      where.push(`COALESCE(o."Status", 'Open') = 'Open'`);
    }

    const query = `
      SELECT
        s."Id" AS "SalesStageId",
        s."Name" AS "SalesStageName",
        s."SortOrder",
        s."IsWon",
        s."IsLost",
        COUNT(o."Id")::int AS "OpportunityCount",
        COALESCE(SUM(o."BudgetAmount"), 0) AS "TotalBudget",
        COALESCE(SUM(o."ExpectedValue"), 0) AS "TotalExpectedValue"
      FROM "SalesStages" s
      LEFT JOIN "Opportunities" o ON o."SalesStageId" = s."Id"
        AND o."CompanyId" = $1
        AND COALESCE(o."IsDeleted", FALSE) = FALSE
        ${req.query.lifecycleScope === "active" ? `AND COALESCE(o."Status", 'Open') = 'Open'` : ""}
      WHERE COALESCE(s."IsDeleted", FALSE) = FALSE
      GROUP BY s."Id", s."Name", s."SortOrder", s."IsWon", s."IsLost"
      ORDER BY COALESCE(s."SortOrder", 0) ASC, s."Name" ASC;
    `;

    const { rows } = await appPool.query(query, values);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    res.status(500).json({ message: "Failed to fetch pipeline" });
  }
};

const transitionStage = async (req, res) => {
  const client = await appPool.connect();
  const opportunityId = toInt(req.params.id);
  if (!opportunityId) {
    return res.status(400).json({ message: "Invalid opportunity id" });
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

    const salesStageId = toInt(req.body.salesStageId);
    if (!salesStageId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "salesStageId is required" });
    }

    const existingResult = await client.query(
      `
      SELECT o.*, s."IsWon", s."IsLost", s."Name" AS "SalesStageName"
      FROM "Opportunities" o
      LEFT JOIN "SalesStages" s ON s."Id" = o."SalesStageId"
      WHERE o."Id" = $1
        AND o."CompanyId" = $2
        AND COALESCE(o."IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [opportunityId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Opportunity not found" });
    }

    const stageResult = await client.query(
      `
      SELECT *
      FROM "SalesStages"
      WHERE "Id" = $1
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [salesStageId]
    );

    const stage = stageResult.rows[0];
    if (!stage) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid sales stage" });
    }

    const updatePayload = {
      SalesStageId: salesStageId,
      UpdatedBy: req.user.userId,
    };

    if (stage.IsWon) {
      updatePayload.Status = "Won";
      updatePayload.WonAt = new Date().toISOString();
      updatePayload.LostAt = null;
      updatePayload.CloseReason = null;
    } else if (stage.IsLost) {
      updatePayload.Status = "Lost";
      updatePayload.LostAt = new Date().toISOString();
      updatePayload.WonAt = null;
      const closeReason = nonEmpty(req.body.closeReason);
      if (!closeReason) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "closeReason is required when marking as lost" });
      }
      updatePayload.CloseReason = closeReason;
    } else {
      updatePayload.Status = "Open";
      updatePayload.WonAt = null;
      updatePayload.LostAt = null;
    }

    const setClause = Object.keys(updatePayload)
      .map((key, index) => `"${key}" = $${index + 2}`)
      .join(", ");

    const values = [opportunityId, ...Object.values(updatePayload)];

    const updatedResult = await client.query(
      `
      UPDATE "Opportunities"
      SET ${setClause},
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $${values.length + 1}
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [...values, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "opportunity.stage_changed",
      action: "update",
      entityType: "Opportunity",
      entityId: opportunityId,
      beforeData: existing,
      afterData: updated,
      metadata: {
        fromStageId: existing.SalesStageId,
        toStageId: salesStageId,
        fromStageName: existing.SalesStageName,
        toStageName: stage.Name,
        newStatus: updated.Status,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error transitioning opportunity stage:", error);
    res.status(500).json({ message: "Failed to transition opportunity stage" });
  } finally {
    client.release();
  }
};

const reassignOpportunity = async (req, res) => {
  const client = await appPool.connect();
  const opportunityId = toInt(req.params.id);
  if (!opportunityId) {
    return res.status(400).json({ message: "Invalid opportunity id" });
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
      FROM "Opportunities"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [opportunityId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Opportunity not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Opportunities"
      SET "AssignedFrom" = COALESCE("AssignedTo", "AssignedFrom"),
          "AssignedTo" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [opportunityId, assignedTo, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `
      INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      ["Opportunity", opportunityId, existing.AssignedTo, assignedTo, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "opportunity.reassigned",
      action: "update",
      entityType: "Opportunity",
      entityId: opportunityId,
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
    console.error("Error reassigning opportunity:", error);
    res.status(500).json({ message: "Failed to reassign opportunity" });
  } finally {
    client.release();
  }
};

module.exports = {
  getPipeline,
  transitionStage,
  reassignOpportunity,
};