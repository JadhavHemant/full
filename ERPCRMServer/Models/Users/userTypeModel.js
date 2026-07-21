const { appPool } = require('../../config/db');

const createUserTypesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "UserTypes" (
      "Id" SERIAL PRIMARY KEY,
      "UserType" VARCHAR(50) NOT NULL
    );
  `;
  await appPool.query(query);
  console.log("✅ UserTypes table ready");
};

module.exports = { createUserTypesTable };



