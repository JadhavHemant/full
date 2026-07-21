const { appPool } = require("../../config/db");

const Invoices = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Invoices" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "InvoiceNumber" VARCHAR(100) NOT NULL,
      "AccountId" INT REFERENCES "Accounts"("Id") ON DELETE SET NULL,
      "OpportunityId" INT REFERENCES "Opportunities"("Id") ON DELETE SET NULL,
      "QuoteId" INT REFERENCES "Quotes"("Id") ON DELETE SET NULL,
      "Subtotal" NUMERIC(15,2) DEFAULT 0,
      "TaxAmount" NUMERIC(15,2) DEFAULT 0,
      "TotalAmount" NUMERIC(15,2) DEFAULT 0,
      "PaymentStatus" VARCHAR(50) DEFAULT 'Pending',
      "PaymentMethod" VARCHAR(100),
      "DueDate" DATE,
      "GeneratedDate" DATE DEFAULT CURRENT_DATE,
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
  await appPool.query('CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_company_invoice_number" ON "Invoices" ("CompanyId", "InvoiceNumber");');
  await appPool.query('ALTER TABLE "Invoices" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
  console.log("Invoices table ready");
};

module.exports = { Invoices };
