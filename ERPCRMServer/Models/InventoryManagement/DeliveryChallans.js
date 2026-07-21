const { appPool } = require('../../config/db');

const DeliveryChallans = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "DeliveryChallans" (
      "Id" SERIAL PRIMARY KEY,
      "ChallanNumber" VARCHAR(50) NOT NULL,
      "SalesOrderId" INT,
      "CustomerId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "WarehouseId" INT,
      "DeliveryDate" DATE DEFAULT CURRENT_DATE,
      "ExpectedDeliveryDate" DATE,
      "Status" VARCHAR(30) DEFAULT 'Pending',
      "VehicleNumber" VARCHAR(50),
      "DriverName" VARCHAR(100),
      "DriverPhone" VARCHAR(20),
      "ShippingAddress" VARCHAR(500),
      "TotalItems" INT DEFAULT 0,
      "TotalQuantity" DECIMAL(18,2) DEFAULT 0,
      "ReceivedById" INT,
      "ReceivedAt" TIMESTAMP,
      "Notes" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ DeliveryChallans table initialized');
  } catch (error) {
    console.error('❌ Error creating DeliveryChallans table:', error.message);
  }
};

const DeliveryChallanItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "DeliveryChallanItems" (
      "Id" SERIAL PRIMARY KEY,
      "ChallanId" INT NOT NULL,
      "ProductId" INT,
      "BatchId" INT,
      "Quantity" DECIMAL(18,2) NOT NULL,
      "DispatchedQuantity" DECIMAL(18,2) DEFAULT 0,
      "ReceivedQuantity" DECIMAL(18,2) DEFAULT 0,
      "UnitPrice" DECIMAL(18,2),
      "Description" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ DeliveryChallanItems table initialized');
  } catch (error) {
    console.error('❌ Error creating DeliveryChallanItems table:', error.message);
  }
};

module.exports = { DeliveryChallans, DeliveryChallanItems };