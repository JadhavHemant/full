const { appPool } = require("../../config/db");

const createNotificationPreferencesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
      "Id" SERIAL PRIMARY KEY,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "NotificationType" VARCHAR(80) NOT NULL,
      "Channel" VARCHAR(30) NOT NULL CHECK ("Channel" IN ('InApp', 'Email', 'SMS', 'Push', 'Webhook', 'Digest')),
      "IsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "QuietHoursStart" TIME,
      "QuietHoursEnd" TIME,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("UserId", "NotificationType", "Channel")
    );

    CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON "NotificationPreferences"("UserId");
    CREATE INDEX IF NOT EXISTS idx_notification_prefs_type ON "NotificationPreferences"("NotificationType");
  `;

  await appPool.query(query);
  console.log("NotificationPreferences table ready");
};

module.exports = { createNotificationPreferencesTable };
