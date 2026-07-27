const { appPool } = require("../../config/db");

const ReorderLevels = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ReorderLevels" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "MinStockLevel" INT NOT NULL DEFAULT 0,
      "MaxStockLevel" INT NOT NULL DEFAULT 0,
      "ReorderPoint" INT NOT NULL DEFAULT 0,
      "ReorderQuantity" INT NOT NULL DEFAULT 0,
      "CurrentStock" INT DEFAULT 0,
      "Status" VARCHAR(50) DEFAULT 'Normal',
      "LastReorderDate" TIMESTAMP,
      "LastRestockDate" TIMESTAMP,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("ProductId", "WarehouseId")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_levels_product ON "ReorderLevels"("ProductId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_levels_warehouse ON "ReorderLevels"("WarehouseId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_levels_status ON "ReorderLevels"("Status")');
  console.log("✅ ReorderLevels table ready");
};

module.exports = { ReorderLevels };