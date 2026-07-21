const { appPool } = require("../../config/db");

const createCompanySettingsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "CompanySettings" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT UNIQUE NOT NULL REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "Version" INT NOT NULL DEFAULT 1,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_company_settings_company ON "CompanySettings"("CompanyId");
    CREATE INDEX IF NOT EXISTS idx_company_settings_gin ON "CompanySettings" USING GIN ("Settings");
  `;

  await appPool.query(query);
  console.log("CompanySettings table ready");
};

module.exports = { createCompanySettingsTable };
