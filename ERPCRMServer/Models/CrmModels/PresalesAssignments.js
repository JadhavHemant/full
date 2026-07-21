const { appPool } = require("../../config/db");

const PresalesAssignments = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "PresalesAssignments" (
      "id" SERIAL PRIMARY KEY,
      "presales_id" INT REFERENCES "Presales"("Id") ON DELETE CASCADE,
      "assignedTo" INT REFERENCES "Users"("UserId"),
      "assignedFrom" INT REFERENCES "Users"("UserId"),
      "changedBy" INT REFERENCES "Users"("UserId"),
      "changedAt" TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await appPool.query(query);
    console.log("✅ PresalesAssignments table ready");
  } catch (error) {
    console.error("❌ Error creating PresalesAssignments table:", error.message);
  }
};

module.exports = { PresalesAssignments };
