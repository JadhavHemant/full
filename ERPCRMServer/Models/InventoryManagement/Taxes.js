const { appPool } = require("../../config/db")

const Taxes = async () => {
    const query = `CREATE TABLE IF NOT EXISTS "Taxes" (
  "Id" SERIAL PRIMARY KEY,
  "Name" VARCHAR(100),
  "Rate" NUMERIC(5, 2),
  "Description" TEXT
);`
    await appPool.query(query);
    console.log("✅ Taxes table ready")
}

module.exports = { Taxes };