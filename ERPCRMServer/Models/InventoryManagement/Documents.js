const { appPool } = require("../../config/db");

const Documents = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Documents" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "EntityType" VARCHAR(50) NOT NULL,
      "EntityId" INT NOT NULL,
      "FileName" VARCHAR(255) NOT NULL,
      "OriginalName" VARCHAR(255) NOT NULL,
      "FilePath" VARCHAR(500) NOT NULL,
      "FileSize" INT DEFAULT 0,
      "MimeType" VARCHAR(100),
      "Category" VARCHAR(50) DEFAULT 'General',
      "Description" TEXT,
      "IsShared" BOOLEAN DEFAULT FALSE,
      "SharedWith" JSONB DEFAULT '[]',
      "Version" INT DEFAULT 1,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "IsDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "DocumentVersions" (
      "Id" SERIAL PRIMARY KEY,
      "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
      "VersionNumber" INT NOT NULL,
      "FileName" VARCHAR(255) NOT NULL,
      "FilePath" VARCHAR(500) NOT NULL,
      "FileSize" INT DEFAULT 0,
      "ChangeNotes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS "DocumentAccess" (
      "Id" SERIAL PRIMARY KEY,
      "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "AccessType" VARCHAR(20) DEFAULT 'View',
      "GrantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "GrantedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      UNIQUE("DocumentId", "UserId")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_documents_entity ON "Documents"("EntityType", "EntityId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_documents_company ON "Documents"("CompanyId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON "DocumentVersions"("DocumentId")');
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_doc_access_doc ON "DocumentAccess"("DocumentId")');
  console.log("✅ Documents, DocumentVersions & DocumentAccess tables ready");
};

module.exports = { Documents };