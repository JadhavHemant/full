const { appPool } = require("../../config/db");

const PutawayTask = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PutawayTask" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "TaskNumber" VARCHAR(50) UNIQUE NOT NULL,
      "ReferenceType" VARCHAR(50) NOT NULL,
      "ReferenceId" INT,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "FromBinId" INT REFERENCES "Bins"("Id") ON DELETE SET NULL,
      "ToBinId" INT REFERENCES "Bins"("Id") ON DELETE SET NULL,
      "Quantity" NUMERIC(15,2) NOT NULL DEFAULT 0,
      "PutawayQuantity" NUMERIC(15,2) DEFAULT 0,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Priority" VARCHAR(20) DEFAULT 'Normal',
      "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CompletedAt" TIMESTAMP,
      "Notes" TEXT,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_putaway_status ON "PutawayTask"("Status")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_putaway_reference ON "PutawayTask"("ReferenceType", "ReferenceId")');
  console.log("✅ PutawayTask table ready");
};

const PickingList = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PickingList" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "ListNumber" VARCHAR(50) UNIQUE NOT NULL,
      "ReferenceType" VARCHAR(50) NOT NULL,
      "ReferenceId" INT,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "PickingType" VARCHAR(50) DEFAULT 'Single',
      "Priority" VARCHAR(20) DEFAULT 'Normal',
      "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CompletedAt" TIMESTAMP,
      "Notes" TEXT,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_picking_status ON "PickingList"("Status")');
  console.log("✅ PickingList table ready");
};

const PickingItem = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PickingItem" (
      "Id" SERIAL PRIMARY KEY,
      "PickingListId" INT REFERENCES "PickingList"("Id") ON DELETE CASCADE,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "FromBinId" INT REFERENCES "Bins"("Id") ON DELETE SET NULL,
      "Quantity" NUMERIC(15,2) NOT NULL DEFAULT 0,
      "PickedQuantity" NUMERIC(15,2) DEFAULT 0,
      "BatchId" INT REFERENCES "Batches"("Id") ON DELETE SET NULL,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Notes" TEXT
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_picking_item_list ON "PickingItem"("PickingListId")');
  console.log("✅ PickingItem table ready");
};

const CycleCount = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "CycleCount" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "CountNumber" VARCHAR(50) UNIQUE NOT NULL,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "CountType" VARCHAR(50) DEFAULT 'ABC',
      "Status" VARCHAR(50) DEFAULT 'Planned',
      "ScheduledDate" DATE,
      "CompletedDate" DATE,
      "AssignedTo" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "TotalItems" INT DEFAULT 0,
      "CountedItems" INT DEFAULT 0,
      "VarianceItems" INT DEFAULT 0,
      "VarianceValue" NUMERIC(15,2) DEFAULT 0,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cycle_count_warehouse ON "CycleCount"("WarehouseId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cycle_count_status ON "CycleCount"("Status")');
  console.log("✅ CycleCount table ready");
};

const CycleCountItem = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "CycleCountItem" (
      "Id" SERIAL PRIMARY KEY,
      "CycleCountId" INT REFERENCES "CycleCount"("Id") ON DELETE CASCADE,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "BinId" INT REFERENCES "Bins"("Id") ON DELETE SET NULL,
      "ExpectedQuantity" NUMERIC(15,2) DEFAULT 0,
      "CountedQuantity" NUMERIC(15,2) DEFAULT 0,
      "Variance" NUMERIC(15,2) DEFAULT 0,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "CountedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CountedAt" TIMESTAMP,
      "Notes" TEXT
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cycle_count_item_count ON "CycleCountItem"("CycleCountId")');
  console.log("✅ CycleCountItem table ready");
};

module.exports = { PutawayTask, PickingList, PickingItem, CycleCount, CycleCountItem };