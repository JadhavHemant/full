const { appPool } = require("../../config/db")

const  Leads= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Leads" (
    "Id" SERIAL PRIMARY KEY,
    "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
    "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
    "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
    "LeadSourceId" INT REFERENCES "LeadSources"("Id"),
    "ProductCategoryId" INT REFERENCES "ProductCategories"("Id"),
    "FollowupTypeId" INT REFERENCES "FollowupTypes"("Id"),
    "IndustryId" INT REFERENCES "Industries"("Id"),
    "ProspectAccountName" VARCHAR(255),
    "ProspectAccountWebsite" VARCHAR(255),
    "ProspectContactFirstName" VARCHAR(100),
    "ProspectContactLastName" VARCHAR(100),
    "ProspectContactEmail" VARCHAR(255),
    "ProspectContactPhone" VARCHAR(50),
    "ProspectContactTitle" VARCHAR(255),
    "Status" VARCHAR(50) DEFAULT 'New',
    "Rating" INT,
    "ProgressPercentage" NUMERIC(5,2) DEFAULT 0,
    "FollowUpDate" DATE,
    "ExpectedValue" NUMERIC(15,2),
    "ConvertedAt" TIMESTAMP,
    "LostReason" TEXT,
    "Description" TEXT,
    "Comments" TEXT,
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
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProgressPercentage" NUMERIC(5,2) DEFAULT 0;');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "FollowUpDate" DATE;');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ExpectedValue" NUMERIC(15,2);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ConvertedAt" TIMESTAMP;');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "LostReason" TEXT;');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectAccountName" VARCHAR(255);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectAccountWebsite" VARCHAR(255);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectContactFirstName" VARCHAR(100);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectContactLastName" VARCHAR(100);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectContactEmail" VARCHAR(255);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectContactPhone" VARCHAR(50);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "ProspectContactTitle" VARCHAR(255);');
    await appPool.query('ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Leads" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
    console.log("✅ Leads table ready")
}

module.exports = { Leads };
