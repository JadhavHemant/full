const pool = require("../config/db");

async function logAudit(tableName, recordId, action, userId, changes) {
  await pool.query(
    `INSERT INTO "AuditLogs" ("TableName", "RecordId", "Action", "ChangedBy", "Changes")
     VALUES ($1, $2, $3, $4, $5)`,
    [tableName, recordId, action, userId, changes]
  );
}

module.exports = logAudit;
