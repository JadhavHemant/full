const { appPool } = require("../../config/db");

const GRNTable = async () => {
    const query = `
    -- Goods Receipt Note (GRN)
    CREATE TABLE IF NOT EXISTS "GRN" (
        "Id" SERIAL PRIMARY KEY,
        "GRNNumber" VARCHAR(50) UNIQUE NOT NULL,
        "PONumber" VARCHAR(50),
        "PurchaseOrderId" INT REFERENCES "PurchaseOrders"("Id") ON DELETE SET NULL,
        "SupplierId" INT REFERENCES "Suppliers"("Id") ON DELETE SET NULL,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "ReceivedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "TotalQuantity" INT DEFAULT 0,
        "TotalAmount" DECIMAL(15,2) DEFAULT 0,
        "Status" VARCHAR(50) DEFAULT 'Received' CHECK ("Status" IN ('Received','Partially Received','Cancelled')),
        "Notes" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsDeleted" BOOLEAN DEFAULT FALSE,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GRN Items
    CREATE TABLE IF NOT EXISTS "GRNItems" (
        "Id" SERIAL PRIMARY KEY,
        "GRNId" INT REFERENCES "GRN"("Id") ON DELETE CASCADE,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE RESTRICT,
        "QuantityReceived" INT NOT NULL CHECK ("QuantityReceived" > 0),
        "QuantityAccepted" INT DEFAULT 0,
        "QuantityRejected" INT DEFAULT 0,
        "UnitCost" NUMERIC(10,2) NOT NULL CHECK ("UnitCost" >= 0),
        "TotalCost" NUMERIC(12,2) GENERATED ALWAYS AS ("QuantityAccepted" * "UnitCost") STORED,
        "BatchNo" VARCHAR(100),
        "ManufacturingDate" DATE,
        "ExpiryDate" DATE,
        "Notes" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_grn_po ON "GRN"("PurchaseOrderId");
    CREATE INDEX IF NOT EXISTS idx_grn_company ON "GRN"("CompanyId");
    CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON "GRNItems"("GRNId");
    `;
    await appPool.query(query);
    console.log("✅ GRN tables ready");
};

module.exports = { GRNTable };