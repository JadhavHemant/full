// models/tables/ProductTable.js

const { appPool } = require("../../config/db");

const ProductTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Products" (
        "Id" SERIAL PRIMARY KEY,
        "ProductName" VARCHAR(255) NOT NULL,
        "ProductCode" VARCHAR(100) UNIQUE NOT NULL,
        "Description" TEXT,
        "CategoryId" INT REFERENCES "ProductCategories"("Id") ON DELETE SET NULL,
        "UnitId" INT REFERENCES "Units"("Id") ON DELETE SET NULL,
        "Price" NUMERIC(10,2) DEFAULT 0,
        "Cost" NUMERIC(10,2) DEFAULT 0,
        "StockQuantity" INT DEFAULT 0,
        "MinimumStock" INT DEFAULT 0,
        "MaximumStock" INT DEFAULT 0,
        "ReorderLevel" INT DEFAULT 0,
        "NotifyStockOut" BOOLEAN DEFAULT TRUE,
        "NotifyStockReload" BOOLEAN DEFAULT TRUE,
        "Barcode" VARCHAR(100),
        "SKU" VARCHAR(100),
        "HSNCode" VARCHAR(50),
        "TaxRate" NUMERIC(5,2) DEFAULT 0,
        "Discount" NUMERIC(5,2) DEFAULT 0,
        "ProductImage" VARCHAR(500),
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "Flag" BOOLEAN DEFAULT FALSE,
        "IsDelete" BOOLEAN DEFAULT FALSE,
        "DeletedAt" TIMESTAMP,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_company ON "Products"("CompanyId") WHERE "IsDelete" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_products_category ON "Products"("CategoryId") WHERE "IsDelete" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_products_active ON "Products"("IsActive") WHERE "IsDelete" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_products_code ON "Products"("ProductCode") WHERE "IsDelete" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_products_search ON "Products" USING gin(to_tsvector('english', "ProductName"));
    `;

    await appPool.query(query);
    console.log("✅ Products table ready with indexes");
};

module.exports = { ProductTable };
