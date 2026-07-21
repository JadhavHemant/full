const { appPool } = require("../../config/db")

const Accounts = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Accounts" (
    "Id" SERIAL PRIMARY KEY,
    "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
    "Name" VARCHAR(255) NOT NULL,
    "Website" VARCHAR(255),
    "Description" TEXT,
    "IndustryId" INT REFERENCES "Industries"("Id") ON DELETE CASCADE,
    "AnnualRevenue" NUMERIC(15,2),
    "EmployeeCount" INT,
    "AccountOwnerId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
    "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IsDeleted" BOOLEAN DEFAULT FALSE,
    "Flag" BOOLEAN DEFAULT FALSE
);
    
    `
    await appPool.query(query);
    await appPool.query('ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "AnnualRevenue" NUMERIC(15,2);');
    await appPool.query('ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "EmployeeCount" INT;');
    await appPool.query('ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "AccountOwnerId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Accounts" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
    console.log("✅ Accounts table ready")
}

module.exports = { Accounts };
