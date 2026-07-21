const { appPool } = require('../../config/db');

const createCompaniesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS "Companies" (
            "Id" SERIAL PRIMARY KEY,
            "CompanyName" VARCHAR(255) NOT NULL,
            "BusinessType" VARCHAR(100),
            "GstNumber" VARCHAR(15),
            "Address" TEXT,
            "City" VARCHAR(100),
            "State" VARCHAR(100),
            "Country" VARCHAR(100) DEFAULT 'India',
            "PostalCode" VARCHAR(6),
            "Website" VARCHAR(255),
            "OwnerName" VARCHAR(255),
            "Email" VARCHAR(255) UNIQUE NOT NULL,
            "Phone" VARCHAR(10),
            "LogoUrl" VARCHAR(255),
            "IsActive" BOOLEAN DEFAULT TRUE,
            "Flag" BOOLEAN DEFAULT TRUE,
            "IsDelete" BOOLEAN DEFAULT FALSE,
            "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_companies_email ON "Companies"("Email") WHERE "IsDelete" = FALSE;
        CREATE INDEX IF NOT EXISTS idx_companies_gst ON "Companies"("GstNumber") WHERE "IsDelete" = FALSE;
        CREATE INDEX IF NOT EXISTS idx_companies_city ON "Companies"("City") WHERE "IsDelete" = FALSE;
        CREATE INDEX IF NOT EXISTS idx_companies_state ON "Companies"("State") WHERE "IsDelete" = FALSE;
        CREATE INDEX IF NOT EXISTS idx_companies_active ON "Companies"("IsActive") WHERE "IsDelete" = FALSE;
        CREATE INDEX IF NOT EXISTS idx_companies_deleted ON "Companies"("IsDelete");
    `;
    
    await appPool.query(query);
    console.log("✅ Companies table ready with all features");
};

module.exports = { createCompaniesTable };
