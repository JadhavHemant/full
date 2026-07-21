const { appPool } = require("../../config/db");

// Create a new Audit Log

const createAuditLog = async (req, res) => {

    const { TableName, RecordId, Action, ChangedBy, Changes } = req.body;

    const query = `

        INSERT INTO "AuditLogs" ("TableName", "RecordId", "Action", "ChangedBy", "Changes") 

        VALUES ($1, $2, $3, $4, $5) RETURNING *;

    `;

    try {

        const { rows } = await appPool.query(query, [TableName, RecordId, Action, ChangedBy, Changes]);

        res.status(201).json(rows[0]);

    } catch (error) {

        console.error("Error creating AuditLog:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

// Update an Audit Log by Id

const updateAuditLog = async (req, res) => {

    const { id } = req.params;

    const { TableName, RecordId, Action, ChangedBy, Changes } = req.body;

    const query = `

        UPDATE "AuditLogs"

        SET "TableName" = $1, "RecordId" = $2, "Action" = $3, "ChangedBy" = $4, "Changes" = $5

        WHERE "Id" = $6

        RETURNING *;

    `;

    try {

        const { rows } = await appPool.query(query, [TableName, RecordId, Action, ChangedBy, Changes, id]);

        if (!rows.length) return res.status(404).json({ message: "AuditLog not found" });

        res.json(rows[0]);

    } catch (error) {

        console.error("Error updating AuditLog:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

// Soft Delete an Audit Log by Id (marks as deleted)

const softDeleteAuditLog = async (req, res) => {

    const { id } = req.params;

    const query = `

        UPDATE "AuditLogs"

        SET "Action" = 'SOFT_DELETED'

        WHERE "Id" = $1

        RETURNING *;

    `;

    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "AuditLog not found" });

        res.json({ message: "Soft deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error soft deleting AuditLog:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

// Hard Delete an Audit Log by Id (remove from DB)

const hardDeleteAuditLog = async (req, res) => {

    const { id } = req.params;

    const query = `DELETE FROM "AuditLogs" WHERE "Id" = $1 RETURNING *;`;

    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "AuditLog not found" });

        res.json({ message: "Hard deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error hard deleting AuditLog:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

// Get Audit Logs by ChangedBy (UserId) with pagination

const getAuditLogsByUserId = async (req, res) => {

    const { userId } = req.params;

    const { limit = 10, offset = 0 } = req.query;

    const query = `

        SELECT * FROM "AuditLogs"

        WHERE "ChangedBy" = $1

        ORDER BY "ChangeTime" DESC

        LIMIT $2 OFFSET $3;

    `;

    try {

        const { rows } = await appPool.query(query, [userId, limit, offset]);

        res.json(rows);

    } catch (error) {

        console.error("Error fetching AuditLogs by userId:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

// Get all Audit Logs with pagination

const getAllAuditLogs = async (req, res) => {

    const { limit = 10, offset = 0 } = req.query;

    const query = `

        SELECT * FROM "AuditLogs"

        ORDER BY "ChangeTime" DESC

        LIMIT $1 OFFSET $2;

    `;

    try {

        const { rows } = await appPool.query(query, [limit, offset]);

        res.json(rows);

    } catch (error) {

        console.error("Error fetching all AuditLogs:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};

module.exports = {

    createAuditLog,

    updateAuditLog,

    softDeleteAuditLog,

    hardDeleteAuditLog,

    getAuditLogsByUserId,

    getAllAuditLogs

};

