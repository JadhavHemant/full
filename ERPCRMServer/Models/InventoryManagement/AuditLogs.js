const { appPool } = require('../../config/db');

/**
 * AuditLogs Model
 *
 * Extended audit log table supporting both inventory-style change tracking and
 * auth/RBAC event logging. The original columns (TableName, RecordId, Action,
 * ChangedBy, ChangeTime, Changes) are preserved; auth-oriented columns are
 * added idempotently via ALTER TABLE ADD COLUMN IF NOT EXISTS.
 */
const AuditLogs = async () => {
  // Step 1: Create table with full schema if it does not exist
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "AuditLogs" (
      "Id" SERIAL PRIMARY KEY,
      -- Legacy inventory columns (preserved for backward compat)
      "TableName" VARCHAR(100),
      "RecordId" INT,
      "ChangedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ChangeTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "Changes" JSONB,
      -- Auth / RBAC columns
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE SET NULL,
      "Action" VARCHAR(80),
      "EntityType" VARCHAR(120),
      "EntityId" INT,
      "OldValue" JSONB,
      "NewValue" JSONB,
      "IpAddress" VARCHAR(64),
      "UserAgent" TEXT,
      "Success" BOOLEAN DEFAULT TRUE,
      "ErrorMessage" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 2: Add any columns that may be absent from older deployments
  const alterations = [
    // Legacy aliases kept alive
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "TableName" VARCHAR(100)`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "RecordId" INT`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "ChangedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "ChangeTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "Changes" JSONB`,
    // Auth columns
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE SET NULL`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "Action" VARCHAR(80)`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "EntityType" VARCHAR(120)`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "EntityId" INT`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "OldValue" JSONB`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "NewValue" JSONB`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "IpAddress" VARCHAR(64)`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "UserAgent" TEXT`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "Success" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "ErrorMessage" TEXT`,
    `ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  ];

  for (const sql of alterations) {
    try { await appPool.query(sql); } catch (_) {}
  }

  // Step 3: Indexes for query performance
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON "AuditLogs"("UserId")`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON "AuditLogs"("CompanyId")`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "AuditLogs"("Action")`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "AuditLogs"("EntityType", "EntityId")`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON "AuditLogs"("CreatedAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON "AuditLogs"("ChangedBy")`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_role ON "AuditLogs"("RoleId")`,
  ];

  for (const sql of indexes) {
    try { await appPool.query(sql); } catch (_) {}
  }

  console.log('✅ AuditLogs table ready');
};

module.exports = { AuditLogs };
