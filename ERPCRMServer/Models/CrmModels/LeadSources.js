const { appPool } = require("../../config/db")

const  LeadSources= async () => {
    const query = 
    `CREATE TABLE IF NOT EXISTS "LeadSources" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) UNIQUE NOT NULL
);
`
  await appPool.query(query);
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW();');
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT NOW();');
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE;');
  await appPool.query('ALTER TABLE "LeadSources" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;');
    console.log("✅ LeadSources table ready")
}

module.exports = { LeadSources };
