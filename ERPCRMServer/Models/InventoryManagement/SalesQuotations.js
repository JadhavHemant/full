const { appPool } = require('../../config/db');

const SalesQuotations = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "SalesQuotations" (
      "Id" SERIAL PRIMARY KEY,
      "QuotationNumber" VARCHAR(50) NOT NULL,
      "CustomerId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "QuotationDate" DATE DEFAULT CURRENT_DATE,
      "ValidUntil" DATE,
      "Status" VARCHAR(30) DEFAULT 'Draft',
      "SubTotal" DECIMAL(18,2) DEFAULT 0,
      "DiscountAmount" DECIMAL(18,2) DEFAULT 0,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "ShippingCharges" DECIMAL(18,2) DEFAULT 0,
      "GrandTotal" DECIMAL(18,2) DEFAULT 0,
      "Terms" VARCHAR(500),
      "Notes" VARCHAR(500),
      "PreparedById" INT,
      "ConvertedToOrder" BOOLEAN DEFAULT false,
      "SalesOrderId" INT,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ SalesQuotations table initialized');
  } catch (error) {
    console.error('❌ Error creating SalesQuotations table:', error.message);
  }
};

const SalesQuotationItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "SalesQuotationItems" (
      "Id" SERIAL PRIMARY KEY,
      "QuotationId" INT NOT NULL,
      "ProductId" INT,
      "Quantity" DECIMAL(18,2) NOT NULL,
      "UnitPrice" DECIMAL(18,2),
      "DiscountPercent" DECIMAL(5,2) DEFAULT 0,
      "DiscountAmount" DECIMAL(18,2) DEFAULT 0,
      "TaxRate" DECIMAL(5,2) DEFAULT 0,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "TotalAmount" DECIMAL(18,2) DEFAULT 0,
      "Description" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ SalesQuotationItems table initialized');
  } catch (error) {
    console.error('❌ Error creating SalesQuotationItems table:', error.message);
  }
};

module.exports = { SalesQuotations, SalesQuotationItems };