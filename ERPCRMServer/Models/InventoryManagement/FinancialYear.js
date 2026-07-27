const { appPool } = require("../../config/db");

const FinancialYear = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "FinancialYears" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "FiscalYearName" VARCHAR(100) NOT NULL,
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("CompanyId", "FiscalYearName")
    );

    CREATE TABLE IF NOT EXISTS "AccountingPeriods" (
      "Id" SERIAL PRIMARY KEY,
      "FinancialYearId" INT REFERENCES "FinancialYears"("Id") ON DELETE CASCADE,
      "PeriodName" VARCHAR(50) NOT NULL,
      "PeriodType" VARCHAR(20) DEFAULT 'Monthly',
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsOpen" BOOLEAN DEFAULT TRUE,
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("FinancialYearId", "PeriodName")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_years_company ON "FinancialYears"("CompanyId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_years_active ON "FinancialYears"("CompanyId", "IsActive")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_accounting_periods_fy ON "AccountingPeriods"("FinancialYearId")');
  console.log("✅ FinancialYears & AccountingPeriods tables ready");
};

module.exports = { FinancialYear };