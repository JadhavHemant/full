const { appPool } = require("../../config/db")

const  TaskTypes= async () => {
    const query = `CREATE TABLE IF NOT EXISTS "TaskTypes" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) UNIQUE NOT NULL,
    "DefaultDurationMinutes" INT,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);`
    await appPool.query(query);
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT NOW();');
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL;');
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT NOW();');
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE;');
    await appPool.query('ALTER TABLE "TaskTypes" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;');
    console.log("✅ TaskTypes table ready")
}

module.exports = { TaskTypes };
