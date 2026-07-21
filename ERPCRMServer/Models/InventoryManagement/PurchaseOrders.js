const { appPool } = require("../../config/db");

const PurchaseOrders = async () => {
    const query = `CREATE TABLE IF NOT EXISTS "PurchaseOrders" (
        "Id" SERIAL PRIMARY KEY,
        "PONumber" VARCHAR(50) UNIQUE,
        "SupplierId" INT REFERENCES "Suppliers"("Id") ON DELETE SET NULL,
        "OrderDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "ExpectedDeliveryDate" TIMESTAMP,
        "ReceivedDate" TIMESTAMP,
        "Status" VARCHAR(50) DEFAULT 'Draft',
        "TotalAmount" DECIMAL(15, 2) DEFAULT 0,
        "Notes" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId"),
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    
    await appPool.query(query);
    console.log("✅ PurchaseOrders table ready");
};

module.exports = { PurchaseOrders };

