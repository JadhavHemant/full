const { appPool } = require('../../config/db');

const PurchaseReturns = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PurchaseReturns" (
      "Id" SERIAL PRIMARY KEY,
      "ReturnNumber" VARCHAR(50) NOT NULL,
      "PurchaseOrderId" INT,
      "SupplierId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "WarehouseId" INT,
      "ReturnDate" DATE DEFAULT CURRENT_DATE,
      "Reason" VARCHAR(500),
      "Status" VARCHAR(30) DEFAULT 'Draft',
      "TotalAmount" DECIMAL(18,2) DEFAULT 0,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "GrandTotal" DECIMAL(18,2) DEFAULT 0,
      "ReceivedById" INT,
      "Notes" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ PurchaseReturns table initialized');
  } catch (error) {
    console.error('❌ Error creating PurchaseReturns table:', error.message);
  }
};

const PurchaseReturnItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PurchaseReturnItems" (
      "Id" SERIAL PRIMARY KEY,
      "ReturnId" INT NOT NULL,
      "ProductId" INT,
      "BatchId" INT,
      "Quantity" DECIMAL(18,2) NOT NULL,
      "UnitPrice" DECIMAL(18,2),
      "TaxRate" DECIMAL(5,2) DEFAULT 0,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "TotalAmount" DECIMAL(18,2) DEFAULT 0,
      "Reason" VARCHAR(200),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ PurchaseReturnItems table initialized');
  } catch (error) {
    console.error('❌ Error creating PurchaseReturnItems table:', error.message);
  }
};

module.exports = { PurchaseReturns, PurchaseReturnItems };