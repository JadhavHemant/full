const { appPool } = require("../../config/db");

const LandedCost = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "LandedCost" (
      "Id" SERIAL PRIMARY KEY,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "PurchaseOrderId" INT REFERENCES "PurchaseOrders"("Id") ON DELETE SET NULL,
      "GRNId" INT REFERENCES "GRN"("Id") ON DELETE SET NULL,
      "CostType" VARCHAR(50) NOT NULL,
      "Amount" NUMERIC(15,2) NOT NULL,
      "Currency" VARCHAR(10) DEFAULT 'INR',
      "ExchangeRate" NUMERIC(10,4) DEFAULT 1,
      "AmountInBaseCurrency" NUMERIC(15,2) NOT NULL,
      "Description" TEXT,
      "AllocationMethod" VARCHAR(50) DEFAULT 'ByQuantity',
      "IsAllocated" BOOLEAN DEFAULT FALSE,
      "AllocatedAt" TIMESTAMP,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_landed_cost_product ON "LandedCost"("ProductId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_landed_cost_po ON "LandedCost"("PurchaseOrderId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_landed_cost_grn ON "LandedCost"("GRNId")');
  console.log("✅ LandedCost table ready");
};

module.exports = { LandedCost };