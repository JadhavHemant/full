const { appPool } = require("../../config/db");

const Payments = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Payments" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "InvoiceId" INT REFERENCES "Invoices"("Id") ON DELETE SET NULL,
      "Amount" NUMERIC(15,2) NOT NULL,
      "PaymentDate" DATE,
      "PaymentMethod" VARCHAR(100),
      "ReferenceNumber" VARCHAR(150),
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Notes" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Flag" BOOLEAN DEFAULT FALSE
    );
  `;

  await appPool.query(query);
  await appPool.query('ALTER TABLE "Payments" ALTER COLUMN "Flag" SET DEFAULT FALSE;');
  console.log("Payments table ready");
};

module.exports = { Payments };
