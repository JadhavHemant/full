const { appPool } = require("../../config/db")

const  Addresses= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Addresses" (
    "Id" SERIAL PRIMARY KEY,
    "EntityType" VARCHAR(50) NOT NULL,
    "EntityId" INT NOT NULL,
    "Street" VARCHAR(255),
    "City" VARCHAR(100),
    "State" VARCHAR(100),
    "Region" VARCHAR(100),
    "PostalCode" VARCHAR(20),
    "Country" VARCHAR(100),
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);
    `
    await appPool.query(query);
    console.log("✅ Addresses table ready")
}

module.exports = { Addresses };