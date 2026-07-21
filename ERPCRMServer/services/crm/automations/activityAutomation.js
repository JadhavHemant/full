const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Activity automation: reminder dispatch for upcoming activities.
 */

/**
 * Dispatch reminders for activities that are due.
 */
const dispatchActivityReminders = async () => {
  const companiesResult = await appPool.query(
    `SELECT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.activityReminder?.enabled) continue;

    // Find activities with reminders that are due
    const dueActivities = await appPool.query(
      `
      SELECT a.*, u."Name" AS "AssignedToName"
      FROM "Activities" a
      LEFT JOIN "Users" u ON u."UserId" = a."AssignedTo"
      WHERE a."CompanyId" = $1
        AND a."Status" = 'Pending'
        AND a."ReminderAt" <= NOW()
        AND a."ReminderAt" >= NOW() - INTERVAL '15 minutes'
        AND a."IsDeleted" = FALSE
      `,
      [company.CompanyId]
    );

    for (const activity of dueActivities.rows) {
      if (activity.AssignedTo) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            activity.CompanyId,
            activity.AssignedTo,
            'Activity Reminder',
            `Activity #${activity.Id}: ${activity.Subject || activity.Type} is due now`,
            'ACTIVITY_REMINDER',
            'info',
            'Activity',
            activity.Id,
          ]
        );
      }

      results.push(activity);
    }
  }

  return results;
};

module.exports = {
  dispatchActivityReminders,
};