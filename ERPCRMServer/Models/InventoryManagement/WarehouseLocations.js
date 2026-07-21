const { appPool } = require("../../config/db");

const WarehouseLocationsTable = async () => {
    const query = `
    -- Rack Management
    CREATE TABLE IF NOT EXISTS "Racks" (
        "Id" SERIAL PRIMARY KEY,
        "RackName" VARCHAR(100) NOT NULL,
        "RackCode" VARCHAR(50),
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
        "Description" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("RackCode", "WarehouseId")
    );

    -- Shelf Management
    CREATE TABLE IF NOT EXISTS "Shelves" (
        "Id" SERIAL PRIMARY KEY,
        "ShelfName" VARCHAR(100) NOT NULL,
        "ShelfCode" VARCHAR(50),
        "RackId" INT REFERENCES "Racks"("Id") ON DELETE CASCADE,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
        "Description" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("ShelfCode", "RackId")
    );

    -- Bin Management
    CREATE TABLE IF NOT EXISTS "Bins" (
        "Id" SERIAL PRIMARY KEY,
        "BinName" VARCHAR(100) NOT NULL,
        "BinCode" VARCHAR(50),
        "ShelfId" INT REFERENCES "Shelves"("Id") ON DELETE CASCADE,
        "RackId" INT REFERENCES "Racks"("Id") ON DELETE CASCADE,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE SET NULL,
        "MaxCapacity" INT DEFAULT 0,
        "CurrentOccupancy" INT DEFAULT 0,
        "Description" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("BinCode", "WarehouseId")
    );

    CREATE INDEX IF NOT EXISTS idx_racks_warehouse ON "Racks"("WarehouseId");
    CREATE INDEX IF NOT EXISTS idx_shelves_rack ON "Shelves"("RackId");
    CREATE INDEX IF NOT EXISTS idx_bins_shelf ON "Bins"("ShelfId");
    CREATE INDEX IF NOT EXISTS idx_bins_product ON "Bins"("ProductId");
    `;
    await appPool.query(query);
    console.log("✅ Warehouse Location tables (Racks, Shelves, Bins) ready");
};

module.exports = { WarehouseLocationsTable };