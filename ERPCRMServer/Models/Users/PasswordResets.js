const { appPool } = require('../../config/db');

const PasswordResets = async () => {
  const query = `
CREATE TABLE IF NOT EXISTS "PasswordResets" (
  "Id" SERIAL PRIMARY KEY,
  "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
  "Token" TEXT NOT NULL,
  "ExpiresAt" TIMESTAMP NOT NULL,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  await appPool.query(query);
  console.log("✅ Users table ready");
};

module.exports = { PasswordResets };
