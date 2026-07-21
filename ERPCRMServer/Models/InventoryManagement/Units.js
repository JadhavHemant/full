const { appPool } = require('../../config/db');

const Units = async () => {
    const query = `
   CREATE TABLE IF NOT EXISTS "Units" (
            "Id" SERIAL PRIMARY KEY,
            "Name" VARCHAR(50) NOT NULL,
            "Symbol" VARCHAR(10),
            "IsDeleted" BOOLEAN DEFAULT FALSE,
            "DeletedAt" TIMESTAMP,
            "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    await appPool.query(query);
    console.log("✅ Units table ready");
}

module.exports={Units}

