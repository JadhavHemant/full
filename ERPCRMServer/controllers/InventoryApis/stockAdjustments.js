const { appPool } = require("../../config/db");

const createStockAdjustment = async (req, res) => {
  const { WarehouseId, AdjustmentType, AdjustmentDate, Reason, CompanyId, items } = req.body;
  if (!WarehouseId || !AdjustmentType || !CompanyId || !items || !items.length) {
    return res.status(400).json({ success: false, message: "WarehouseId, AdjustmentType, CompanyId, and items are required" });
  }
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    const adjNo = `ADJ-${Date.now()}`;
    const headerResult = await client.query(
      `INSERT INTO "StockAdjustments" ("AdjustmentNo", "WarehouseId", "AdjustmentType", "AdjustmentDate", "Reason", "CompanyId", "CreatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [adjNo, WarehouseId, AdjustmentType, AdjustmentDate || new Date(), Reason || null, CompanyId, req.user?.userId || null]
    );
    const adjId = headerResult.rows[0].Id;

    for (const item of items) {
      // Get current stock
      const stockCheck = await client.query(
        `SELECT "Quantity" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
        [item.ProductId, WarehouseId]
      );
      const currentStock = stockCheck.rows.length > 0 ? parseInt(stockCheck.rows[0].Quantity) : 0;
      const newStock = currentStock + item.Quantity; // Quantity can be negative for reduction

      await client.query(
        `INSERT INTO "StockAdjustmentItems" ("AdjustmentId", "ProductId", "Quantity", "CurrentStock", "NewStock", "UnitCost", "Reason")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [adjId, item.ProductId, item.Quantity, currentStock, newStock, item.UnitCost || 0, item.Reason || null]
      );

      // Update stock
      if (stockCheck.rows.length > 0) {
        const newQty = Math.max(0, currentStock + item.Quantity);
        await client.query(
          `UPDATE "ProductStockPerWarehouse" SET "Quantity" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ProductId" = $2 AND "WarehouseId" = $3`,
          [newQty, item.ProductId, WarehouseId]
        );
      } else if (item.Quantity > 0) {
        await client.query(
          `INSERT INTO "ProductStockPerWarehouse" ("ProductId", "WarehouseId", "Quantity") VALUES ($1,$2,$3)`,
          [item.ProductId, WarehouseId, item.Quantity]
        );
      }

      // Log stock movement
      const changeType = item.Quantity > 0 ? 'IN' : 'OUT';
      await client.query(
        `INSERT INTO "StockMovements" ("ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy") VALUES ($1,$2,'ADJUSTMENT',$3,$4,$5)`,
        [item.ProductId, WarehouseId, item.Quantity, `Stock Adjustment: ${AdjustmentType} - ${item.Reason || Reason || ''}`, req.user?.userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Stock adjustment created", data: headerResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating stock adjustment:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create stock adjustment", error: err.message });
  } finally {
    client.release();
  }
};

const getAllStockAdjustments = async (req, res) => {
  const { page = 1, limit = 10, companyId, adjustmentType, status, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "AdjustmentNo", "AdjustmentDate", "AdjustmentType", "Status"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['sa."IsDeleted" = FALSE'];
  const queryParams = [];
  let paramCount = 1;

  if (companyId) { whereConditions.push(`sa."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  if (adjustmentType) { whereConditions.push(`sa."AdjustmentType" = $${paramCount}`); queryParams.push(adjustmentType); paramCount++; }
  if (status) { whereConditions.push(`sa."Status" = $${paramCount}`); queryParams.push(status); paramCount++; }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "StockAdjustments" sa WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT sa.*, w."Name" as "WarehouseName", u."Name" as "CreatedByName"
       FROM "StockAdjustments" sa
       LEFT JOIN "Warehouses" w ON sa."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON sa."CreatedBy" = u."UserId"
       WHERE ${whereClause} ORDER BY sa."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching stock adjustments:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stock adjustments", error: err.message });
  }
};

const getStockAdjustmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const header = await appPool.query(
      `SELECT sa.*, w."Name" as "WarehouseName", u."Name" as "CreatedByName"
       FROM "StockAdjustments" sa
       LEFT JOIN "Warehouses" w ON sa."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON sa."CreatedBy" = u."UserId"
       WHERE sa."Id" = $1 AND sa."IsDeleted" = FALSE`, [id]
    );
    if (header.rows.length === 0) return res.status(404).json({ success: false, message: "Stock adjustment not found" });
    const items = await appPool.query(
      `SELECT sai.*, p."ProductName", p."ProductCode"
       FROM "StockAdjustmentItems" sai
       LEFT JOIN "Products" p ON sai."ProductId" = p."Id"
       WHERE sai."AdjustmentId" = $1`, [id]
    );
    res.json({ success: true, data: { ...header.rows[0], items: items.rows } });
  } catch (err) {
    console.error("Error fetching stock adjustment:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stock adjustment", error: err.message });
  }
};

const updateAdjustmentStatus = async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;
  try {
    const result = await appPool.query(
      `UPDATE "StockAdjustments" SET "Status" = $1, "ApprovedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $3 AND "IsDeleted" = FALSE RETURNING *`,
      [Status, req.user?.userId || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Stock adjustment not found" });
    res.json({ success: true, message: "Status updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating adjustment status:", err);
    res.status(500).json({ success: false, message: "Failed to update status", error: err.message });
  }
};

module.exports = { createStockAdjustment, getAllStockAdjustments, getStockAdjustmentById, updateAdjustmentStatus };