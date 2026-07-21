const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Lead capture automation: auto-assign, auto-score, duplicate check.
 */

/**
 * Auto-assign a lead to the least-loaded active rep in the same company.
 * Returns the UserId to assign to, or null if no reps found.
 */
const autoAssignLead = async (companyId) => {
  const result = await appPool.query(
    `
    SELECT u."UserId"
    FROM "Users" u
    WHERE u."CompanyId" = $1
      AND u."IsActive" = TRUE
      AND u."IsDelete" = FALSE
      AND EXISTS (
        SELECT 1 FROM "Roles" r WHERE r."Id" = u."RoleId" AND r."RoleName" IN ('manager', 'employee')
      )
    ORDER BY (
      SELECT COUNT(*) FROM "Leads" l WHERE l."AssignedTo" = u."UserId" AND l."IsDeleted" = FALSE
    ) ASC
    LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0]?.UserId || null;
};

/**
 * Compute lead score based on configurable rules.
 * Returns a numeric score (0-100 typical range).
 */
const computeLeadScore = async (lead) => {
  const config = await getAutomationConfig(lead.CompanyId);
  if (!config.leadScoring?.enabled) return null;

  const rules = {
    highValueLeadSources: [1, 2, 3], // TODO: make configurable
    targetIndustries: [1, 2, 3], // TODO: make configurable
    expectedValueThreshold: 10000,
    businessEmailDomains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'],
  };

  let score = 0;

  // Lead source scoring
  if (rules.highValueLeadSources.includes(lead.LeadSourceId)) {
    score += 20;
  }

  // Industry scoring
  if (rules.targetIndustries.includes(lead.IndustryId)) {
    score += 15;
  }

  // Expected value scoring
  if (lead.ExpectedValue && Number(lead.ExpectedValue) >= rules.expectedValueThreshold) {
    score += 15;
  }

  // Email domain scoring
  if (lead.Email) {
    const domain = lead.Email.split('@')[1]?.toLowerCase();
    if (domain && !rules.businessEmailDomains.includes(domain)) {
      score += 10;
    }
  }

  return Math.min(score, 100);
};

/**
 * Check for duplicate leads/contacts by email or phone within the same company.
 * Returns the matching entity if found, null otherwise.
 */
const checkDuplicate = async (companyId, email, phone, excludeLeadId = null) => {
  const conditions = ['"CompanyId" = $1', '"IsDeleted" = FALSE'];
  const params = [companyId];
  let paramIdx = 1;

  if (excludeLeadId) {
    paramIdx++;
    conditions.push(`"Id" != $${paramIdx}`);
    params.push(excludeLeadId);
  }

  // Check Leads table
  if (email) {
    paramIdx++;
    const emailCondition = `("Email" = $${paramIdx})`;
    const leadResult = await appPool.query(
      `SELECT "Id", "Name", "Email", "Phone" FROM "Leads" WHERE ${emailCondition} AND "CompanyId" = $1 ${excludeLeadId ? `AND "Id" != $2` : ''} LIMIT 1`,
      [companyId, email, ...(excludeLeadId ? [excludeLeadId] : [])]
    );
    if (leadResult.rows.length > 0) return { type: 'Lead', ...leadResult.rows[0] };
  }

  if (phone) {
    const phoneResult = await appPool.query(
      `SELECT "Id", "Name", "Email", "Phone" FROM "Leads" WHERE "Phone" = $1 AND "CompanyId" = $2 ${excludeLeadId ? `AND "Id" != $3` : ''} LIMIT 1`,
      [phone, companyId, ...(excludeLeadId ? [excludeLeadId] : [])]
    );
    if (phoneResult.rows.length > 0) return { type: 'Lead', ...phoneResult.rows[0] };
  }

  // Check Contacts table
  if (email) {
    const contactResult = await appPool.query(
      `SELECT "Id", "Name", "Email", "Phone" FROM "Contacts" WHERE "Email" = $1 AND "CompanyId" = $2 LIMIT 1`,
      [email, companyId]
    );
    if (contactResult.rows.length > 0) return { type: 'Contact', ...contactResult.rows[0] };
  }

  if (phone) {
    const contactResult = await appPool.query(
      `SELECT "Id", "Name", "Email", "Phone" FROM "Contacts" WHERE "Phone" = $1 AND "CompanyId" = $2 LIMIT 1`,
      [phone, companyId]
    );
    if (contactResult.rows.length > 0) return { type: 'Contact', ...contactResult.rows[0] };
  }

  return null;
};

/**
 * Log a comment about a duplicate detection.
 */
const logDuplicateComment = async (leadId, duplicateInfo, createdBy) => {
  await appPool.query(
    `INSERT INTO "Comments" ("EntityType", "EntityId", "CommentText", "CreatedBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, NOW())`,
    [
      'Lead',
      leadId,
      `Potential duplicate detected: matches ${duplicateInfo.type} #${duplicateInfo.Id} (${duplicateInfo.Name})`,
      createdBy,
    ]
  );
};

/**
 * Create an assignment record for a lead.
 */
const createLeadAssignment = async (leadId, assignedTo, changedBy) => {
  await appPool.query(
    `INSERT INTO "Assignments" ("EntityType", "EntityId", "AssignedTo", "AssignedFrom", "ChangedBy", "ChangedAt")
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    ['Lead', leadId, assignedTo, null, changedBy]
  );
};

/**
 * Check for stale leads and notify assigned users.
 */
const checkStaleLeads = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.staleLeadCheck?.enabled) continue;

    const staleDays = config.staleLeadCheck.staleDays || 5;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - staleDays);

    // Find stale leads
    const staleLeads = await appPool.query(
      `
      SELECT l.*, u."Name" AS "AssignedToName", u."Email" AS "AssignedToEmail", u."ReportingManagerId"
      FROM "Leads" l
      LEFT JOIN "Users" u ON u."UserId" = l."AssignedTo"
      WHERE l."CompanyId" = $1
        AND l."Status" NOT IN ('Converted', 'Lost')
        AND l."IsDeleted" = FALSE
        AND (
          l."UpdatedAt" < $2
          AND NOT EXISTS (
            SELECT 1 FROM "Activities" a
            WHERE a."Type" = 'Lead'
              AND a."LeadId" = l."Id"
              AND a."CreatedAt" >= $2
          )
        )
      `,
      [company.CompanyId, cutoffDate]
    );

    for (const lead of staleLeads.rows) {
      // Notify assigned user
      if (lead.AssignedTo) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            lead.CompanyId,
            lead.AssignedTo,
            'Stale Lead Alert',
            `Lead #${lead.Id} (${lead.Name}) has been inactive for ${staleDays}+ days`,
            'STALE_LEAD',
            'warning',
            'Lead',
            lead.Id,
          ]
        );
      }

      // Notify manager if assigned user has one
      if (lead.ReportingManagerId) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            lead.CompanyId,
            lead.ReportingManagerId,
            'Stale Lead Alert - Team Member',
            `Lead #${lead.Id} assigned to ${lead.AssignedToName} has been inactive for ${staleDays}+ days`,
            'STALE_LEAD',
            'warning',
            'Lead',
            lead.Id,
          ]
        );
      }

      results.push(lead);
    }
  }

  return results;
};

module.exports = {
  autoAssignLead,
  computeLeadScore,
  checkDuplicate,
  logDuplicateComment,
  createLeadAssignment,
  checkStaleLeads,
};
