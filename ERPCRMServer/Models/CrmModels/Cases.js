const { appPool } = require("../../config/db");

const Cases = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Cases" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
      "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
      "LeadId" INT REFERENCES "Leads"("Id") ON DELETE SET NULL,
      "OpportunityId" INT REFERENCES "Opportunities"("Id") ON DELETE SET NULL,
      "Subject" VARCHAR(255) NOT NULL,
      "Status" VARCHAR(50) DEFAULT 'Open',
      "Priority" VARCHAR(50) DEFAULT 'Medium',
      "Description" TEXT,
      "Resolution" TEXT,
      "AssignedTo" INT REFERENCES "Users"("UserId"),
      "AssignedFrom" INT REFERENCES "Users"("UserId"),
      "CreatedBy" INT REFERENCES "Users"("UserId"),
      "UpdatedBy" INT REFERENCES "Users"("UserId"),
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Flag" BOOLEAN DEFAULT FALSE
    );
  `;

  await appPool.query(query);
  console.log("Cases table ready");
};

module.exports = { Cases };
