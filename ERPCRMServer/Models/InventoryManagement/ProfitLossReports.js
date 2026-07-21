const { appPool } = require("../../config/db")

const ProfitLossReports = async () => {
    const query = `CREATE TABLE IF NOT EXISTS "ProfitLossReports" (
  "Id" SERIAL PRIMARY KEY,
  "CompanyId" INT REFERENCES "Companies"("Id"),
  "ReportDate" DATE NOT NULL,       
  "TotalSales" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "TotalCost" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "GrossProfit" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`
    await appPool.query(query);
    console.log("✅ ProfitLossReports table ready")
}

module.exports = { ProfitLossReports };