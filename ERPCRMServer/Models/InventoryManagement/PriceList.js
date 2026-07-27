const { appPool } = require("../../config/db");

const PriceList = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PriceList" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(255) NOT NULL,
      "Description" TEXT,
      "Type" VARCHAR(50) DEFAULT 'Sales',
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDefault" BOOLEAN DEFAULT FALSE,
      "EffectiveFrom" DATE,
      "EffectiveTo" DATE,
      "Currency" VARCHAR(10) DEFAULT 'INR',
      "PriceType" VARCHAR(50) DEFAULT 'Fixed',
      "MarkupPercentage" NUMERIC(5,2) DEFAULT 0,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_price_list_company ON "PriceList"("CompanyId")');
  console.log("✅ PriceList table ready");
};

const PriceListItem = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PriceListItem" (
      "Id" SERIAL PRIMARY KEY,
      "PriceListId" INT REFERENCES "PriceList"("Id") ON DELETE CASCADE,
      "ProductId" INT REFERENCES "Products"("Id") ON DELETE CASCADE,
      "UnitPrice" NUMERIC(15,2) NOT NULL,
      "MinQuantity" INT DEFAULT 1,
      "MaxQuantity" INT,
      "DiscountPercentage" NUMERIC(5,2) DEFAULT 0,
      "EffectiveFrom" DATE,
      "EffectiveTo" DATE,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("PriceListId", "ProductId", "MinQuantity")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_price_list_item_product ON "PriceListItem"("ProductId")');
  console.log("✅ PriceListItem table ready");
};

const PriceListCustomer = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PriceListCustomer" (
      "Id" SERIAL PRIMARY KEY,
      "PriceListId" INT REFERENCES "PriceList"("Id") ON DELETE CASCADE,
      "CustomerId" INT REFERENCES "Customers"("Id") ON DELETE CASCADE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("PriceListId", "CustomerId")
    );
  `;

  await appPool.query(query);
  console.log("✅ PriceListCustomer table ready");
};

module.exports = { PriceList, PriceListItem, PriceListCustomer };