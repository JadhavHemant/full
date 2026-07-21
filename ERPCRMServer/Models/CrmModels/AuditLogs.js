const { appPool } = require("../../config/db");

const AuditLogs = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "AuditLogs" (
      "Id" SERIAL PRIMARY KEY,
      "TableName" VARCHAR(100),
      "RecordId" INT,
      "Action" VARCHAR(20),
      "ChangedBy" INT REFERENCES "Users"("UserId"),
      "ChangeTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "Changes" JSONB
    );
  `;

  await appPool.query(query);
  console.log("AuditLogs table ready");
};

module.exports = { AuditLogs };
