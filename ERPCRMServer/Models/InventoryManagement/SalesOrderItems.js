const { appPool } = require("../../config/db")

const SalesOrderItems = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "SalesOrderItems" (
  "Id" SERIAL PRIMARY KEY,
  "SalesOrderId" INT REFERENCES "SalesOrders"("Id") ON DELETE CASCADE,
  "ProductId" INT REFERENCES "Products"("Id"),
  "Quantity" INT NOT NULL,
  "UnitPrice" NUMERIC(10, 2)
);`
    await appPool.query(query);
    console.log("✅ SalesOrderItems table ready")
}

module.exports = { SalesOrderItems };