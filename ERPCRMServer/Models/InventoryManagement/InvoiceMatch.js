const { appPool } = require("../../config/db");

const InvoiceMatch = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "InvoiceMatch" (
      "Id" SERIAL PRIMARY KEY,
      "PurchaseOrderId" INT REFERENCES "PurchaseOrders"("Id") ON DELETE CASCADE,
      "GRNId" INT REFERENCES "GRN"("Id") ON DELETE SET NULL,
      "InvoiceId" INT REFERENCES "Invoices"("Id") ON DELETE SET NULL,
      "MatchStatus" VARCHAR(50) DEFAULT 'Pending',
      "POTotal" NUMERIC(15,2) DEFAULT 0,
      "GRNTotal" NUMERIC(15,2) DEFAULT 0,
      "InvoiceTotal" NUMERIC(15,2) DEFAULT 0,
      "VarianceThreshold" NUMERIC(15,2) DEFAULT 0,
      "TotalVariance" NUMERIC(15,2) DEFAULT 0,
      "VariancePercentage" NUMERIC(5,2) DEFAULT 0,
      "ApprovalStatus" VARCHAR(50) DEFAULT 'Pending',
      "ApprovedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ApprovedAt" TIMESTAMP,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_invoice_match_po ON "InvoiceMatch"("PurchaseOrderId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_invoice_match_status ON "InvoiceMatch"("MatchStatus")');
  console.log("✅ InvoiceMatch table ready");
};

const InvoiceMatchLine = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "InvoiceMatchLine" (
      "Id" SERIAL PRIMARY KEY,
      "InvoiceMatchId" INT REFERENCES "InvoiceMatch"("Id") ON DELETE CASCADE,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE SET NULL,
      "POQuantity" NUMERIC(15,2) DEFAULT 0,
      "POUnitPrice" NUMERIC(15,2) DEFAULT 0,
      "POTotal" NUMERIC(15,2) DEFAULT 0,
      "GRNQuantity" NUMERIC(15,2) DEFAULT 0,
      "GRNAcceptedQuantity" NUMERIC(15,2) DEFAULT 0,
      "InvoiceQuantity" NUMERIC(15,2) DEFAULT 0,
      "InvoiceUnitPrice" NUMERIC(15,2) DEFAULT 0,
      "InvoiceTotal" NUMERIC(15,2) DEFAULT 0,
      "QuantityVariance" NUMERIC(15,2) DEFAULT 0,
      "PriceVariance" NUMERIC(15,2) DEFAULT 0,
      "TotalVariance" NUMERIC(15,2) DEFAULT 0,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Notes" TEXT
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_invoice_match_line_match ON "InvoiceMatchLine"("InvoiceMatchId")');
  console.log("✅ InvoiceMatchLine table ready");
};

module.exports = { InvoiceMatch, InvoiceMatchLine };