const { appPool } = require("../../config/db");

const createAuditEventsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "AuditEvents" (
      "Id" BIGSERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "EventType" VARCHAR(120) NOT NULL,
      "Action" VARCHAR(80) NOT NULL,
      "EntityType" VARCHAR(120),
      "EntityId" INT,
      "BeforeData" JSONB,
      "AfterData" JSONB,
      "Metadata" JSONB,
      "IpAddress" VARCHAR(64),
      "UserAgent" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_company_created ON "AuditEvents"("CompanyId", "CreatedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON "AuditEvents"("UserId", "CreatedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_eventtype_created ON "AuditEvents"("EventType", "CreatedAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON "AuditEvents"("EntityType", "EntityId");
  `;

  await appPool.query(query);
  console.log("AuditEvents table ready");
};

module.exports = { createAuditEventsTable };
