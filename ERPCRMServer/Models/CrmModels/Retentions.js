const { appPool } = require("../../config/db");

const Retentions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Retentions" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
      "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
      "OpportunityId" INT REFERENCES "Opportunities"("Id") ON DELETE SET NULL,
      "Type" VARCHAR(100) NOT NULL,
      "Status" VARCHAR(50) DEFAULT 'Planned',
      "NextActionDate" DATE,
      "ReminderDate" DATE,
      "Notes" TEXT,
      "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Flag" BOOLEAN DEFAULT FALSE
    );
  `;

  await appPool.query(query);
  await appPool.query('ALTER TABLE "Retentions" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
  console.log("Retentions table ready");
};

module.exports = { Retentions };
