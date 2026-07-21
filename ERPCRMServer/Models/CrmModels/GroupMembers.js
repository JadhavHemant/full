const { appPool } = require("../../config/db")

const  GroupMembers= async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "GroupMembers" (
    "Id" SERIAL PRIMARY KEY,
    "GroupId" INT REFERENCES "Groups"("Id") ON DELETE CASCADE,
    "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
    "AddedAt" TIMESTAMP DEFAULT NOW()
);
    `
    await appPool.query(query);
    console.log("✅ GroupMembers table ready")
}

module.exports = { GroupMembers };