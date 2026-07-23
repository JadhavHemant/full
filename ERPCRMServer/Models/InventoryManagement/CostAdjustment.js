const { appPool } = require("../../config/db");

const CostAdjustment = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "CostAdjustment" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "AdjustmentType" VARCHAR(50) NOT NULL,
      "OldCost" NUMERIC(15,2) NOT NULL,
      "NewCost" NUMERIC(15,2) NOT NULL,
      "AdjustmentAmount" NUMERIC(15,2) NOT NULL,
      "Reason" TEXT,
      "ReferenceDocument" VARCHAR(100),
      "ReferenceId" INT,
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "ApprovedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ApprovedAt" TIMESTAMP,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cost_adjustment_product ON "CostAdjustment"("ProductId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cost_adjustment_warehouse ON "CostAdjustment"("WarehouseId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_cost_adjustment_status ON "CostAdjustment"("Status")');
  console.log("✅ CostAdjustment table ready");
};

module.exports = { CostAdjustment };