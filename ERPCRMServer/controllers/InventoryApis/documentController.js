const { appPool } = require("../../config/db");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/documents");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// @desc    Upload a document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { entityType, entityId, category, description } = req.body;
    const userId = req.user?.UserId;
    const companyId = req.user?.CompanyId;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: "Entity type and entity ID are required" });
    }

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Move uploaded file to documents directory
    fs.renameSync(file.path, filePath);

    const result = await appPool.query(
      `INSERT INTO "Documents" ("CompanyId", "EntityType", "EntityId", "FileName", "OriginalName", "FilePath", "FileSize", "MimeType", "Category", "Description", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING *`,
      [companyId, entityType, parseInt(entityId), fileName, file.originalname, filePath, file.size, file.mimetype, category || 'General', description || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

// @desc    Get documents by entity
// @route   GET /api/documents/entity/:type/:id
// @access  Private
const getDocumentsByEntity = async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await appPool.query(
      `SELECT d.*, u."FullName" as "UploadedByName"
       FROM "Documents" d
       LEFT JOIN "Users" u ON d."CreatedBy" = u."UserId"
       WHERE d."EntityType" = $1 AND d."EntityId" = $2 AND d."IsDeleted" = FALSE
       ORDER BY d."CreatedAt" DESC`,
      [type, parseInt(id)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "Documents" SET "Category" = COALESCE($1, "Category"), "Description" = COALESCE($2, "Description"), "UpdatedBy" = $3, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $4 AND "IsDeleted" = FALSE RETURNING *`,
      [category, description, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ message: "Failed to update document", error: error.message });
  }
};

// @desc    Delete document (soft delete)
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const doc = await appPool.query(`SELECT * FROM "Documents" WHERE "Id" = $1 AND "IsDeleted" = FALSE`, [id]);
    if (doc.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Soft delete
    await appPool.query(
      `UPDATE "Documents" SET "IsDeleted" = TRUE, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Failed to delete document", error: error.message });
  }
};

// @desc    Share document with users
// @route   POST /api/documents/:id/share
// @access  Private
const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, accessType } = req.body;
    const userId = req.user?.UserId;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    const doc = await appPool.query(`SELECT * FROM "Documents" WHERE "Id" = $1 AND "IsDeleted" = FALSE`, [id]);
    if (doc.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Grant access to each user
    for (const targetUserId of userIds) {
      await appPool.query(
        `INSERT INTO "DocumentAccess" ("DocumentId", "UserId", "AccessType", "GrantedBy")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("DocumentId", "UserId") DO UPDATE SET "AccessType" = $3`,
        [id, targetUserId, accessType || 'View', userId]
      );
    }

    // Mark document as shared
    await appPool.query(
      `UPDATE "Documents" SET "IsShared" = TRUE, "SharedWith" = $1::jsonb, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $3`,
      [JSON.stringify(userIds), userId, id]
    );

    res.json({ message: `Document shared with ${userIds.length} user(s)` });
  } catch (error) {
    console.error("Error sharing document:", error);
    res.status(500).json({ message: "Failed to share document", error: error.message });
  }
};

// @desc    Get document versions
// @route   GET /api/documents/:id/versions
// @access  Private
const getDocumentVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT dv.*, u."FullName" as "CreatedByName"
       FROM "DocumentVersions" dv
       LEFT JOIN "Users" u ON dv."CreatedBy" = u."UserId"
       WHERE dv."DocumentId" = $1
       ORDER BY dv."VersionNumber" DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching document versions:", error);
    res.status(500).json({ message: "Failed to fetch document versions", error: error.message });
  }
};

// @desc    Download document file
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT * FROM "Documents" WHERE "Id" = $1 AND "IsDeleted" = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    const doc = result.rows[0];
    if (!fs.existsSync(doc.FilePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(doc.FilePath, doc.OriginalName);
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ message: "Failed to download document", error: error.message });
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByEntity,
  updateDocument,
  deleteDocument,
  shareDocument,
  getDocumentVersions,
  downloadDocument,
};