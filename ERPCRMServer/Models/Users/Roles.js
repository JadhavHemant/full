const { appPool } = require('../../config/db');

const Roles = async () => {
  const query = `
CREATE TABLE IF NOT EXISTS "Roles" (
    "Id" SERIAL PRIMARY KEY,
    "RoleName" VARCHAR(100) UNIQUE NOT NULL,   -- Owner, Manager, TeamLead, Employee
    "Permissions" JSONB,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IsDeleted" BOOLEAN DEFAULT FALSE,
    "Flag" BOOLEAN DEFAULT TRUE
);`;
  await appPool.query(query);
  console.log("✅ Roles table ready");
};

module.exports = { Roles };
