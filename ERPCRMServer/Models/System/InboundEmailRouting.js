const { appPool } = require("../../config/db");

const createInboundEmailRoutingTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "InboundEmailRoutes" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT NOT NULL REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "DepartmentId" INT REFERENCES "Departments"("Id") ON DELETE SET NULL,
      "RouteName" VARCHAR(150) NOT NULL,
      "InboundEmail" VARCHAR(255) NOT NULL,
      "AssignToUserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "AssignToManager" BOOLEAN DEFAULT FALSE,
      "AutoCreateAccount" BOOLEAN DEFAULT TRUE,
      "AutoCreateContact" BOOLEAN DEFAULT TRUE,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_email_routes_company_email
      ON "InboundEmailRoutes" ("CompanyId", LOWER("InboundEmail"));
    CREATE INDEX IF NOT EXISTS idx_inbound_email_routes_company
      ON "InboundEmailRoutes" ("CompanyId");
    CREATE INDEX IF NOT EXISTS idx_inbound_email_routes_active
      ON "InboundEmailRoutes" ("IsActive");

    CREATE TABLE IF NOT EXISTS "InboundEmailEvents" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT NOT NULL REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "RouteId" INT REFERENCES "InboundEmailRoutes"("Id") ON DELETE SET NULL,
      "CaseId" INT REFERENCES "Cases"("Id") ON DELETE SET NULL,
      "MessageId" VARCHAR(255),
      "ThreadId" VARCHAR(255),
      "FromEmail" VARCHAR(255),
      "ToEmail" VARCHAR(255),
      "Subject" VARCHAR(500),
      "BodyText" TEXT,
      "Status" VARCHAR(40) DEFAULT 'Processed',
      "ErrorMessage" TEXT,
      "RawPayload" JSONB DEFAULT '{}'::jsonb,
      "ReceivedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_email_events_company_message
      ON "InboundEmailEvents" ("CompanyId", "MessageId")
      WHERE "MessageId" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inbound_email_events_company_thread
      ON "InboundEmailEvents" ("CompanyId", "ThreadId");
    CREATE INDEX IF NOT EXISTS idx_inbound_email_events_case
      ON "InboundEmailEvents" ("CaseId");
  `;

  await appPool.query(query);
  console.log("Inbound email routing tables ready");
};

module.exports = { createInboundEmailRoutingTables };
