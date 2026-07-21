const { appPool } = require("../../config/db");

const Quotes = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Quotes" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "QuoteNumber" VARCHAR(100) NOT NULL,
      "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
      "ContactId" INT REFERENCES "Contacts"("Id") ON DELETE SET NULL,
      "OpportunityId" INT REFERENCES "Opportunities"("Id") ON DELETE SET NULL,
      "ValidTillDate" DATE,
      "Status" VARCHAR(50) DEFAULT 'Draft',
      "Subtotal" NUMERIC(15,2) DEFAULT 0,
      "DiscountAmount" NUMERIC(15,2) DEFAULT 0,
      "TaxAmount" NUMERIC(15,2) DEFAULT 0,
      "TotalAmount" NUMERIC(15,2) DEFAULT 0,
      "TermsAndConditions" TEXT,
      "Notes" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Flag" BOOLEAN DEFAULT FALSE
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE UNIQUE INDEX IF NOT EXISTS "idx_quotes_company_quote_number" ON "Quotes" ("CompanyId", "QuoteNumber");');
  await appPool.query('ALTER TABLE "Quotes" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
  console.log("Quotes table ready");
};

module.exports = { Quotes };
