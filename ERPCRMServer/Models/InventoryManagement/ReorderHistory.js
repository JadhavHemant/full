const { appPool } = require("../../config/db");

const ReorderHistory = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ReorderHistory" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "ReorderLevelId" INT REFERENCES "ReorderLevels"("Id") ON DELETE CASCADE,
      "ActionType" VARCHAR(50) NOT NULL,
      "Quantity" INT NOT NULL,
      "StockBefore" INT NOT NULL,
      "StockAfter" INT NOT NULL,
      "TriggeredBy" VARCHAR(50) DEFAULT 'System',
      "PurchaseOrderId" INT REFERENCES "PurchaseOrders"("Id") ON DELETE SET NULL,
      "Notes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_history_product ON "ReorderHistory"("ProductId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_history_warehouse ON "ReorderHistory"("WarehouseId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_reorder_history_date ON "ReorderHistory"("CreatedAt")');
  console.log("✅ ReorderHistory table ready");
};

module.exports = { ReorderHistory };