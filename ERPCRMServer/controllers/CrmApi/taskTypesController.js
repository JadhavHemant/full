const { appPool } = require("../../config/db");

// ✅ Create new TaskType
const createTaskType = async (req, res) => {
    const { Name, DefaultDurationMinutes } = req.body;

    const query = `
        INSERT INTO "TaskTypes" ("Name", "DefaultDurationMinutes")
        VALUES ($1, $2)
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [Name, DefaultDurationMinutes]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("❌ Error creating TaskType:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Update TaskType by Id
const updateTaskType = async (req, res) => {
    const { id } = req.params;
    const { Name, DefaultDurationMinutes } = req.body;

    const query = `
        UPDATE "TaskTypes"
        SET "Name" = $1, "DefaultDurationMinutes" = $2
        WHERE "Id" = $3
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [Name, DefaultDurationMinutes, id]);
        if (!rows.length) return res.status(404).json({ message: "TaskType not found" });
        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Error updating TaskType:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Soft Delete TaskType (mark as deleted by renaming)
const softDeleteTaskType = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "TaskTypes"
        SET "Name" = CONCAT('DELETED_', "Id")
        WHERE "Id" = $1
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) return res.status(404).json({ message: "TaskType not found" });
        res.json({ message: "Soft deleted successfully", record: rows[0] });
    } catch (error) {
        console.error("❌ Error soft deleting TaskType:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Hard Delete TaskType
const hardDeleteTaskType = async (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM "TaskTypes" WHERE "Id" = $1 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) return res.status(404).json({ message: "TaskType not found" });
        res.json({ message: "Hard deleted successfully", record: rows[0] });
    } catch (error) {
        console.error("❌ Error hard deleting TaskType:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Get TaskType by Id
const getTaskTypeById = async (req, res) => {
    const { id } = req.params;

    const query = `SELECT * FROM "TaskTypes" WHERE "Id" = $1 LIMIT 1;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) return res.status(404).json({ message: "TaskType not found" });
        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Error fetching TaskType by Id:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Get all TaskTypes with pagination
const getAllTaskTypes = async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;

    const query = `
        SELECT * FROM "TaskTypes"
        ORDER BY "CreatedAt" DESC
        LIMIT $1 OFFSET $2;
    `;

    try {
        const { rows } = await appPool.query(query, [limit, offset]);
        res.json(rows);
    } catch (error) {
        console.error("❌ Error fetching all TaskTypes:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createTaskType,
    updateTaskType,
    softDeleteTaskType,
    hardDeleteTaskType,
    getTaskTypeById,
    getAllTaskTypes
};
