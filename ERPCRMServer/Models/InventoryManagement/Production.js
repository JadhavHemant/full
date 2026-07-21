const { appPool } = require('../../config/db');

const BOM = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "BOM" (
      "Id" SERIAL PRIMARY KEY,
      "BOMCode" VARCHAR(50) NOT NULL,
      "ProductId" INT NOT NULL,
      "ProductName" VARCHAR(200),
      "Version" VARCHAR(20) DEFAULT '1.0',
      "Description" VARCHAR(500),
      "Quantity" DECIMAL(18,2) DEFAULT 1,
      "UnitId" INT,
      "CompanyId" INT,
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ BOM table initialized');
  } catch (error) {
    console.error('❌ Error creating BOM table:', error.message);
  }
};

const BOMItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "BOMItems" (
      "Id" SERIAL PRIMARY KEY,
      "BOMId" INT NOT NULL,
      "ProductId" INT NOT NULL,
      "Quantity" DECIMAL(18,2) NOT NULL,
      "UnitId" INT,
      "UnitCost" DECIMAL(18,2) DEFAULT 0,
      "WastagePercent" DECIMAL(5,2) DEFAULT 0,
      "Remarks" VARCHAR(200),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ BOMItems table initialized');
  } catch (error) {
    console.error('❌ Error creating BOMItems table:', error.message);
  }
};

const ProductionOrders = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ProductionOrders" (
      "Id" SERIAL PRIMARY KEY,
      "OrderNumber" VARCHAR(50) NOT NULL,
      "BOMId" INT,
      "ProductId" INT NOT NULL,
      "PlannedQuantity" DECIMAL(18,2) NOT NULL,
      "ProducedQuantity" DECIMAL(18,2) DEFAULT 0,
      "RejectedQuantity" DECIMAL(18,2) DEFAULT 0,
      "UnitId" INT,
      "CompanyId" INT,
      "WarehouseId" INT,
      "Status" VARCHAR(30) DEFAULT 'Planned',
      "Priority" VARCHAR(20) DEFAULT 'Medium',
      "PlannedStartDate" DATE,
      "PlannedEndDate" DATE,
      "ActualStartDate" DATE,
      "ActualEndDate" DATE,
      "AssignedTo" INT,
      "Remarks" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ ProductionOrders table initialized');
  } catch (error) {
    console.error('❌ Error creating ProductionOrders table:', error.message);
  }
};

const ProductionTracking = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ProductionTracking" (
      "Id" SERIAL PRIMARY KEY,
      "ProductionOrderId" INT NOT NULL,
      "Stage" VARCHAR(100),
      "Status" VARCHAR(30) DEFAULT 'In Progress',
      "QuantityProcessed" DECIMAL(18,2) DEFAULT 0,
      "QuantityRejected" DECIMAL(18,2) DEFAULT 0,
      "StartedAt" TIMESTAMP,
      "CompletedAt" TIMESTAMP,
      "OperatorId" INT,
      "Remarks" VARCHAR(500),
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ ProductionTracking table initialized');
  } catch (error) {
    console.error('❌ Error creating ProductionTracking table:', error.message);
  }
};

module.exports = { BOM, BOMItems, ProductionOrders, ProductionTracking };