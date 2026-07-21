const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Case automation: auto-creation from inbound emails, SLA checks, auto-close.
 */

/**
 * Auto-create a case from an inbound email event.
 */
const createCaseFromEmail = async (emailEvent, route) => {
  // Check if case already exists for this thread
  const existingCase = await appPool.query(
    `SELECT "Id" FROM "Cases" WHERE "ThreadId" = $1 AND "Status" != 'Closed' LIMIT 1`,
    [emailEvent.ThreadId]
  );

  if (existingCase.rows.length > 0) {
    return null; // Case already exists
  }

  // Resolve account and contact from email
  const contactResult = await appPool.query(
    `SELECT "Id", "AccountId" FROM "Contacts" WHERE "Email" = $1 LIMIT 1`,
    [emailEvent.FromEmail]
  );

  const contact = contactResult.rows[0];
  const accountId = contact?.AccountId || null;

  // Create case
  const caseResult = await appPool.query(
    `INSERT INTO "Cases" ("Subject", "Description", "AccountId", "ContactId", "AssignedTo", "Priority", "Status", "ThreadId", "CreatedBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      emailEvent.Subject || 'No Subject',
      emailEvent.Body || '',
      accountId,
      contact?.Id || null,
      route?.AssignToUserId || null,
      'Medium',
      'Open',
      emailEvent.ThreadId,
      route?.AssignToUserId || null,
    ]
  );

  return caseResult.rows[0];
};

/**
 * Check SLA breaches for open cases.
 */
const checkCaseSla = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.caseSla?.enabled) continue;

    const hoursByPriority = config.caseSla.hoursByPriority || { Urgent: 4, High: 8, Medium: 24, Low: 72 };
    const escalationAfterHours = config.caseSla.escalationAfterHours || 24;

    // Find open cases
    const openCases = await appPool.query(
      `
      SELECT c.*, u."Name" AS "AssignedToName", u."Email" AS "AssignedToEmail", u."ReportingManagerId"
      FROM "Cases" c
      LEFT JOIN "Users" u ON u."UserId" = c."AssignedTo"
      WHERE c."CompanyId" = $1
        AND c."Status" = 'Open'
        AND c."IsDeleted" = FALSE
      `,
      [company.CompanyId]
    );

    for (const case_ of openCases.rows) {
      const slaHours = hoursByPriority[case_.Priority] || 24;
      const slaDeadline = new Date(case_.CreatedAt);
      slaDeadline.setHours(slaDeadline.getHours() + slaHours);

      const now = new Date();
      const hoursSinceCreation = (now - new Date(case_.CreatedAt)) / (1000 * 60 * 60);

      // Check if SLA breached
      if (hoursSinceCreation >= slaHours) {
        // Notify assigned user
        if (case_.AssignedTo) {
          await appPool.query(
            `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              case_.CompanyId,
              case_.AssignedTo,
              'SLA Breach Alert',
              `Case #${case_.Id} has breached SLA (Priority: ${case_.Priority}, SLA: ${slaHours}h)`,
              'SLA_BREACH',
              'critical',
              'Case',
              case_.Id,
            ]
          );
        }

        // Escalate to manager if overdue past escalation threshold
        if (case_.ReportingManagerId && hoursSinceCreation >= escalationAfterHours) {
          await appPool.query(
            `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              case_.CompanyId,
              case_.ReportingManagerId,
              'SLA Escalation',
              `Case #${case_.Id} has breached SLA and requires immediate attention (Priority: ${case_.Priority})`,
              'SLA_ESCALATION',
              'critical',
              'Case',
              case_.Id,
            ]
          );
        }

        results.push(case_);
      }
    }
  }

  return results;
};

/**
 * Auto-close resolved cases after N days of inactivity.
 */
const autoCloseResolvedCases = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.caseSla?.enabled) continue;

    const autoCloseDays = 7; // Configurable
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoCloseDays);

    // Find resolved cases with no recent activity
    const resolvedCases = await appPool.query(
      `
      SELECT c.*
      FROM "Cases" c
      WHERE c."CompanyId" = $1
        AND c."Status" = 'Resolved'
        AND c."ResolvedAt" < $2
        AND NOT EXISTS (
          SELECT 1 FROM "Activities" a
          WHERE a."Type" = 'Case'
            AND a."CaseId" = c."Id"
            AND a."CreatedAt" >= $2
        )
      `,
      [company.CompanyId, cutoffDate]
    );

    for (const case_ of resolvedCases.rows) {
      await appPool.query(
        `UPDATE "Cases" SET "Status" = 'Closed', "ClosedAt" = NOW(), "UpdatedAt" = NOW() WHERE "Id" = $1`,
        [case_.Id]
      );

      results.push(case_);
    }
  }

  return results;
};

module.exports = {
  createCaseFromEmail,
  checkCaseSla,
  autoCloseResolvedCases,
};