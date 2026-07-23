const { appPool } = require("../../config/db");

const User2FA = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "User2FA" (
      "Id" SERIAL PRIMARY KEY,
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "SecretKey" VARCHAR(255) NOT NULL,
      "IsEnabled" BOOLEAN DEFAULT FALSE,
      "BackupCodes" TEXT,
      "LastUsedAt" TIMESTAMP,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("UserId")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_user2fa_user ON "User2FA"("UserId")');
  console.log("✅ User2FA table ready");
};

module.exports = { User2FA };