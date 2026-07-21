const { appPool } = require("../../config/db");
 
// Create Profit Loss Report

const createProfitLossReport = async (req, res) => {

    const { CompanyId, ReportDate, TotalSales, TotalCost, GrossProfit } = req.body;

    const query = `

        INSERT INTO "ProfitLossReports"

        ("CompanyId", "ReportDate", "TotalSales", "TotalCost", "GrossProfit")

        VALUES ($1, $2, $3, $4, $5)

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [CompanyId, ReportDate, TotalSales, TotalCost, GrossProfit]);

        res.status(201).json(rows[0]);

    } catch (error) {

        console.error("Error creating ProfitLossReport:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Update Profit Loss Report by Id

const updateProfitLossReport = async (req, res) => {

    const { id } = req.params;

    const { CompanyId, ReportDate, TotalSales, TotalCost, GrossProfit } = req.body;

    const query = `

        UPDATE "ProfitLossReports"

        SET "CompanyId" = $1,

            "ReportDate" = $2,

            "TotalSales" = $3,

            "TotalCost" = $4,

            "GrossProfit" = $5

        WHERE "Id" = $6

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [CompanyId, ReportDate, TotalSales, TotalCost, GrossProfit, id]);

        if (!rows.length) return res.status(404).json({ message: "ProfitLossReport not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error updating ProfitLossReport:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Soft Delete Profit Loss Report by Id (set TotalSales, TotalCost, GrossProfit to NULL)

const softDeleteProfitLossReport = async (req, res) => {

    const { id } = req.params;

    const query = `

        UPDATE "ProfitLossReports"

        SET "TotalSales" = NULL,

            "TotalCost" = NULL,

            "GrossProfit" = NULL

        WHERE "Id" = $1

        RETURNING *;

    `;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProfitLossReport not found" });
 
        res.json({ message: "Soft deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error soft deleting ProfitLossReport:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Hard Delete Profit Loss Report by Id

const hardDeleteProfitLossReport = async (req, res) => {

    const { id } = req.params;

    const query = `DELETE FROM "ProfitLossReports" WHERE "Id" = $1 RETURNING *;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProfitLossReport not found" });
 
        res.json({ message: "Hard deleted successfully", record: rows[0] });

    } catch (error) {

        console.error("Error hard deleting ProfitLossReport:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get Profit Loss Report by Id

const getProfitLossReportById = async (req, res) => {

    const { id } = req.params;

    const query = `SELECT * FROM "ProfitLossReports" WHERE "Id" = $1 LIMIT 1;`;
 
    try {

        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) return res.status(404).json({ message: "ProfitLossReport not found" });
 
        res.json(rows[0]);

    } catch (error) {

        console.error("Error fetching ProfitLossReport by Id:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
// Get All Profit Loss Reports with Pagination

const getAllProfitLossReports = async (req, res) => {

    const { limit = 10, offset = 0 } = req.query;

    const query = `

        SELECT * FROM "ProfitLossReports"

        ORDER BY "ReportDate" DESC

        LIMIT $1 OFFSET $2;

    `;
 
    try {

        const { rows } = await appPool.query(query, [limit, offset]);

        res.json(rows);

    } catch (error) {

        console.error("Error fetching all ProfitLossReports:", error);

        res.status(500).json({ message: "Internal server error" });

    }

};
 
module.exports = {

    createProfitLossReport,

    updateProfitLossReport,

    softDeleteProfitLossReport,

    hardDeleteProfitLossReport,

    getProfitLossReportById,

    getAllProfitLossReports

};

    