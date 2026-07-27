const { appPool } = require("../../config/db");

const StockValuation = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "StockValuation" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
      "CostingMethod" VARCHAR(50) DEFAULT 'WeightedAverage',
      "CurrentCost" NUMERIC(15,2) DEFAULT 0,
      "AverageCost" NUMERIC(15,2) DEFAULT 0,
      "FIFOCost" NUMERIC(15,2) DEFAULT 0,
      "LIFOCost" NUMERIC(15,2) DEFAULT 0,
      "StandardCost" NUMERIC(15,2) DEFAULT 0,
      "LandedCost" NUMERIC(15,2) DEFAULT 0,
      "TotalStock" INT DEFAULT 0,
      "TotalValue" NUMERIC(15,2) DEFAULT 0,
      "LastCalculatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("ProductId", "WarehouseId")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_stock_valuation_product ON "StockValuation"("ProductId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_stock_valuation_warehouse ON "StockValuation"("WarehouseId")');
  console.log("✅ StockValuation table ready");
};

module.exports = { StockValuation };