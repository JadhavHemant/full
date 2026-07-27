const { appPool } = require("../../config/db");

const Currencies = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Currencies" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Code" VARCHAR(10) NOT NULL,
      "Name" VARCHAR(100) NOT NULL,
      "Symbol" VARCHAR(10),
      "IsBaseCurrency" BOOLEAN DEFAULT FALSE,
      "IsActive" BOOLEAN DEFAULT TRUE,
      "DecimalPlaces" INT DEFAULT 2,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("CompanyId", "Code")
    );
  `;
  await appPool.query(query);
  console.log("✅ Currencies table ready");
};

const ExchangeRates = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ExchangeRates" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "FromCurrencyId" INT REFERENCES "Currencies"("Id") ON DELETE CASCADE,
      "ToCurrencyId" INT REFERENCES "Currencies"("Id") ON DELETE CASCADE,
      "Rate" NUMERIC(15,6) NOT NULL,
      "Date" DATE NOT NULL DEFAULT CURRENT_DATE,
      "Source" VARCHAR(50) DEFAULT 'Manual',
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("FromCurrencyId", "ToCurrencyId", "Date")
    );
  `;
  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON "ExchangeRates"("Date")');
  console.log("✅ ExchangeRates table ready");
};

module.exports = { Currencies, ExchangeRates };