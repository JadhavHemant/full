const { appPool } = require("../../config/db");

const Documents = async () => {
  // Create table if not exists
  const query = `
    CREATE TABLE IF NOT EXISTS "Documents" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "EntityType" VARCHAR(100) NOT NULL,
      "EntityId" INT NOT NULL,
      "DocumentName" VARCHAR(255) NOT NULL,
      "DocumentType" VARCHAR(100),
      "FileSize" BIGINT DEFAULT 0,
      "FilePath" TEXT,
      "FileUrl" TEXT,
      "MimeType" VARCHAR(100),
      "Version" INT DEFAULT 1,
      "IsCurrentVersion" BOOLEAN DEFAULT TRUE,
      "Description" TEXT,
      "Tags" TEXT[],
      "IsPublic" BOOLEAN DEFAULT FALSE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "UpdatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);

  // Add missing columns if table already existed
  const alterQueries = [
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "DocumentType" VARCHAR(100)`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "FileSize" BIGINT DEFAULT 0`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "MimeType" VARCHAR(100)`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "IsCurrentVersion" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "Tags" TEXT[]`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "IsPublic" BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
  ];

  for (const alterQuery of alterQueries) {
    try {
      await appPool.query(alterQuery);
    } catch (err) {
      // Ignore if column already exists
    }
  }

  try {
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_documents_entity ON "Documents"("EntityType", "EntityId")');
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_documents_company ON "Documents"("CompanyId")');
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_documents_type ON "Documents"("DocumentType")');
  } catch (err) {
    // Indexes may already exist
  }
  console.log("✅ Documents table ready");
};

const DocumentVersions = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "DocumentVersions" (
      "Id" SERIAL PRIMARY KEY,
      "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
      "VersionNumber" INT NOT NULL,
      "FilePath" TEXT,
      "FileUrl" TEXT,
      "FileSize" BIGINT DEFAULT 0,
      "MimeType" VARCHAR(100),
      "ChangeNotes" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON "DocumentVersions"("DocumentId")');
  console.log("✅ DocumentVersions table ready");
};

const DocumentAccess = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "DocumentAccess" (
      "Id" SERIAL PRIMARY KEY,
      "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
      "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "AccessType" VARCHAR(50) NOT NULL DEFAULT 'View',
      "GrantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "GrantedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ExpiresAt" TIMESTAMP,
      UNIQUE("DocumentId", "UserId", "AccessType")
    );
  `;

  await appPool.query(query);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_doc_access_user ON "DocumentAccess"("UserId")');
  console.log("✅ DocumentAccess table ready");
};

module.exports = { Documents, DocumentVersions, DocumentAccess };