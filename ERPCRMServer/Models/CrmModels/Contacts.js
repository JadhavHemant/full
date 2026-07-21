const { appPool } = require("../../config/db")

const  Contacts= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Contacts" (
    "Id" SERIAL PRIMARY KEY,
    "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
    "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
    "FirstName" VARCHAR(100),
    "MiddleName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "Email" VARCHAR(255),
    "Phone" VARCHAR(50),
    "AltPhone" VARCHAR(50),
    "LinkedinUrl" VARCHAR(500),
    "Title" VARCHAR(255),
    "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
    "CreatedBy" INT REFERENCES "Users"("UserId"),
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IsDeleted" BOOLEAN DEFAULT FALSE,
    "Flag" BOOLEAN DEFAULT FALSE
);
    `
    await appPool.query(query);
    await appPool.query('ALTER TABLE "Contacts" ADD COLUMN IF NOT EXISTS "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Contacts" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "Contacts" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
    console.log("✅ Contacts table ready")
}

module.exports = { Contacts };
