const { appPool } = require('../../config/db');

const PurchaseRequisitions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PurchaseRequisitions" (
      "Id" SERIAL PRIMARY KEY,
      "RequisitionNumber" VARCHAR(50) NOT NULL,
      "RequestedById" INT,
      "DepartmentId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "Priority" VARCHAR(20) DEFAULT 'Medium',
      "Status" VARCHAR(30) DEFAULT 'Draft',
      "RequiredByDate" DATE,
      "Remarks" VARCHAR(500),
      "ApprovedById" INT,
      "ApprovedAt" TIMESTAMP,
      "ApprovalRemarks" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ PurchaseRequisitions table initialized');
  } catch (error) {
    console.error('❌ Error creating PurchaseRequisitions table:', error.message);
  }
};

const PurchaseRequisitionItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PurchaseRequisitionItems" (
      "Id" SERIAL PRIMARY KEY,
      "RequisitionId" INT NOT NULL,
      "ProductId" INT,
      "Quantity" DECIMAL(18,2) NOT NULL,
      "UnitPrice" DECIMAL(18,2),
      "Specifications" VARCHAR(500),
      "Remarks" VARCHAR(200),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ PurchaseRequisitionItems table initialized');
  } catch (error) {
    console.error('❌ Error creating PurchaseRequisitionItems table:', error.message);
  }
};

module.exports = { PurchaseRequisitions, PurchaseRequisitionItems };