const { appPool } = require("../../config/db")

const  SalesStages= async () => {
    const query = `CREATE TABLE IF NOT EXISTS "SalesStages" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) UNIQUE NOT NULL,
    "SortOrder" INT DEFAULT 0,
    "IsWon" BOOLEAN DEFAULT FALSE,
    "IsLost" BOOLEAN DEFAULT FALSE
);`
    await appPool.query(query);
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "SortOrder" INT DEFAULT 0;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "IsWon" BOOLEAN DEFAULT FALSE;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "IsLost" BOOLEAN DEFAULT FALSE;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW();');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT NOW();');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE;');
    await appPool.query('ALTER TABLE "SalesStages" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;');
    console.log("✅ SalesStages table ready")
}

module.exports = { SalesStages };
