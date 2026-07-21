// models/Inventory/stockMovements.js
const { appPool } = require("../../config/db");

const StockMovements = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "StockMovements" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT NOT NULL REFERENCES "Products"("Id"),
      "WarehouseId" INT NOT NULL REFERENCES "Warehouses"("Id"),
      "ChangeType" VARCHAR(50) NOT NULL, -- IN, OUT, ADJUSTMENT, TRANSFER
      "Quantity" INT NOT NULL,
      "Reason" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId"),
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await appPool.query(query);
  console.log("✅ StockMovements table ready");
};

module.exports = { StockMovements };
