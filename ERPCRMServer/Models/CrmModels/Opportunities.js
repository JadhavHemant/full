const { appPool } = require("../../config/db")

const  Opportunities= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Opportunities" (
    "Id" SERIAL PRIMARY KEY,
    "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
    "LeadId" INT REFERENCES "Leads"("Id") ON DELETE SET NULL,
    "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
    "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
    "OpportunityName" VARCHAR(255) NOT NULL,
    "SalesStageId" INT REFERENCES "SalesStages"("Id"),
    "LeadSourceId" INT REFERENCES "LeadSources"("Id"),
    "ProductCategoryId" INT REFERENCES "ProductCategories"("Id"),
    "IndustryId" INT REFERENCES "Industries"("Id"),
    "BudgetAmount" NUMERIC(15,2),
    "EstCloseDate" DATE,
    "Probability" NUMERIC(5,2),
    "ProgressPercentage" NUMERIC(5,2) DEFAULT 0,
    "Description" TEXT,
    "QualificationComments" TEXT,
    "DetailedSummary" TEXT,
    "WonAt" TIMESTAMP,
    "LostAt" TIMESTAMP,
    "Status" VARCHAR(50) DEFAULT 'Open',
    "CloseReason" VARCHAR(255),
    "AssignedTo" INT REFERENCES "Users"("UserId"),
    "AssignedFrom" INT REFERENCES "Users"("UserId"),
    "CreatedBy" INT REFERENCES "Users"("UserId"),
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IsDeleted" BOOLEAN DEFAULT FALSE,
    "Flag" BOOLEAN DEFAULT FALSE
);

    `
    await appPool.query(query);
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "Probability" NUMERIC(5,2);');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "ProgressPercentage" NUMERIC(5,2) DEFAULT 0;');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "LeadId" INT REFERENCES "Leads"("Id") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "WonAt" TIMESTAMP;');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "LostAt" TIMESTAMP;');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(50) DEFAULT \'Open\';');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "CloseReason" VARCHAR(255);');
    await appPool.query('ALTER TABLE "Opportunities" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Opportunities" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
    console.log("✅ Opportunities table ready")
}

module.exports = { Opportunities };
