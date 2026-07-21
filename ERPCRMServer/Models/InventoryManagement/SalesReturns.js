const { appPool } = require('../../config/db');

const SalesReturns = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "SalesReturns" (
      "Id" SERIAL PRIMARY KEY,
      "ReturnNumber" VARCHAR(50) NOT NULL,
      "SalesOrderId" INT,
      "CustomerId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "WarehouseId" INT,
      "ReturnDate" DATE DEFAULT CURRENT_DATE,
      "Reason" VARCHAR(500),
      "Status" VARCHAR(30) DEFAULT 'Draft',
      "SubTotal" DECIMAL(18,2) DEFAULT 0,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "GrandTotal" DECIMAL(18,2) DEFAULT 0,
      "RefundStatus" VARCHAR(30) DEFAULT 'Pending',
      "RefundAmount" DECIMAL(18,2) DEFAULT 0,
      "RefundDate" DATE,
      "ReceivedById" INT,
      "Notes" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ SalesReturns table initialized');
  } catch (error) {
    console.error('❌ Error creating SalesReturns table:', error.message);
  }
};

const SalesReturnItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "SalesReturnItems" (
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
      "Condition" VARCHAR(50) DEFAULT 'Good',
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ SalesReturnItems table initialized');
  } catch (error) {
    console.error('❌ Error creating SalesReturnItems table:', error.message);
  }
};

module.exports = { SalesReturns, SalesReturnItems };