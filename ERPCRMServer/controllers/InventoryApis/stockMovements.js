// controllers/InventoryApis/stockMovements.js
const { appPool } = require("../../config/db");

// Create StockMovement
const createStockMovement = async (req, res) => {
  const {
    ProductId,
    WarehouseId,
    ChangeType,
    Quantity,
    Reason,
    CreatedBy,
  } = req.body;
  const createdByUserId =
    Number(req.user?.userId) || Number(CreatedBy) || null;

  // Validation
  if (!ProductId || !WarehouseId || !ChangeType || !Quantity) {
    return res.status(400).json({
      message:
        "ProductId, WarehouseId, ChangeType, and Quantity are required",
    });
  }

  if (
    !["IN", "OUT", "ADJUSTMENT", "TRANSFER"].includes(
      ChangeType.toUpperCase()
    )
  ) {
    return res.status(400).json({
      message: "ChangeType must be IN, OUT, ADJUSTMENT, or TRANSFER",
    });
  }

  if (Number.isNaN(Number(Quantity)) || Number(Quantity) <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive number",
    });
  }

  const query = `
    INSERT INTO "StockMovements"
      ("ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy")
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  try {
    const { rows } = await appPool.query(query, [
      ProductId,
      WarehouseId,
      ChangeType.toUpperCase(),
      Number(Quantity),
      Reason || null,
      createdByUserId,
    ]);

    return res.status(201).json({
      message: "Stock movement created successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error creating StockMovement:", error);
    return res.status(500).json({
      message: error.detail || "Internal server error",
    });
  }
};

// Get all StockMovements with filtering + pagination
const getAllStockMovements = async (req, res) => {
  const {
    limit = 10,
    offset = 0,
    search = "",
    productId = "",
    warehouseId = "",
    changeType = "",
    startDate = "",
    endDate = "",
    sortBy = "CreatedAt",
    sortOrder = "DESC",
  } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(
      p."ProductName" ILIKE $${paramIndex} OR
      p."ProductCode" ILIKE $${paramIndex} OR
      w."Name" ILIKE $${paramIndex} OR
      sm."Reason" ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (productId) {
    whereConditions.push(`sm."ProductId" = $${paramIndex}`);
    queryParams.push(productId);
    paramIndex++;
  }

  if (warehouseId) {
    whereConditions.push(`sm."WarehouseId" = $${paramIndex}`);
    queryParams.push(warehouseId);
    paramIndex++;
  }

  if (changeType) {
    whereConditions.push(`sm."ChangeType" = $${paramIndex}`);
    queryParams.push(changeType.toUpperCase());
    paramIndex++;
  }

  if (startDate) {
    whereConditions.push(`sm."CreatedAt" >= $${paramIndex}`);
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereConditions.push(`sm."CreatedAt" <= $${paramIndex}`);
    queryParams.push(endDate);
    paramIndex++;
  }

  const whereClause =
    whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

  // Sort by a safe set of fields
  const validSortFields = [
    "CreatedAt",
    "Quantity",
    "ChangeType",
    "ProductName",
  ];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "CreatedAt";
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const dataQuery = `
    SELECT
      sm.*,
      p."ProductName",
      p."ProductCode",
      p."ProductImage",
      w."Name" as "WarehouseName",
      w."WarehouseCode",
      w."Location",
      u."Name" as "CreatedByName",
      u."Email" as "CreatedByEmail"
    FROM "StockMovements" sm
    LEFT JOIN "Products" p ON sm."ProductId" = p."Id"
    LEFT JOIN "Warehouses" w ON sm."WarehouseId" = w."Id"
    LEFT JOIN "Users" u ON sm."CreatedBy" = u."UserId"
    ${whereClause}
    ORDER BY ${safeSortBy === "ProductName" ? `p."ProductName"` : `sm."${safeSortBy}"`} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM "StockMovements" sm
    LEFT JOIN "Products" p ON sm."ProductId" = p."Id"
    LEFT JOIN "Warehouses" w ON sm."WarehouseId" = w."Id"
    ${whereClause};
  `;

  try {
    queryParams.push(parseInt(limit, 10), parseInt(offset, 10));

    const [dataResult, countResult] = await Promise.all([
      appPool.query(dataQuery, queryParams),
      appPool.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return res.json({
      data: dataResult.rows,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        totalPages,
        currentPage,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching StockMovements:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get StockMovement by Id
const getStockMovementById = async (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT
      sm.*,
      p."ProductName",
      p."ProductCode",
      p."ProductImage",
      w."Name" as "WarehouseName",
      w."WarehouseCode",
      w."Location",
      u."Name" as "CreatedByName",
      u."Email" as "CreatedByEmail"
    FROM "StockMovements" sm
    LEFT JOIN "Products" p ON sm."ProductId" = p."Id"
    LEFT JOIN "Warehouses" w ON sm."WarehouseId" = w."Id"
    LEFT JOIN "Users" u ON sm."CreatedBy" = u."UserId"
    WHERE sm."Id" = $1
    LIMIT 1;
  `;

  try {
    const { rows } = await appPool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "StockMovement not found" });
    }
    return res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching StockMovement by Id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Stats
const getStockMovementStats = async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as "totalMovements",
      COUNT(CASE WHEN "ChangeType" = 'IN' THEN 1 END) as "totalIn",
      COUNT(CASE WHEN "ChangeType" = 'OUT' THEN 1 END) as "totalOut",
      COUNT(CASE WHEN "ChangeType" = 'ADJUSTMENT' THEN 1 END) as "totalAdjustments",
      COUNT(CASE WHEN "ChangeType" = 'TRANSFER' THEN 1 END) as "totalTransfers",
      SUM(CASE WHEN "ChangeType" = 'IN' THEN "Quantity" ELSE 0 END) as "totalInQuantity",
      SUM(CASE WHEN "ChangeType" = 'OUT' THEN "Quantity" ELSE 0 END) as "totalOutQuantity"
    FROM "StockMovements";
  `;

  try {
    const { rows } = await appPool.query(query);
    return res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Recent
const getRecentStockMovements = async (req, res) => {
  const { limit = 5 } = req.query;

  const query = `
    SELECT 
      sm.*,
      p."ProductName",
      p."ProductCode",
      w."Name" as "WarehouseName"
    FROM "StockMovements" sm
    LEFT JOIN "Products" p ON sm."ProductId" = p."Id"
    LEFT JOIN "Warehouses" w ON sm."WarehouseId" = w."Id"
    ORDER BY sm."CreatedAt" DESC
    LIMIT $1;
  `;

  try {
    const { rows } = await appPool.query(query, [parseInt(limit, 10)]);
    return res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching recent movements:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update
const updateStockMovement = async (req, res) => {
  const { id } = req.params;
  const { ProductId, WarehouseId, ChangeType, Quantity, Reason } = req.body;

  const query = `
    UPDATE "StockMovements"
    SET
      "ProductId"   = COALESCE($1, "ProductId"),
      "WarehouseId" = COALESCE($2, "WarehouseId"),
      "ChangeType"  = COALESCE($3, "ChangeType"),
      "Quantity"    = COALESCE($4, "Quantity"),
      "Reason"      = COALESCE($5, "Reason")
    WHERE "Id" = $6
    RETURNING *;
  `;

  try {
    const { rows } = await appPool.query(query, [
      ProductId || null,
      WarehouseId || null,
      ChangeType ? ChangeType.toUpperCase() : null,
      Quantity != null ? Number(Quantity) : null,
      Reason || null,
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "StockMovement not found" });
    }

    return res.json({
      message: "Stock movement updated successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error updating StockMovement:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hard delete
const hardDeleteStockMovement = async (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM "StockMovements" WHERE "Id" = $1 RETURNING *;`;

  try {
    const { rows } = await appPool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "StockMovement not found" });
    }
    return res.json({
      message: "Stock movement deleted successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error deleting StockMovement:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createStockMovement,
  updateStockMovement,
  hardDeleteStockMovement,
  getStockMovementById,
  getAllStockMovements,
  getStockMovementStats,
  getRecentStockMovements,
};
