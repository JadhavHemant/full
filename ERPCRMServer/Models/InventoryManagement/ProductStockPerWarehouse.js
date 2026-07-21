// models/tables/ProductStockPerWarehouse.js
const { appPool } = require("../../config/db");

const ProductStockPerWarehouse = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS "ProductStockPerWarehouse" (
            "Id" SERIAL PRIMARY KEY,
            "ProductId" INT NOT NULL REFERENCES "Products"("Id") ON DELETE CASCADE,
            "WarehouseId" INT NOT NULL REFERENCES "Warehouses"("Id") ON DELETE CASCADE,
            "Quantity" INT DEFAULT 0 CHECK ("Quantity" >= 0),
            "ReservedQuantity" INT DEFAULT 0 CHECK ("ReservedQuantity" >= 0),
            "AvailableQuantity" INT GENERATED ALWAYS AS ("Quantity" - "ReservedQuantity") STORED,
            "MinimumStock" INT DEFAULT 0,
            "MaximumStock" INT,
            "ReorderLevel" INT DEFAULT 0,
            "LastRestocked" TIMESTAMP,
            "IsActive" BOOLEAN DEFAULT TRUE,
            "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
            "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
            UNIQUE ("ProductId", "WarehouseId")
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_product_stock_product ON "ProductStockPerWarehouse"("ProductId");
        CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse ON "ProductStockPerWarehouse"("WarehouseId");
        CREATE INDEX IF NOT EXISTS idx_product_stock_active ON "ProductStockPerWarehouse"("IsActive");
        CREATE INDEX IF NOT EXISTS idx_product_stock_quantity ON "ProductStockPerWarehouse"("Quantity");

        -- Create trigger for UpdatedAt
        CREATE OR REPLACE FUNCTION update_product_stock_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW."UpdatedAt" = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_product_stock_timestamp ON "ProductStockPerWarehouse";
        CREATE TRIGGER trigger_update_product_stock_timestamp
        BEFORE UPDATE ON "ProductStockPerWarehouse"
        FOR EACH ROW
        EXECUTE FUNCTION update_product_stock_timestamp();
    `;
    
    await appPool.query(query);
    console.log("✅ ProductStockPerWarehouse table ready with indexes and triggers");
};

module.exports = { ProductStockPerWarehouse };
