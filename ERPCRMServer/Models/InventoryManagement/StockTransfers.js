const { appPool } = require("../../config/db");

const StockTransfersTable = async () => {
    const query = `
    -- Stock Transfer (Warehouse to Warehouse / Branch to Branch)
    CREATE TABLE IF NOT EXISTS "StockTransfers" (
        "Id" SERIAL PRIMARY KEY,
        "TransferNo" VARCHAR(50) UNIQUE NOT NULL,
        "FromWarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "ToWarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "TransferDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "Status" VARCHAR(50) DEFAULT 'Pending' CHECK ("Status" IN ('Pending','In Transit','Received','Cancelled')),
        "TotalItems" INT DEFAULT 0,
        "Notes" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "ApprovedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsDeleted" BOOLEAN DEFAULT FALSE,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Transfer Items
    CREATE TABLE IF NOT EXISTS "StockTransferItems" (
        "Id" SERIAL PRIMARY KEY,
        "StockTransferId" INT REFERENCES "StockTransfers"("Id") ON DELETE CASCADE,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE RESTRICT,
        "Quantity" INT NOT NULL CHECK ("Quantity" > 0),
        "UnitCost" NUMERIC(10,2) DEFAULT 0,
        "Notes" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Adjustment (Damage, Lost, Manual Correction)
    CREATE TABLE IF NOT EXISTS "StockAdjustments" (
        "Id" SERIAL PRIMARY KEY,
        "AdjustmentNo" VARCHAR(50) UNIQUE NOT NULL,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "AdjustmentType" VARCHAR(50) NOT NULL CHECK ("AdjustmentType" IN ('Damage','Lost','Manual Correction','Write Off','Found')),
        "AdjustmentDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "Reason" TEXT,
        "Status" VARCHAR(50) DEFAULT 'Pending' CHECK ("Status" IN ('Pending','Approved','Rejected')),
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "ApprovedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsDeleted" BOOLEAN DEFAULT FALSE,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Adjustment Items
    CREATE TABLE IF NOT EXISTS "StockAdjustmentItems" (
        "Id" SERIAL PRIMARY KEY,
        "AdjustmentId" INT REFERENCES "StockAdjustments"("Id") ON DELETE CASCADE,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE RESTRICT,
        "Quantity" INT NOT NULL,
        "CurrentStock" INT DEFAULT 0,
        "NewStock" INT DEFAULT 0,
        "UnitCost" NUMERIC(10,2) DEFAULT 0,
        "Reason" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_stock_transfer_from ON "StockTransfers"("FromWarehouseId");
    CREATE INDEX IF NOT EXISTS idx_stock_transfer_to ON "StockTransfers"("ToWarehouseId");
    CREATE INDEX IF NOT EXISTS idx_stock_adjustment_warehouse ON "StockAdjustments"("WarehouseId");
    CREATE INDEX IF NOT EXISTS idx_stock_adjustment_type ON "StockAdjustments"("AdjustmentType");
    `;
    await appPool.query(query);
    console.log("✅ Stock Transfer & Adjustment tables ready");
};

module.exports = { StockTransfersTable };