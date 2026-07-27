const { appPool } = require("../../config/db");

const FinancialYear = async () => {
  const query = `
<<<<<<< HEAD
    CREATE TABLE IF NOT EXISTS "FinancialYears" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "FiscalYearName" VARCHAR(100) NOT NULL,
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsActive" BOOLEAN DEFAULT TRUE,
=======
    CREATE TABLE IF NOT EXISTS "FinancialYear" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(100) NOT NULL,
      "StartDate" DATE NOT NULL,
      "EndDate" DATE NOT NULL,
      "IsActive" BOOLEAN DEFAULT FALSE,
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
<<<<<<< HEAD
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
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
      "IsClosed" BOOLEAN DEFAULT FALSE,
      "ClosedAt" TIMESTAMP,
      "ClosedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
<<<<<<< HEAD
      UNIQUE("FinancialYearId", "PeriodName")
=======
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("FinancialYearId", "Name")
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
    );
  `;

  await appPool.query(query);
<<<<<<< HEAD
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_years_company ON "FinancialYears"("CompanyId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_financial_years_active ON "FinancialYears"("CompanyId", "IsActive")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_accounting_periods_fy ON "AccountingPeriods"("FinancialYearId")');
  console.log("✅ FinancialYears & AccountingPeriods tables ready");
};

module.exports = { FinancialYear };
=======
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_accounting_period_fy ON "AccountingPeriod"("FinancialYearId")');
  console.log("✅ AccountingPeriod table ready");
};

module.exports = { FinancialYear, AccountingPeriod };
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
