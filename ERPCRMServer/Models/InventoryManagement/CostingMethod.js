const { appPool } = require("../../config/db");

const CostingMethod = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "CostingMethod" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "MethodName" VARCHAR(50) NOT NULL,
      "MethodCode" VARCHAR(50) UNIQUE NOT NULL,
      "Description" TEXT,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDefault" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_costing_method_company_code ON "CostingMethod"("CompanyId", "MethodCode")');
  console.log("✅ CostingMethod table ready");
};

module.exports = { CostingMethod };