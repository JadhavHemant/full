const { appPool } = require('../../config/db');

const Notifications = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Notifications" (
      "Id" SERIAL PRIMARY KEY,
      "UserId" INT NOT NULL,
      "Title" VARCHAR(200) NOT NULL,
      "Message" VARCHAR(1000),
      "Type" VARCHAR(50),
      "ReferenceId" INT,
      "ReferenceType" VARCHAR(50),
      "IsRead" BOOLEAN DEFAULT false,
      "ReadAt" TIMESTAMP,
      "CompanyId" INT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ Notifications table initialized');
  } catch (error) {
    console.error('❌ Error creating Notifications table:', error.message);
  }
};

const ApprovalWorkflows = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ApprovalWorkflows" (
      "Id" SERIAL PRIMARY KEY,
      "WorkflowName" VARCHAR(100) NOT NULL,
      "ModuleType" VARCHAR(50) NOT NULL,
      "RecordId" INT NOT NULL,
      "RequestedById" INT,
      "CompanyId" INT,
      "Status" VARCHAR(30) DEFAULT 'Pending',
      "Priority" VARCHAR(20) DEFAULT 'Medium',
      "RequestRemarks" VARCHAR(500),
      "ApprovedById" INT,
      "ApprovedAt" TIMESTAMP,
      "ApprovalRemarks" VARCHAR(500),
      "RejectedById" INT,
      "RejectedAt" TIMESTAMP,
      "RejectionRemarks" VARCHAR(500),
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ ApprovalWorkflows table initialized');
  } catch (error) {
    console.error('❌ Error creating ApprovalWorkflows table:', error.message);
  }
};

const Expenses = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Expenses" (
      "Id" SERIAL PRIMARY KEY,
      "ExpenseNumber" VARCHAR(50) NOT NULL,
      "Category" VARCHAR(100),
      "SubCategory" VARCHAR(100),
      "Description" VARCHAR(500),
      "Amount" DECIMAL(18,2) NOT NULL,
      "TaxAmount" DECIMAL(18,2) DEFAULT 0,
      "TotalAmount" DECIMAL(18,2) DEFAULT 0,
      "ExpenseDate" DATE DEFAULT CURRENT_DATE,
      "PaymentMode" VARCHAR(50),
      "ReferenceNumber" VARCHAR(100),
      "VendorId" INT,
      "SupplierId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "DepartmentId" INT,
      "EmployeeId" INT,
      "Status" VARCHAR(30) DEFAULT 'Draft',
      "ApprovedById" INT,
      "ApprovedAt" TIMESTAMP,
      "IsReimbursable" BOOLEAN DEFAULT false,
      "IsReimbursed" BOOLEAN DEFAULT false,
      "ReceiptPath" VARCHAR(500),
      "Notes" VARCHAR(500),
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ Expenses table initialized');
  } catch (error) {
    console.error('❌ Error creating Expenses table:', error.message);
  }
};

const WarehouseRacks = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "WarehouseRacks" (
      "Id" SERIAL PRIMARY KEY,
      "WarehouseId" INT NOT NULL,
      "RackNumber" VARCHAR(50) NOT NULL,
      "Name" VARCHAR(100),
      "Description" VARCHAR(200),
      "Capacity" INT DEFAULT 0,
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ WarehouseRacks table initialized');
  } catch (error) {
    console.error('❌ Error creating WarehouseRacks table:', error.message);
  }
};

const WarehouseBins = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "WarehouseBins" (
      "Id" SERIAL PRIMARY KEY,
      "WarehouseId" INT NOT NULL,
      "RackId" INT,
      "BinNumber" VARCHAR(50) NOT NULL,
      "ShelfNumber" VARCHAR(50),
      "Name" VARCHAR(100),
      "Description" VARCHAR(200),
      "MaxCapacity" DECIMAL(18,2) DEFAULT 0,
      "CurrentOccupancy" DECIMAL(18,2) DEFAULT 0,
      "ProductId" INT,
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ WarehouseBins table initialized');
  } catch (error) {
    console.error('❌ Error creating WarehouseBins table:', error.message);
  }
};

module.exports = { Notifications, ApprovalWorkflows, Expenses, WarehouseRacks, WarehouseBins };