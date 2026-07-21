// db/migrations/customers.js

const { appPool } = require("../../config/db");

const Customers = async () => {
    const query = `
        -- Create Customers Table
        CREATE TABLE IF NOT EXISTS "Customers" (
            "Id" SERIAL PRIMARY KEY,
            "CustomerCode" VARCHAR(50) UNIQUE,
            "Name" VARCHAR(255) NOT NULL,
            "Email" VARCHAR(255) UNIQUE,
            "Phone" VARCHAR(20),
            "AlternatePhone" VARCHAR(20),
            "Address" TEXT,
            "City" VARCHAR(100),
            "State" VARCHAR(100),
            "Country" VARCHAR(100) DEFAULT 'India',
            "PostalCode" VARCHAR(20),
            "GSTNumber" VARCHAR(20),
            "PANNumber" VARCHAR(20),
            "CustomerType" VARCHAR(50) DEFAULT 'Retail' CHECK ("CustomerType" IN ('Retail', 'Wholesale', 'Corporate', 'Distributor')),
            "CreditLimit" DECIMAL(12, 2) DEFAULT 0,
            "OutstandingBalance" DECIMAL(12, 2) DEFAULT 0,
            "IsActive" BOOLEAN DEFAULT true,
            "Notes" TEXT,
            "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "DeletedAt" TIMESTAMP,
            "IsDeleted" BOOLEAN DEFAULT false
        );

        -- Create Indexes
        CREATE INDEX IF NOT EXISTS idx_customers_email ON "Customers"("Email");
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON "Customers"("Phone");
        CREATE INDEX IF NOT EXISTS idx_customers_code ON "Customers"("CustomerCode");
        CREATE INDEX IF NOT EXISTS idx_customers_active ON "Customers"("IsActive");
        CREATE INDEX IF NOT EXISTS idx_customers_deleted ON "Customers"("IsDeleted");

        -- Create Auto-Update Trigger for UpdatedAt
        CREATE OR REPLACE FUNCTION update_customers_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW."UpdatedAt" = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON "Customers";
        CREATE TRIGGER trigger_update_customers_updated_at
            BEFORE UPDATE ON "Customers"
            FOR EACH ROW
            EXECUTE FUNCTION update_customers_updated_at();

        -- Function to generate CustomerCode
        CREATE OR REPLACE FUNCTION generate_customer_code()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW."CustomerCode" IS NULL THEN
                NEW."CustomerCode" := 'CUST-' || LPAD(NEW."Id"::TEXT, 6, '0');
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_generate_customer_code ON "Customers";
        CREATE TRIGGER trigger_generate_customer_code
            BEFORE INSERT ON "Customers"
            FOR EACH ROW
            EXECUTE FUNCTION generate_customer_code();
    `;

    await appPool.query(query);
    console.log("✅ Customers table ready with indexes and triggers");
};

module.exports = { Customers };
