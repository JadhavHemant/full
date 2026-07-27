const { appPool } = require("../../config/db");

const RFQ = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RFQ" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "RFQNumber" VARCHAR(50) UNIQUE NOT NULL,
      "Title" VARCHAR(255) NOT NULL,
      "Description" TEXT,
      "Status" VARCHAR(50) DEFAULT 'Draft',
      "Priority" VARCHAR(20) DEFAULT 'Normal',
      "ExpectedDeliveryDate" DATE,
      "ValidUntil" DATE,
      "Currency" VARCHAR(10) DEFAULT 'INR',
      "ExchangeRate" NUMERIC(10,4) DEFAULT 1,
      "SubTotal" NUMERIC(15,2) DEFAULT 0,
      "TaxAmount" NUMERIC(15,2) DEFAULT 0,
      "TotalAmount" NUMERIC(15,2) DEFAULT 0,
      "Notes" TEXT,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_rfq_company ON "RFQ"("CompanyId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_rfq_status ON "RFQ"("Status")');
  console.log("✅ RFQ table ready");
};

const RFQItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RFQItems" (
      "Id" SERIAL PRIMARY KEY,
      "RFQId" INT REFERENCES "RFQ"("Id") ON DELETE CASCADE,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE SET NULL,
      "ProductName" VARCHAR(255),
      "SKU" VARCHAR(100),
      "Description" TEXT,
      "Quantity" NUMERIC(15,2) NOT NULL DEFAULT 0,
      "UnitId" INT REFERENCES "Units"("Id") ON DELETE SET NULL,
      "ExpectedUnitPrice" NUMERIC(15,2) DEFAULT 0,
      "TaxRate" NUMERIC(5,2) DEFAULT 0,
      "TaxAmount" NUMERIC(15,2) DEFAULT 0,
      "TotalAmount" NUMERIC(15,2) DEFAULT 0,
      "Notes" TEXT,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON "RFQItems"("RFQId")');
  console.log("✅ RFQItems table ready");
};

const RFQVendors = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "RFQVendors" (
      "Id" SERIAL PRIMARY KEY,
      "RFQId" INT REFERENCES "RFQ"("Id") ON DELETE CASCADE,
      "SupplierId" INT REFERENCES "Suppliers"("Id") ON DELETE CASCADE,
      "Status" VARCHAR(50) DEFAULT 'Invited',
      "ResponseDate" TIMESTAMP,
      "ResponseNotes" TEXT,
      "QuotedAmount" NUMERIC(15,2),
      "DeliveryDays" INT,
      "IsSelected" BOOLEAN DEFAULT FALSE,
      "RejectedReason" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("RFQId", "SupplierId")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_rfq_vendors_rfq ON "RFQVendors"("RFQId")');
  console.log("✅ RFQVendors table ready");
};

module.exports = { RFQ, RFQItems, RFQVendors };