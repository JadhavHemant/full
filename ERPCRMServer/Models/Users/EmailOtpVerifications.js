const { appPool } = require("../../config/db");

const EmailOtpVerifications = async () => {
  const query = `
CREATE TABLE IF NOT EXISTS "EmailOtpVerifications" (
  "Id" SERIAL PRIMARY KEY,
  "Email" VARCHAR(255) NOT NULL,
  "Purpose" VARCHAR(64) NOT NULL,
  "OtpHash" TEXT NOT NULL,
  "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
  "ExpiresAt" TIMESTAMP NOT NULL,
  "ConsumedAt" TIMESTAMP NULL,
  "AttemptCount" INT NOT NULL DEFAULT 0,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_email_otp_lookup"
  ON "EmailOtpVerifications" ("Email", "Purpose", "ConsumedAt", "ExpiresAt");
`;

  await appPool.query(query);
  console.log("✅ Email OTP verifications table ready");
};

module.exports = { EmailOtpVerifications };
