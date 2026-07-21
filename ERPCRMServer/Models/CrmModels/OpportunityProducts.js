const { appPool } = require("../../config/db");

const OpportunityProducts = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "OpportunityProducts" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "OpportunityId" INT NOT NULL REFERENCES "Opportunities"("Id") ON DELETE CASCADE,
      "ProductId" INT NOT NULL REFERENCES "Products"("Id") ON DELETE RESTRICT,
      "Quantity" NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK ("Quantity" > 0),
      "UnitPrice" NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK ("UnitPrice" >= 0),
      "DiscountPct" NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK ("DiscountPct" >= 0),
      "TaxPct" NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK ("TaxPct" >= 0),
      "LineTotal" NUMERIC(14,2) GENERATED ALWAYS AS (
        (
          ("Quantity" * "UnitPrice")
          - (("Quantity" * "UnitPrice") * ("DiscountPct" / 100.0))
        )
        * (1 + ("TaxPct" / 100.0))
      ) STORED,
      "Notes" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "Flag" BOOLEAN DEFAULT FALSE,
      UNIQUE ("OpportunityId", "ProductId")
    );

    CREATE INDEX IF NOT EXISTS idx_opp_products_company ON "OpportunityProducts"("CompanyId")
      WHERE "IsDeleted" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_opp_products_opp ON "OpportunityProducts"("OpportunityId")
      WHERE "IsDeleted" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_opp_products_product ON "OpportunityProducts"("ProductId")
      WHERE "IsDeleted" = FALSE;
    CREATE INDEX IF NOT EXISTS idx_opp_products_createdby ON "OpportunityProducts"("CreatedBy")
      WHERE "IsDeleted" = FALSE;
  `;

  await appPool.query(query);
  console.log("OpportunityProducts table ready");
};

module.exports = { OpportunityProducts };
