const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Presales automation: reminder notifications for upcoming ETAs.
 */

/**
 * Check for presales with upcoming ETAs and send reminders.
 */
const checkPresalesReminders = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.presalesReminder?.enabled) continue;

    const hoursBefore = config.presalesReminder.hoursBefore || 24;
    const reminderWindow = new Date();
    reminderWindow.setHours(reminderWindow.getHours() + hoursBefore);

    // Find presales with ETAs in the reminder window
    const upcomingPresales = await appPool.query(
      `
      SELECT p.*, u."Name" AS "AssignedToName"
      FROM "Presales" p
      LEFT JOIN "Users" u ON u."UserId" = p."AssignedTo"
      WHERE p."CompanyId" = $1
        AND p."Status" != 'Completed'
        AND p."ETA" >= NOW()
        AND p."ETA" <= $2
        AND p."IsDeleted" = FALSE
      `,
      [company.CompanyId, reminderWindow]
    );

    for (const presale of upcomingPresales.rows) {
      if (presale.AssignedTo) {
        const etaDate = new Date(presale.ETA);
        const hoursUntilEta = (etaDate - new Date()) / (1000 * 60 * 60);

        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            presale.CompanyId,
            presale.AssignedTo,
            'Presales Reminder',
            `Presales #${presale.Id} is due in ${Math.round(hoursUntilEta)} hours (ETA: ${etaDate.toLocaleString()})`,
            'PRESALES_REMINDER',
            'info',
            'Presales',
            presale.Id,
          ]
        );
      }

      results.push(presale);
    }
  }

  return results;
};

module.exports = {
  checkPresalesReminders,
};