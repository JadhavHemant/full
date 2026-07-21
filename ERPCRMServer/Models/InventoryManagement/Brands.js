const { appPool } = require("../../config/db");

const BrandsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Brands" (
        "Id" SERIAL PRIMARY KEY,
        "BrandName" VARCHAR(255) NOT NULL,
        "Description" TEXT,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "IsDeleted" BOOLEAN DEFAULT FALSE,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_brands_company ON "Brands"("CompanyId") WHERE "IsDeleted" = FALSE;
    `;
    await appPool.query(query);
    console.log("✅ Brands table ready");
};

module.exports = { BrandsTable };