const { appPool } = require("../../config/db");

const FinancialYear = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "FinancialYear" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(100) NOT NULL,
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsActive" BOOLEAN DEFAULT FALSE,
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("CompanyId", "Name")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_year_company ON "FinancialYear"("CompanyId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_year_active ON "FinancialYear"("IsActive")');
  console.log("✅ FinancialYear table ready");
};

const AccountingPeriod = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
      "Id" SERIAL PRIMARY KEY,
      "FinancialYearId" INT REFERENCES "FinancialYear"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(100) NOT NULL,
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsActive" BOOLEAN DEFAULT FALSE,
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("FinancialYearId", "Name")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_accounting_period_fy ON "AccountingPeriod"("FinancialYearId")');
  console.log("✅ AccountingPeriod table ready");
};

module.exports = { FinancialYear, AccountingPeriod };