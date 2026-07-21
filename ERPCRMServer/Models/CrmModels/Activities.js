const { appPool } = require("../../config/db");

const Activities = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Activities" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "LeadId" INT REFERENCES "Leads"("Id") ON DELETE SET NULL,
      "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
      "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
      "OpportunityId" INT REFERENCES "Opportunities"("Id") ON DELETE SET NULL,
      "Type" VARCHAR(50) NOT NULL,
      "Subject" VARCHAR(255) NOT NULL,
      "Description" TEXT,
      "DueDate" TIMESTAMP,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Priority" VARCHAR(50) DEFAULT 'Medium',
      "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ReminderAt" TIMESTAMP,
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
  await appPool.query('ALTER TABLE "Activities" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
  console.log("Activities table ready");
};

module.exports = { Activities };
