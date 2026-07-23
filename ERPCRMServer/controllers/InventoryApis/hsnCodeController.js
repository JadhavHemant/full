const { appPool } = require("../../config/db");

const createHSNCode = async (req, res) => {
  try {
    const { companyId, code, description, type, taxRate, cessPercentage, effectiveFrom, effectiveTo } = req.body;
    const userId = req.user?.UserId;

    if (!code) return res.status(400).json({ message: "Code is required" });

    const result = await appPool.query(
      `INSERT INTO "HSNCode" ("CompanyId", "Code", "Description", "Type", "TaxRate", "CessPercentage", "IsActive", "EffectiveFrom", "EffectiveTo", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $9) RETURNING *`,
      [companyId || null, code, description || null, type || 'HSN', taxRate || 0, cessPercentage || 0, effectiveFrom || null, effectiveTo || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating HSN code:", error);
    res.status(500).json({ message: "Failed to create HSN code", error: error.message });
  }
};

const getHSNCodes = async (req, res) => {
  try {
    const { companyId, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM "HSNCode" WHERE "IsDeleted" = false`;
    const params = [];

    if (companyId) { query += ` AND "CompanyId" = $${params.length + 1}`; params.push(companyId); }
    if (type) { query += ` AND "Type" = $${params.length + 1}`; params.push(type); }

    query += ` ORDER BY "Code" ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching HSN codes:", error);
    res.status(500).json({ message: "Failed to fetch HSN codes", error: error.message });
  }
};

const updateHSNCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, taxRate, cessPercentage, isActive } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "HSNCode" SET "Description" = COALESCE($1, "Description"), "TaxRate" = COALESCE($2, "TaxRate"), "CessPercentage" = COALESCE($3, "CessPercentage"), "IsActive" = COALESCE($4, "IsActive"), "UpdatedBy" = $5, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $6 AND "IsDeleted" = false RETURNING *`,
      [description || null, taxRate, cessPercentage, isActive, userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "HSN code not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating HSN code:", error);
    res.status(500).json({ message: "Failed to update HSN code", error: error.message });
  }
};

const deleteHSNCode = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "HSNCode" SET "IsDeleted" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1`, [id]);
    res.json({ message: "HSN code deleted successfully" });
  } catch (error) {
    console.error("Error deleting HSN code:", error);
    res.status(500).json({ message: "Failed to delete HSN code", error: error.message });
  }
};

module.exports = { createHSNCode, getHSNCodes, updateHSNCode, deleteHSNCode };