const { appPool } = require("../../config/db");

const createBrand = async (req, res) => {
  const { BrandName, Description, CompanyId } = req.body;
  if (!BrandName || !CompanyId) {
    return res.status(400).json({ success: false, message: "BrandName and CompanyId are required" });
  }
  try {
    const result = await appPool.query(
      `INSERT INTO "Brands" ("BrandName", "Description", "CompanyId", "CreatedBy") VALUES ($1,$2,$3,$4) RETURNING *`,
      [BrandName, Description || null, CompanyId, req.user?.userId || null]
    );
    res.status(201).json({ success: true, message: "Brand created successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating brand:", err);
    res.status(500).json({ success: false, message: "Failed to create brand", error: err.message });
  }
};

const getAllBrands = async (req, res) => {
  const { page = 1, limit = 10, search = "", companyId, isActive, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "BrandName", "CreatedAt"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['"IsDeleted" = FALSE'];
  const queryParams = [];
  let paramCount = 1;

  if (search) {
    whereConditions.push(`("BrandName" ILIKE $${paramCount} OR "Description" ILIKE $${paramCount})`);
    queryParams.push(`%${search}%`);
    paramCount++;
  }
  if (companyId) {
    whereConditions.push(`"CompanyId" = $${paramCount}`);
    queryParams.push(companyId);
    paramCount++;
  }
  if (isActive !== undefined && isActive !== "") {
    whereConditions.push(`"IsActive" = $${paramCount}`);
    queryParams.push(isActive === "true");
    paramCount++;
  }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "Brands" WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT b.*, c."CompanyName", u."Name" as "CreatedByName" 
       FROM "Brands" b 
       LEFT JOIN "Companies" c ON b."CompanyId" = c."Id" 
       LEFT JOIN "Users" u ON b."CreatedBy" = u."UserId" 
       WHERE ${whereClause} ORDER BY b."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ success: false, message: "Failed to fetch brands", error: err.message });
  }
};

const getBrandById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await appPool.query(
      `SELECT b.*, c."CompanyName", u."Name" as "CreatedByName" FROM "Brands" b 
       LEFT JOIN "Companies" c ON b."CompanyId" = c."Id" 
       LEFT JOIN "Users" u ON b."CreatedBy" = u."UserId" WHERE b."Id" = $1 AND b."IsDeleted" = FALSE`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching brand:", err);
    res.status(500).json({ success: false, message: "Failed to fetch brand", error: err.message });
  }
};

const updateBrand = async (req, res) => {
  const { id } = req.params;
  const { BrandName, Description, IsActive } = req.body;
  const updateFields = [];
  const queryParams = [];
  let paramCount = 1;

  if (BrandName !== undefined) { updateFields.push(`"BrandName" = $${paramCount}`); queryParams.push(BrandName); paramCount++; }
  if (Description !== undefined) { updateFields.push(`"Description" = $${paramCount}`); queryParams.push(Description); paramCount++; }
  if (IsActive !== undefined) { updateFields.push(`"IsActive" = $${paramCount}`); queryParams.push(IsActive); paramCount++; }
  if (req.user?.userId) { updateFields.push(`"UpdatedBy" = $${paramCount}`); queryParams.push(req.user.userId); paramCount++; }
  updateFields.push(`"UpdatedAt" = CURRENT_TIMESTAMP`);

  if (updateFields.length === 1) return res.status(400).json({ success: false, message: "No fields to update" });
  queryParams.push(id);

  try {
    const result = await appPool.query(
      `UPDATE "Brands" SET ${updateFields.join(", ")} WHERE "Id" = $${paramCount} AND "IsDeleted" = FALSE RETURNING *`, queryParams
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, message: "Brand updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating brand:", err);
    res.status(500).json({ success: false, message: "Failed to update brand", error: err.message });
  }
};

const softDeleteBrand = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await appPool.query(
      `UPDATE "Brands" SET "IsDeleted" = TRUE, "DeletedAt" = CURRENT_TIMESTAMP, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1 AND "IsDeleted" = FALSE RETURNING *`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (err) {
    console.error("Error deleting brand:", err);
    res.status(500).json({ success: false, message: "Failed to delete brand", error: err.message });
  }
};

module.exports = { createBrand, getAllBrands, getBrandById, updateBrand, softDeleteBrand };