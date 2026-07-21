const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");
const { withAutoCreatedParties } = require("./crmAutoCreate");

const normalizeText = (value) => String(value || "").trim();
const nonEmpty = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const convertLead = async (req, res) => {
  const client = await appPool.connect();
  const leadId = toInt(req.params.id);
  if (!leadId) {
    return res.status(400).json({ message: "Invalid lead id" });
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

    const leadResult = await client.query(
      `
      SELECT l.*, ls."Name" AS "LeadSourceName"
      FROM "Leads" l
      LEFT JOIN "LeadSources" ls ON ls."Id" = l."LeadSourceId"
      WHERE l."Id" = $1
        AND l."CompanyId" = $2
        AND COALESCE(l."IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [leadId, scope.companyId]
    );

    const lead = leadResult.rows[0];
    if (!lead) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Lead not found" });
    }

    if (String(lead.Status || "").toLowerCase() === "converted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Lead is already converted" });
    }

    const payload = {
      CompanyId: lead.CompanyId,
      CreatedBy: req.user.userId,
      UpdatedBy: req.user.userId,
      ...req.body,
    };

    const enriched = await withAutoCreatedParties({
      payload,
      client,
      fallbackAccountName: payload.AutoAccountName || payload.OpportunityName || lead.Description,
    });

    const accountId = toInt(req.body.accountId) || enriched.AccountId;
    const contactId = toInt(req.body.contactId) || enriched.ContactId;

    if (!accountId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Account is required for conversion" });
    }

    const opportunityName = nonEmpty(payload.OpportunityName) || nonEmpty(lead.Description) || `Opportunity from Lead ${leadId}`;
    const salesStageId = toInt(req.body.salesStageId);
    const budgetAmount = req.body.budgetAmount ?? lead.ExpectedValue ?? null;
    const expectedValue = req.body.expectedValue ?? budgetAmount ?? null;
    const estCloseDate = req.body.estCloseDate || null;

    const opportunityInsert = await client.query(
      `
      INSERT INTO "Opportunities" (
        "CompanyId", "LeadId", "AccountId", "ContactId", "OpportunityName",
        "SalesStageId", "LeadSourceId", "ProductCategoryId", "IndustryId",
        "BudgetAmount", "ExpectedValue", "EstCloseDate", "Description",
        "Status", "CreatedBy", "AssignedTo", "AssignedFrom",
        "IsActive", "IsDeleted", "Flag"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Open', $14, $15, $16, TRUE, FALSE, FALSE)
      RETURNING *;
      `,
      [
        lead.CompanyId,
        leadId,
        accountId,
        contactId,
        opportunityName,
        salesStageId,
        lead.LeadSourceId,
        lead.ProductCategoryId,
        lead.IndustryId,
        budgetAmount,
        expectedValue,
        estCloseDate,
        lead.Description,
        req.user.userId,
        lead.AssignedTo,
        lead.AssignedFrom,
      ]
    );

    const opportunity = opportunityInsert.rows[0];

    await client.query(
      `
      UPDATE "Leads"
      SET "Status" = 'Converted',
          "ConvertedAt" = NOW(),
          "AccountId" = COALESCE($2, "AccountId"),
          "ContactId" = COALESCE($3, "ContactId"),
          "UpdatedBy" = $4,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $5
        AND COALESCE("IsDeleted", FALSE) = FALSE;
      `,
      [leadId, accountId, contactId, req.user.userId, lead.CompanyId]
    );

    if (lead.AssignedTo || lead.AssignedFrom) {
      await client.query(
        `
        INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
        VALUES ($1, $2, $3, $4, $5, $6);
        `,
        ["Lead", leadId, lead.AssignedFrom, lead.AssignedTo, req.user.userId, lead.CompanyId]
      );
    }

    await logAuditEvent({
      client,
      companyId: lead.CompanyId,
      userId: req.user.userId,
      eventType: "lead.converted",
      action: "convert",
      entityType: "Lead",
      entityId: leadId,
      afterData: {
        leadId,
        accountId,
        contactId,
        opportunityId: opportunity.Id,
        status: "Converted",
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");

    res.status(200).json({
      message: "Lead converted successfully",
      data: {
        leadId,
        accountId,
        contactId,
        opportunity,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error converting lead:", error);
    res.status(500).json({ message: "Failed to convert lead" });
  } finally {
    client.release();
  }
};

const markLeadLost = async (req, res) => {
  const client = await appPool.connect();
  const leadId = toInt(req.params.id);
  if (!leadId) {
    return res.status(400).json({ message: "Invalid lead id" });
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

    const lostReason = nonEmpty(req.body.lostReason);
    if (!lostReason) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "LostReason is required" });
    }

    const existingResult = await client.query(
      `
      SELECT *
      FROM "Leads"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [leadId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Lead not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Leads"
      SET "Status" = 'Lost',
          "LostReason" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [leadId, lostReason, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "lead.lost",
      action: "update",
      entityType: "Lead",
      entityId: leadId,
      beforeData: existing,
      afterData: updated,
      metadata: { lostReason },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error marking lead as lost:", error);
    res.status(500).json({ message: "Failed to mark lead as lost" });
  } finally {
    client.release();
  }
};

const reassignLead = async (req, res) => {
  const client = await appPool.connect();
  const leadId = toInt(req.params.id);
  if (!leadId) {
    return res.status(400).json({ message: "Invalid lead id" });
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
      FROM "Leads"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [leadId, scope.companyId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Lead not found" });
    }

    const updatedResult = await client.query(
      `
      UPDATE "Leads"
      SET "AssignedFrom" = COALESCE("AssignedTo", "AssignedFrom"),
          "AssignedTo" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE
      RETURNING *;
      `,
      [leadId, assignedTo, req.user.userId, scope.companyId]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `
      INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedFrom", "AssignedTo", "AssignedBy", "CompanyId")
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      ["Lead", leadId, existing.AssignedTo, assignedTo, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "lead.reassigned",
      action: "update",
      entityType: "Lead",
      entityId: leadId,
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
    console.error("Error reassigning lead:", error);
    res.status(500).json({ message: "Failed to reassign lead" });
  } finally {
    client.release();
  }
};

module.exports = {
  convertLead,
  markLeadLost,
  reassignLead,
};