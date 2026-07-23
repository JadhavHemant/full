const { appPool } = require("../../config/db");

const ChartOfAccounts = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ChartOfAccounts" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "AccountCode" VARCHAR(50) NOT NULL,
      "AccountName" VARCHAR(255) NOT NULL,
      "AccountType" VARCHAR(50) NOT NULL,
      "ParentAccountId" INT REFERENCES "ChartOfAccounts"("Id") ON DELETE SET NULL,
      "IsHeader" BOOLEAN DEFAULT FALSE,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "OpeningBalance" NUMERIC(15,2) DEFAULT 0,
      "CurrentBalance" NUMERIC(15,2) DEFAULT 0,
      "CurrencyId" INT REFERENCES "Currencies"("Id") ON DELETE SET NULL,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("CompanyId", "AccountCode")
    );
  `;
  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_coa_parent ON "ChartOfAccounts"("ParentAccountId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_coa_type ON "ChartOfAccounts"("AccountType")');
  console.log("✅ ChartOfAccounts table ready");
};

const JournalEntry = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "JournalEntry" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "EntryNumber" VARCHAR(50) UNIQUE NOT NULL,
      "EntryDate" DATE NOT NULL DEFAULT CURRENT_DATE,
      "ReferenceType" VARCHAR(50),
      "ReferenceId" INT,
      "Description" TEXT,
      "TotalDebit" NUMERIC(15,2) DEFAULT 0,
      "TotalCredit" NUMERIC(15,2) DEFAULT 0,
      "IsPosted" BOOLEAN DEFAULT FALSE,
      "PostedAt" TIMESTAMP,
      "PostedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "FinancialYearId" INT REFERENCES "FinancialYear"("Id") ON DELETE SET NULL,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;
  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_journal_date ON "JournalEntry"("EntryDate")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_journal_reference ON "JournalEntry"("ReferenceType","ReferenceId")');
  console.log("✅ JournalEntry table ready");
};

const JournalEntryLine = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "JournalEntryLine" (
      "Id" SERIAL PRIMARY KEY,
      "JournalEntryId" INT REFERENCES "JournalEntry"("Id") ON DELETE CASCADE,
      "AccountId" INT REFERENCES "ChartOfAccounts"("Id") ON DELETE CASCADE,
      "Debit" NUMERIC(15,2) DEFAULT 0,
      "Credit" NUMERIC(15,2) DEFAULT 0,
      "Description" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_jel_entry ON "JournalEntryLine"("JournalEntryId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_jel_account ON "JournalEntryLine"("AccountId")');
  console.log("✅ JournalEntryLine table ready");
};

module.exports = { ChartOfAccounts, JournalEntry, JournalEntryLine };