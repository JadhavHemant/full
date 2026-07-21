const { appPool } = require("../../config/db");

const BatchSerialTable = async () => {
    const query = `
    -- Batch Tracking
    CREATE TABLE IF NOT EXISTS "Batches" (
        "Id" SERIAL PRIMARY KEY,
        "BatchNo" VARCHAR(100) NOT NULL,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
        "Quantity" INT DEFAULT 0,
        "ManufacturingDate" DATE,
        "ExpiryDate" DATE,
        "SupplierId" INT REFERENCES "Suppliers"("Id") ON DELETE SET NULL,
        "PurchaseOrderId" INT REFERENCES "PurchaseOrders"("Id") ON DELETE SET NULL,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("BatchNo", "ProductId", "WarehouseId")
    );

    -- Serial Number Tracking
    CREATE TABLE IF NOT EXISTS "SerialNumbers" (
        "Id" SERIAL PRIMARY KEY,
        "SerialNo" VARCHAR(200) UNIQUE NOT NULL,
        "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
        "BatchId" INT REFERENCES "Batches"("Id") ON DELETE SET NULL,
        "WarehouseId" INT REFERENCES "Warehouses"("Id") ON DELETE SET NULL,
        "Status" VARCHAR(50) DEFAULT 'Available' CHECK ("Status" IN ('Available','Sold','Returned','Damaged','Transferred')),
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_batches_product ON "Batches"("ProductId");
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON "Batches"("ExpiryDate");
    CREATE INDEX IF NOT EXISTS idx_serial_product ON "SerialNumbers"("ProductId");
    CREATE INDEX IF NOT EXISTS idx_serial_status ON "SerialNumbers"("Status");
    `;
    await appPool.query(query);
    console.log("✅ Batch & Serial Number tables ready");
};

module.exports = { BatchSerialTable };