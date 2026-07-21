const { appPool } = require("../../config/db")

const ProductTaxMap = async () => {
    const query = `CREATE TABLE IF NOT EXISTS "ProductTaxMap" (
  "Id" SERIAL PRIMARY KEY,
  "ProductId" INT REFERENCES "Products"("Id"),
  "TaxId" INT REFERENCES "Taxes"("Id")
);`
    await appPool.query(query);
    console.log("✅ ProductTaxMap table ready")
}

module.exports = { ProductTaxMap };