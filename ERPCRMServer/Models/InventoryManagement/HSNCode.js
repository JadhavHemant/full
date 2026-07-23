const { appPool } = require("../../config/db");

const HSNCode = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "HSNCode" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Code" VARCHAR(20) NOT NULL,
      "Description" TEXT,
      "Type" VARCHAR(10) DEFAULT 'HSN',
      "TaxRate" NUMERIC(5,2) DEFAULT 0,
      "CessPercentage" NUMERIC(5,2) DEFAULT 0,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "EffectiveFrom" DATE,
      "EffectiveTo" DATE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("CompanyId", "Code")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_hsn_code_company ON "HSNCode"("CompanyId")');
  console.log("✅ HSNCode table ready");
};

module.exports = { HSNCode };