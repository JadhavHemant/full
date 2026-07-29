const { appPool } = require("../../config/db");
const path = require("path");
const fs = require("fs");

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
    const { entityType, entityId, category, description, tags, isPublic } = req.body;
    const userId = req.user?.UserId;
    const companyId = req.user?.CompanyId || req.body.companyId;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: "EntityType and EntityId are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const file = req.file;
    const documentName = file.originalname;
    const originalName = file.originalname;
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mimeType = file.mimetype;
    const fileSize = file.size;
    const filePath = file.path || path.join(UPLOAD_DIR, fileName);
    const fileUrl = `/uploads/documents/${file.filename || fileName}`;

    const result = await appPool.query(
      `INSERT INTO "Documents" ("CompanyId", "EntityType", "EntityId", "DocumentName", "OriginalName", "FileName", "DocumentType", "FileSize", "FilePath", "FileUrl", "MimeType", "Version", "IsCurrentVersion", "Category", "Description", "Tags", "IsPublic", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, true, $12, $13, $14, $15, $16, $16) RETURNING *`,
      [companyId, entityType, entityId, documentName, originalName, fileName,
       mimeType?.split('/')[1] || null, fileSize, filePath, fileUrl, mimeType,
       category || 'General', description || null,
       tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : null,
       isPublic === 'true' || isPublic === true, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

// @desc    Get documents by entity
// @route   GET /api/documents/entity/:entityType/:entityId
// @access  Private
const getDocumentsByEntity = async (req, res) => {
  try {
    const { entityType, entityId, type, id } = req.params;
    const resolvedType = entityType || type;
    const resolvedId = entityId || id;

    const result = await appPool.query(
      `SELECT d.*, u."FullName" as "UploadedByName"
       FROM "Documents" d
       LEFT JOIN "Users" u ON d."CreatedBy" = u."UserId"
       WHERE d."EntityType" = $1 AND d."EntityId" = $2 AND d."IsDeleted" = false
       ORDER BY d."CreatedAt" DESC`,
      [resolvedType, resolvedId]
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
    const { documentName, category, description, tags, isPublic } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "Documents" SET
        "DocumentName" = COALESCE($1, "DocumentName"),
        "Category" = COALESCE($2, "Category"),
        "Description" = COALESCE($3, "Description"),
        "Tags" = COALESCE($4, "Tags"),
        "IsPublic" = COALESCE($5, "IsPublic"),
        "UpdatedBy" = $6,
        "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $7 AND "IsDeleted" = false RETURNING *`,
      [documentName || null, category || null, description || null,
       tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : null,
       isPublic !== undefined ? isPublic : null, userId, id]
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

    await appPool.query(
      `UPDATE "Documents" SET "IsDeleted" = true, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
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
    const { userIds, userId: targetUserId, accessType, expiresAt } = req.body;
    const grantedBy = req.user?.UserId;

    // Support both single userId and array of userIds
    const resolvedUserIds = userIds && Array.isArray(userIds) ? userIds : (targetUserId ? [targetUserId] : []);

    if (resolvedUserIds.length === 0) {
      return res.status(400).json({ message: "User ID(s) are required" });
    }

    const results = [];
    for (const uid of resolvedUserIds) {
      const result = await appPool.query(
        `INSERT INTO "DocumentAccess" ("DocumentId", "UserId", "AccessType", "GrantedBy", "ExpiresAt")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("DocumentId", "UserId", "AccessType")
         DO UPDATE SET "GrantedAt" = CURRENT_TIMESTAMP, "ExpiresAt" = $5 RETURNING *`,
        [id, uid, accessType || 'View', grantedBy, expiresAt || null]
      );
      results.push(result.rows[0]);
    }

    // Mark document as shared
    await appPool.query(
      `UPDATE "Documents" SET "IsShared" = TRUE, "SharedWith" = $1::jsonb, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $3`,
      [JSON.stringify(resolvedUserIds), grantedBy, id]
    );

    res.json(resolvedUserIds.length === 1 ? results[0] : { message: `Document shared with ${results.length} user(s)`, results });
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
      `SELECT * FROM "Documents" WHERE "Id" = $1 AND "IsDeleted" = false`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    const doc = result.rows[0];
    if (doc.FilePath && fs.existsSync(doc.FilePath)) {
      return res.download(doc.FilePath, doc.OriginalName || doc.DocumentName);
    }

    return res.status(404).json({ message: "File not found on server" });
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ message: "Failed to download document", error: error.message });
  }
};

// @desc    Upload new version of a document
// @route   POST /api/documents/:id/versions
// @access  Private
const uploadDocumentVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeNotes } = req.body;
    const userId = req.user?.UserId;

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Get current document
    const docResult = await appPool.query(
      `SELECT * FROM "Documents" WHERE "Id" = $1 AND "IsDeleted" = false`,
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    const doc = docResult.rows[0];
    const newVersion = (doc.Version || 1) + 1;
    const file = req.file;
    const fileUrl = `/uploads/documents/${file.filename}`;

    // Create version record
    await appPool.query(
      `INSERT INTO "DocumentVersions" ("DocumentId", "VersionNumber", "FilePath", "FileUrl", "FileSize", "MimeType", "ChangeNotes", "CreatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, newVersion, file.path, fileUrl, file.size, file.mimetype, changeNotes || null, userId]
    );

    // Update document
    const result = await appPool.query(
      `UPDATE "Documents" SET "Version" = $1, "FileSize" = $2, "FilePath" = $3, "FileUrl" = $4, "MimeType" = $5, "UpdatedBy" = $6, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $7 RETURNING *`,
      [newVersion, file.size, file.path, fileUrl, file.mimetype, userId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading document version:", error);
    res.status(500).json({ message: "Failed to upload document version", error: error.message });
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
  uploadDocumentVersion,
};
