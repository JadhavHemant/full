const { appPool } = require("../../config/db");
 
// Create Tax

const createTax = async (req, res) => {

    const { Name, Rate, Description } = req.body;

    const query = `

        INSERT INTO "Taxes"

        ("Name", "Rate", "Description")

        VALUES ($1, $2, $3)

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [Name, Rate, Description]);

        res.status(201).json(rows[0]);

    } catch (error) {

        console.error("Error creating Tax:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Update Tax by Id

const updateTax = async (req, res) => {

    const { id } = req.params;

    const { Name, Rate, Description } = req.body;

    const query = `

        UPDATE "Taxes"

        SET "Name" = $1,

            "Rate" = $2,

            "Description" = $3

        WHERE "Id" = $4

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [Name, Rate, Description, id]);

        if (!rows.length) return res.status(404).json({ message: "Tax not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error updating Tax:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Soft Delete Tax by Id (set Rate = 0 and Description to 'Soft deleted')

const softDeleteTax = async (req, res) => {

    const { id } = req.params;

    const query = `

        UPDATE "Taxes"

        SET "Rate" = 0,

            "Description" = 'Soft deleted'

        WHERE "Id" = $1

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "Tax not found" });
 
        res.json({ message: "Soft deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error soft deleting Tax:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Hard Delete Tax by Id

const hardDeleteTax = async (req, res) => {

    const { id } = req.params;

    const query = `DELETE FROM "Taxes" WHERE "Id" = $1 RETURNING *;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "Tax not found" });
 
        res.json({ message: "Hard deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error hard deleting Tax:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get Tax by Id

const getTaxById = async (req, res) => {

    const { id } = req.params;

    const query = `SELECT * FROM "Taxes" WHERE "Id" = $1 LIMIT 1;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "Tax not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error fetching Tax by Id:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get All Taxes with Pagination

const getAllTaxes = async (req, res) => {

    const { limit = 10, offset = 0 } = req.query;

    const query = `

        SELECT * FROM "Taxes"

        ORDER BY "Id" DESC

        LIMIT $1 OFFSET $2;

    `;
 
    try {

        const { rows } = await appPool.query(query, [limit, offset]);

        res.json(rows);

    } catch (error) {

        console.error("Error fetching all Taxes:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
module.exports = {

    createTax,

    updateTax,

    softDeleteTax,

    hardDeleteTax,

    getTaxById,

    getAllTaxes

};

 