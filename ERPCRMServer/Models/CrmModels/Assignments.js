const { appPool } = require("../../config/db")

const Assignments = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Assignments" (
    "Id" SERIAL PRIMARY KEY,
    "EntityType" VARCHAR(50) NOT NULL,
    "EntityId" INT NOT NULL,
    "AssignedTo" INT REFERENCES "Users"("UserId"),
    "AssignedFrom" INT REFERENCES "Users"("UserId"),
    "ChangedBy" INT REFERENCES "Users"("UserId"),
    "ChangedAt" TIMESTAMP DEFAULT NOW()
);
    `
    await appPool.query(query);
    console.log("✅ Assignments table ready")
}

module.exports = { Assignments };