const { appPool } = require("../../config/db")

const ProductCategoriesTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "ProductCategories" (
  "Id" SERIAL PRIMARY KEY,
  "CategoryName" VARCHAR(100) NOT NULL,
  "Description" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    await appPool.query(query);
    console.log("✅ ProductCategories table ready")
}

module.exports = { ProductCategoriesTable };