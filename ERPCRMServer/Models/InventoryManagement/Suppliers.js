// db/migrations/suppliers.js
const { appPool } = require("../../config/db");

const Suppliers = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Suppliers" (
      "Id" SERIAL PRIMARY KEY,
      "Name" VARCHAR(255) NOT NULL,
      "ContactPerson" VARCHAR(255),
      "Email" VARCHAR(255),
      "Phone" VARCHAR(20),
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "CreatedBy" INT REFERENCES "Users"("UserId"),
      "Address" TEXT,
      "City" VARCHAR(100),
      "State" VARCHAR(100),
      "Country" VARCHAR(100),
      "PostalCode" VARCHAR(20),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await appPool.query(query);
  console.log("✅ Suppliers table ready");
};

module.exports = { Suppliers };
