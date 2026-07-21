const { appPool } = require("../../config/db")

const EntityVisibility = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "EntityVisibility" (
    "Id" SERIAL PRIMARY KEY,
    "EntityType" VARCHAR(50) NOT NULL,
    "EntityId" INT NOT NULL,
    "VisibilityType" VARCHAR(50) NOT NULL DEFAULT 'Private',
    "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
    "GroupId" INT REFERENCES "Groups"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);
    `
    await appPool.query(query);
    console.log("✅ EntityVisibility table ready")
}

module.exports = { EntityVisibility };