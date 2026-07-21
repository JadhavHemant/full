const { appPool } = require("../../config/db");

const ProductCategories = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ProductCategories" (
      "Id" SERIAL PRIMARY KEY,
      "CategoryName" VARCHAR(100) NOT NULL,
      "Description" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await appPool.query(query);
  await appPool.query(
    'ALTER TABLE "ProductCategories" ADD COLUMN IF NOT EXISTS "CategoryName" VARCHAR(100);'
  );
  await appPool.query(
    'ALTER TABLE "ProductCategories" ADD COLUMN IF NOT EXISTS "Description" TEXT;'
  );
  await appPool.query(
    'ALTER TABLE "ProductCategories" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;'
  );

  // Older CRM-only setups created a "Name" column on this shared table.
  // Preserve those records by copying into the schema-backed CategoryName field.
  await appPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProductCategories'
          AND column_name = 'Name'
      ) THEN
        UPDATE "ProductCategories"
        SET "CategoryName" = COALESCE("CategoryName", "Name")
        WHERE "CategoryName" IS NULL;
      END IF;
    END $$;
  `);

  console.log("ProductCategories table ready");
};

module.exports = { ProductCategories };
