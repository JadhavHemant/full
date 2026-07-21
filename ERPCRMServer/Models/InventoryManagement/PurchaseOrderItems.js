// // db/migrations/purchaseOrderItems.js
// const { appPool } = require("../../config/db");

// const PurchaseOrderItems = async () => {
//     const query = `
// CREATE TABLE IF NOT EXISTS "PurchaseOrderItems" (
//   "Id" SERIAL PRIMARY KEY,
//   "PurchaseOrderId" INT NOT NULL REFERENCES "PurchaseOrders"("Id") ON DELETE CASCADE,
//   "ProductId" INT NOT NULL REFERENCES "Products"("Id") ON DELETE RESTRICT,
//   "Quantity" INT NOT NULL CHECK ("Quantity" > 0),
//   "UnitCost" NUMERIC(10, 2) NOT NULL CHECK ("UnitCost" >= 0),
//   "TotalCost" NUMERIC(12, 2) GENERATED ALWAYS AS ("Quantity" * "UnitCost") STORED,
//   "ReceivedQuantity" INT DEFAULT 0 CHECK ("ReceivedQuantity" >= 0),
//   "Notes" TEXT,
//   "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// -- Create index for faster queries
// CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON "PurchaseOrderItems"("PurchaseOrderId");
// CREATE INDEX IF NOT EXISTS idx_po_items_product_id ON "PurchaseOrderItems"("ProductId");

// -- Trigger to update UpdatedAt
// CREATE OR REPLACE FUNCTION update_po_items_updated_at()
// RETURNS TRIGGER AS $$
// BEGIN
//     NEW."UpdatedAt" = CURRENT_TIMESTAMP;
//     RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;

// DROP TRIGGER IF EXISTS trigger_update_po_items_updated_at ON "PurchaseOrderItems";
// CREATE TRIGGER trigger_update_po_items_updated_at
//     BEFORE UPDATE ON "PurchaseOrderItems"
//     FOR EACH ROW
//     EXECUTE FUNCTION update_po_items_updated_at();
// `;
//     await appPool.query(query);
//     console.log("✅ PurchaseOrderItems table ready with indexes and triggers");
// };

// module.exports = { PurchaseOrderItems };



// db/migrations/purchaseOrderItems.js
const { appPool } = require("../../config/db");

const PurchaseOrderItems = async () => {
    const query = `
CREATE TABLE IF NOT EXISTS "PurchaseOrderItems" (
  "Id" SERIAL PRIMARY KEY,
  "PurchaseOrderId" INT NOT NULL REFERENCES "PurchaseOrders"("Id") ON DELETE CASCADE,
  "ProductId" INT NOT NULL REFERENCES "Products"("Id") ON DELETE RESTRICT,
  "Quantity" INT NOT NULL CHECK ("Quantity" > 0),
  "UnitCost" NUMERIC(10, 2) NOT NULL CHECK ("UnitCost" >= 0),
  "TotalCost" NUMERIC(12, 2) GENERATED ALWAYS AS ("Quantity" * "UnitCost") STORED,
  "ReceivedQuantity" INT DEFAULT 0 CHECK ("ReceivedQuantity" >= 0),
  "Notes" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON "PurchaseOrderItems"("PurchaseOrderId");
CREATE INDEX IF NOT EXISTS idx_po_items_product_id ON "PurchaseOrderItems"("ProductId");

CREATE OR REPLACE FUNCTION update_po_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_items_updated_at ON "PurchaseOrderItems";
CREATE TRIGGER trigger_update_po_items_updated_at
    BEFORE UPDATE ON "PurchaseOrderItems"
    FOR EACH ROW
    EXECUTE FUNCTION update_po_items_updated_at();
`;
    await appPool.query(query);
    console.log("✅ PurchaseOrderItems table ready with indexes and triggers");
};

module.exports = { PurchaseOrderItems };
