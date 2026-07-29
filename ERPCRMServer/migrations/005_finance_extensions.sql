-- Migration 005: Finance Module Extensions
-- Extends existing ChartOfAccounts and JournalEntry tables; creates new tables.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ── ChartOfAccounts extensions ────────────────────────────────────────────────
ALTER TABLE "ChartOfAccounts"
  ADD COLUMN IF NOT EXISTS "CurrentBalance"    NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "CashFlowCategory"  VARCHAR(50),   -- Operating | Investing | Financing
  ADD COLUMN IF NOT EXISTS "IsActive"          BOOLEAN DEFAULT true;

-- ── JournalEntry extensions ───────────────────────────────────────────────────
ALTER TABLE "JournalEntry"
  ADD COLUMN IF NOT EXISTS "IsDeleted"  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "PostedAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "PostedBy"   INTEGER;

-- ── JournalEntryLine extensions ───────────────────────────────────────────────
ALTER TABLE "JournalEntryLine"
  ADD COLUMN IF NOT EXISTS "IsReconciled"  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "CostCenterId"  INTEGER;

-- ── Cost Centers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CostCenters" (
  "Id"          SERIAL PRIMARY KEY,
  "CompanyId"   INTEGER,
  "Code"        VARCHAR(50),
  "Name"        VARCHAR(200) NOT NULL,
  "Description" TEXT,
  "ParentId"    INTEGER REFERENCES "CostCenters"("Id"),
  "IsActive"    BOOLEAN DEFAULT true,
  "IsDeleted"   BOOLEAN DEFAULT false,
  "CreatedBy"   INTEGER,
  "UpdatedBy"   INTEGER,
  "CreatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "UpdatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_costcenters_code_company"
  ON "CostCenters"("Code","CompanyId") WHERE "IsDeleted" = false;

-- ── Budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Budgets" (
  "Id"              SERIAL PRIMARY KEY,
  "CompanyId"       INTEGER,
  "Name"            VARCHAR(200) NOT NULL,
  "FinancialYearId" INTEGER,
  "Period"          VARCHAR(20) DEFAULT 'Annual',
  "IsActive"        BOOLEAN DEFAULT true,
  "IsDeleted"       BOOLEAN DEFAULT false,
  "CreatedBy"       INTEGER,
  "UpdatedBy"       INTEGER,
  "CreatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "UpdatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BudgetLines" (
  "Id"            SERIAL PRIMARY KEY,
  "BudgetId"      INTEGER NOT NULL REFERENCES "Budgets"("Id") ON DELETE CASCADE,
  "AccountId"     INTEGER NOT NULL,
  "CostCenterId"  INTEGER,
  "BudgetAmount"  NUMERIC(15,2) DEFAULT 0,
  "ActualAmount"  NUMERIC(15,2) DEFAULT 0,
  "CreatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_budgetlines_budgetid" ON "BudgetLines"("BudgetId");

-- ── User Module Assignments (for dynamic sidebar) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "UserModuleAssignments" (
  "Id"         SERIAL PRIMARY KEY,
  "UserId"     INTEGER NOT NULL,
  "CompanyId"  INTEGER,
  "Modules"    JSONB NOT NULL DEFAULT '[]',
  "CreatedBy"  INTEGER,
  "UpdatedBy"  INTEGER,
  "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "UpdatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_user_module_assignments" UNIQUE ("UserId")
);

-- ── Indexes for Finance performance ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_je_companyid_date"
  ON "JournalEntry"("CompanyId","EntryDate") WHERE "IsDeleted" = false;
CREATE INDEX IF NOT EXISTS "idx_jel_accountid"
  ON "JournalEntryLine"("AccountId");
CREATE INDEX IF NOT EXISTS "idx_coa_companyid_type"
  ON "ChartOfAccounts"("CompanyId","AccountType") WHERE "IsDeleted" = false;
