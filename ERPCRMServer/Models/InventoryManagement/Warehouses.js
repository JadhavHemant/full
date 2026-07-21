// models/tables/Warehouses.js
const { appPool } = require("../../config/db");

const Warehouses = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS "Warehouses" (
            "Id" SERIAL PRIMARY KEY,
            "WarehouseCode" VARCHAR(50) UNIQUE NOT NULL,
            "Name" VARCHAR(255) NOT NULL,
            "Location" TEXT,
            "Address" TEXT,
            "City" VARCHAR(100),
            "State" VARCHAR(100),
            "Country" VARCHAR(100) DEFAULT 'India',
            "PinCode" VARCHAR(20),
            "ContactPerson" VARCHAR(255),
            "ContactPhone" VARCHAR(20),
            "ContactEmail" VARCHAR(255),
            "ManagerId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
            "CompanyId" INT NOT NULL REFERENCES "Companies"("Id") ON DELETE CASCADE,
            "Capacity" DECIMAL(10, 2),
            "CapacityUnit" VARCHAR(50) DEFAULT 'sqft',
            "IsActive" BOOLEAN DEFAULT TRUE,
            "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
            "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_warehouses_company ON "Warehouses"("CompanyId");
        CREATE INDEX IF NOT EXISTS idx_warehouses_active ON "Warehouses"("IsActive");
        CREATE INDEX IF NOT EXISTS idx_warehouses_code ON "Warehouses"("WarehouseCode");
        CREATE INDEX IF NOT EXISTS idx_warehouses_manager ON "Warehouses"("ManagerId");
    `;
    
    await appPool.query(query);
    console.log("✅ Warehouses table ready with indexes");
};

module.exports = { Warehouses };
