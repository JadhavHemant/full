const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Retention automation: renewal reminders, auto-create renewal opportunities.
 */

/**
 * Check for retentions with upcoming action dates and send reminders.
 * Auto-create renewal opportunities if configured.
 */
const checkRetentionReminders = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.retentionReminder?.enabled) continue;

    // Find retentions with upcoming action dates
    const upcomingRetentions = await appPool.query(
      `
      SELECT r.*, a."Name" AS "AccountName", u."Name" AS "AssignedToName"
      FROM "Retentions" r
      LEFT JOIN "Accounts" a ON a."Id" = r."AccountId"
      LEFT JOIN "Users" u ON u."UserId" = r."AssignedTo"
      WHERE r."CompanyId" = $1
        AND (r."NextActionDate" <= CURRENT_DATE OR r."ReminderDate" <= CURRENT_DATE)
        AND r."IsDeleted" = FALSE
      `,
      [company.CompanyId]
    );

    for (const retention of upcomingRetentions.rows) {
      // Notify assigned user
      if (retention.AssignedTo) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            retention.CompanyId,
            retention.AssignedTo,
            'Retention Reminder',
            `Retention #${retention.Id} for ${retention.AccountName} requires action (NextActionDate: ${retention.NextActionDate})`,
            'RETENTION_REMINDER',
            'info',
            'Retention',
            retention.Id,
          ]
        );
      }

      // Auto-create renewal opportunity if Type = 'Renewal' and no linked opportunity
      if (retention.Type === 'Renewal' && !retention.OpportunityId) {
        await createRenewalOpportunity(retention);
      }

      results.push(retention);
    }
  }

  return results;
};

/**
 * Create a renewal opportunity from a retention record.
 */
const createRenewalOpportunity = async (retention) => {
  // Get the entry sales stage (lowest SortOrder)
  const stageResult = await appPool.query(
    `SELECT "Id" FROM "SalesStages" WHERE "IsActive" = TRUE ORDER BY "SortOrder" ASC LIMIT 1`
  );

  if (stageResult.rows.length === 0) {
    return null; // No sales stage configured
  }

  const entryStageId = stageResult.rows[0].Id;

  // Create opportunity
  const opportunityResult = await appPool.query(
    `INSERT INTO "Opportunities" ("AccountId", "SalesStageId", "Description", "Status", "CompanyId", "CreatedBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [
      retention.AccountId,
      entryStageId,
      `Renewal opportunity from Retention #${retention.Id}`,
      'Open',
      retention.CompanyId,
      retention.AssignedTo,
    ]
  );

  const opportunity = opportunityResult.rows[0];

  // Link opportunity back to retention
  await appPool.query(
    `UPDATE "Retentions" SET "OpportunityId" = $1, "UpdatedAt" = NOW() WHERE "Id" = $2`,
    [opportunity.Id, retention.Id]
  );

  // Notify assigned user
  if (retention.AssignedTo) {
    await appPool.query(
      `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        retention.CompanyId,
        retention.AssignedTo,
        'Renewal Opportunity Created',
        `Renewal opportunity #${opportunity.Id} has been auto-created from Retention #${retention.Id}`,
        'OPPORTUNITY_CREATED',
        'info',
        'Opportunity',
        opportunity.Id,
      ]
    );
  }

  return opportunity;
};

module.exports = {
  checkRetentionReminders,
  createRenewalOpportunity,
};