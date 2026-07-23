const { appPool } = require("../../config/db");
const path = require("path");
const fs = require("fs");

// @desc    Upload a document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    const { entityType, entityId, description, tags, isPublic } = req.body;
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
    const mimeType = file.mimetype;
    const fileSize = file.size;
    const filePath = file.path;
    const fileUrl = `/uploads/documents/${file.filename}`;

    // Create document record
    const result = await appPool.query(
      `INSERT INTO "Documents" ("CompanyId", "EntityType", "EntityId", "DocumentName", "DocumentType", "FileSize", "FilePath", "FileUrl", "MimeType", "Version", "IsCurrentVersion", "Description", "Tags", "IsPublic", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, true, $10, $11, $12, $13, $13) RETURNING *`,
      [companyId, entityType, entityId, documentName, mimeType?.split('/')[1] || null, fileSize, filePath, fileUrl, mimeType, description || null, tags ? JSON.parse(tags) : null, isPublic === 'true', userId]
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
    const { entityType, entityId } = req.params;
    const result = await appPool.query(
      `SELECT * FROM "Documents" WHERE "EntityType" = $1 AND "EntityId" = $2 AND "IsDeleted" = false ORDER BY "CreatedAt" DESC`,
      [entityType, entityId]
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
    const { documentName, description, tags, isPublic } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "Documents" SET
        "DocumentName" = COALESCE($1, "DocumentName"),
        "Description" = COALESCE($2, "Description"),
        "Tags" = COALESCE($3, "Tags"),
        "IsPublic" = COALESCE($4, "IsPublic"),
        "UpdatedBy" = $5,
        "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $6 AND "IsDeleted" = false RETURNING *`,
      [documentName || null, description || null, tags ? JSON.parse(tags) : null, isPublic, userId, id]
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
    await appPool.query(
      `UPDATE "Documents" SET "IsDeleted" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1`,
      [id]
    );
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Failed to delete document", error: error.message });
  }
};

// @desc    Share document with user
// @route   POST /api/documents/:id/share
// @access  Private
const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: targetUserId, accessType, expiresAt } = req.body;
    const grantedBy = req.user?.UserId;

    const result = await appPool.query(
      `INSERT INTO "DocumentAccess" ("DocumentId", "UserId", "AccessType", "GrantedBy", "ExpiresAt")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("DocumentId", "UserId", "AccessType")
       DO UPDATE SET "GrantedAt" = CURRENT_TIMESTAMP, "ExpiresAt" = $5 RETURNING *`,
      [id, targetUserId, accessType || 'View', grantedBy, expiresAt || null]
    );

    res.json(result.rows[0]);
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
      `SELECT * FROM "DocumentVersions" WHERE "DocumentId" = $1 ORDER BY "VersionNumber" DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching document versions:", error);
    res.status(500).json({ message: "Failed to fetch document versions", error: error.message });
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
    const newVersion = doc.Version + 1;
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
  uploadDocumentVersion,
};