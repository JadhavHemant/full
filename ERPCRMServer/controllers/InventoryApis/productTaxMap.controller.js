const { appPool } = require("../../config/db");
 
// Create Product Tax Mapping

const createProductTaxMap = async (req, res) => {

    const { ProductId, TaxId } = req.body;

    const query = `

        INSERT INTO "ProductTaxMap" ("ProductId", "TaxId")

        VALUES ($1, $2)

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [ProductId, TaxId]);

        res.status(201).json(rows[0]);

    } catch (error) {

        console.error("Error creating ProductTaxMap:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Update Product Tax Mapping by Id

const updateProductTaxMap = async (req, res) => {

    const { id } = req.params;

    const { ProductId, TaxId } = req.body;

    const query = `

        UPDATE "ProductTaxMap"

        SET "ProductId" = $1, "TaxId" = $2

        WHERE "Id" = $3

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [ProductId, TaxId, id]);

        if (!rows.length) return res.status(404).json({ message: "ProductTaxMap not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error updating ProductTaxMap:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Soft Delete Product Tax Mapping by Id (set ProductId & TaxId to NULL)

const softDeleteProductTaxMap = async (req, res) => {

    const { id } = req.params;

    const query = `

        UPDATE "ProductTaxMap"

        SET "ProductId" = NULL, "TaxId" = NULL

        WHERE "Id" = $1

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProductTaxMap not found" });
 
        res.json({ message: "Soft deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error soft deleting ProductTaxMap:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Hard Delete Product Tax Mapping by Id

const hardDeleteProductTaxMap = async (req, res) => {

    const { id } = req.params;

    const query = `DELETE FROM "ProductTaxMap" WHERE "Id" = $1 RETURNING *;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProductTaxMap not found" });
 
        res.json({ message: "Hard deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error hard deleting ProductTaxMap:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get ProductTaxMap by Id

const getProductTaxMapById = async (req, res) => {

    const { id } = req.params;

    const query = `SELECT * FROM "ProductTaxMap" WHERE "Id" = $1 LIMIT 1;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProductTaxMap not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error fetching ProductTaxMap by Id:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get All ProductTaxMaps with Pagination

const getAllProductTaxMaps = async (req, res) => {

    const { limit = 10, offset = 0 } = req.query;

    const query = `

        SELECT * FROM "ProductTaxMap"

        ORDER BY "Id" DESC

        LIMIT $1 OFFSET $2;

    `;
 
    try {

        const { rows } = await appPool.query(query, [limit, offset]);

        res.json(rows);

    } catch (error) {

        console.error("Error fetching all ProductTaxMaps:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
module.exports = {

    createProductTaxMap,

    updateProductTaxMap,

    softDeleteProductTaxMap,

    hardDeleteProductTaxMap,

    getProductTaxMapById,

    getAllProductTaxMaps

};

 