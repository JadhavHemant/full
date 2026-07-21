const { appPool } = require("../../config/db")

const Comments = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS "Comments" (
    "Id" SERIAL PRIMARY KEY,
    "EntityType" VARCHAR(50) NOT NULL,
    "EntityId" INT NOT NULL,
    "CommentText" TEXT NOT NULL,
    "CommentedBy" INT REFERENCES "Users"("UserId"),
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);
    `
    await appPool.query(query);
    console.log("✅ Comments table ready")
}

module.exports = { Comments };