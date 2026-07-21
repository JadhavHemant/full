const { appPool } = require("../../config/db")

const  Groups= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Groups" (
    "Id" SERIAL PRIMARY KEY,
    "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "CreatedBy" INT REFERENCES "Users"("UserId"),
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW()
);    
    `
    await appPool.query(query);
    console.log("✅ Groups table ready")
}

module.exports = { Groups };