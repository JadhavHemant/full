const { appPool } = require("../../config/db");

const EmailLogs = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "EmailLogs" (
      "Id" SERIAL PRIMARY KEY,
      "Recipient" VARCHAR(255) NOT NULL,
      "Subject" VARCHAR(500),
      "Template" VARCHAR(100),
      "Status" VARCHAR(50) DEFAULT 'Sent',
      "Provider" VARCHAR(50) DEFAULT 'console',
      "Error" TEXT,
      "SentBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON "EmailLogs"("Recipient")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_email_logs_created ON "EmailLogs"("CreatedAt")');
  console.log("✅ EmailLogs table ready");
};

module.exports = { EmailLogs };