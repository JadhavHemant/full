// db/migrations/salesOrders.js

const { appPool } = require("../../config/db");

const SalesOrders = async () => {
    try {
        const query = `
            -- Create SalesOrders Table
            CREATE TABLE IF NOT EXISTS "SalesOrders" (
                "Id" SERIAL PRIMARY KEY,
                "SONumber" VARCHAR(50) UNIQUE,
                "CustomerId" INT NOT NULL REFERENCES "Customers"("Id") ON DELETE RESTRICT,
                "CustomerName" VARCHAR(255),
                "OrderDate" DATE NOT NULL DEFAULT CURRENT_DATE,
                "ExpectedDeliveryDate" DATE,
                "Status" VARCHAR(50) DEFAULT 'Draft' CHECK ("Status" IN ('Draft', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
                "Priority" VARCHAR(20) DEFAULT 'Normal' CHECK ("Priority" IN ('Low', 'Normal', 'High', 'Urgent')),
                "TotalAmount" DECIMAL(12, 2) DEFAULT 0,
                "TaxAmount" DECIMAL(12, 2) DEFAULT 0,
                "DiscountAmount" DECIMAL(12, 2) DEFAULT 0,
                "NetAmount" DECIMAL(12, 2) DEFAULT 0,
                "PaidAmount" DECIMAL(12, 2) DEFAULT 0,
                "BalanceAmount" DECIMAL(12, 2) DEFAULT 0,
                "PaymentStatus" VARCHAR(50) DEFAULT 'Pending' CHECK ("PaymentStatus" IN ('Pending', 'Partial', 'Paid', 'Overdue')),
                "PaymentMethod" VARCHAR(50),
                "ShippingAddress" TEXT,
                "BillingAddress" TEXT,
                "Notes" TEXT,
                "InternalNotes" TEXT,
                "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
                "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
                "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
                "IsDeleted" BOOLEAN DEFAULT false,
                "DeletedAt" TIMESTAMP,
                "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await appPool.query(query);
        console.log("✅ SalesOrders table created");

        // Create Indexes (separate query to avoid conflicts)
        const indexQuery = `
            CREATE INDEX IF NOT EXISTS idx_salesorders_customer ON "SalesOrders"("CustomerId");
            CREATE INDEX IF NOT EXISTS idx_salesorders_status ON "SalesOrders"("Status");
            CREATE INDEX IF NOT EXISTS idx_salesorders_orderdate ON "SalesOrders"("OrderDate");
            CREATE INDEX IF NOT EXISTS idx_salesorders_company ON "SalesOrders"("CompanyId");
            CREATE INDEX IF NOT EXISTS idx_salesorders_sonumber ON "SalesOrders"("SONumber");
            CREATE INDEX IF NOT EXISTS idx_salesorders_deleted ON "SalesOrders"("IsDeleted");
            CREATE INDEX IF NOT EXISTS idx_salesorders_payment_status ON "SalesOrders"("PaymentStatus");
        `;

        await appPool.query(indexQuery);
        console.log("✅ Indexes created");

        // Create Functions and Triggers
        const triggerQuery = `
            -- Function to calculate NetAmount (BEFORE INSERT/UPDATE)
            CREATE OR REPLACE FUNCTION calculate_so_net_amount()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."NetAmount" := (COALESCE(NEW."TotalAmount", 0) + COALESCE(NEW."TaxAmount", 0)) - COALESCE(NEW."DiscountAmount", 0);
                NEW."BalanceAmount" := NEW."NetAmount" - COALESCE(NEW."PaidAmount", 0);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_calculate_so_net_amount ON "SalesOrders";
            CREATE TRIGGER trigger_calculate_so_net_amount
                BEFORE INSERT OR UPDATE ON "SalesOrders"
                FOR EACH ROW
                EXECUTE FUNCTION calculate_so_net_amount();

            -- Function to auto-update UpdatedAt (BEFORE UPDATE)
            CREATE OR REPLACE FUNCTION update_salesorders_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."UpdatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_salesorders_updated_at ON "SalesOrders";
            CREATE TRIGGER trigger_update_salesorders_updated_at
                BEFORE UPDATE ON "SalesOrders"
                FOR EACH ROW
                EXECUTE FUNCTION update_salesorders_updated_at();

            -- Function to generate SONumber (AFTER INSERT - separate update)
            CREATE OR REPLACE FUNCTION generate_so_number()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW."SONumber" IS NULL THEN
                    UPDATE "SalesOrders"
                    SET "SONumber" = 'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(NEW."Id"::TEXT, 5, '0')
                    WHERE "Id" = NEW."Id";
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_generate_so_number ON "SalesOrders";
            CREATE TRIGGER trigger_generate_so_number
                AFTER INSERT ON "SalesOrders"
                FOR EACH ROW
                EXECUTE FUNCTION generate_so_number();

            -- Function to auto-populate CustomerName from Customers table
            CREATE OR REPLACE FUNCTION update_so_customer_name()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW."CustomerId" IS NOT NULL THEN
                    SELECT "Name" INTO NEW."CustomerName" 
                    FROM "Customers" 
                    WHERE "Id" = NEW."CustomerId";
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_so_customer_name ON "SalesOrders";
            CREATE TRIGGER trigger_update_so_customer_name
                BEFORE INSERT OR UPDATE OF "CustomerId" ON "SalesOrders"
                FOR EACH ROW
                EXECUTE FUNCTION update_so_customer_name();
        `;

        await appPool.query(triggerQuery);
        console.log("✅ Triggers and functions created");

        console.log("✅ SalesOrders table ready with all features");

    } catch (error) {
        console.error("❌ Error creating SalesOrders table:", error);
        throw error;
    }
};

module.exports = { SalesOrders };
