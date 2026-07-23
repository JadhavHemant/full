const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { appPool } = require("../../config/db");

// @desc    Get all reorder levels
// @route   GET /api/reorder-levels
// @access  Private
const getAllReorderLevels = async (req, res) => {
  try {
    const { productId, warehouseId, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT rl.*, p."ProductName", p."SKU", w."WarehouseName",
             ps."Quantity" as "CurrentStock"
      FROM "ReorderLevels" rl
      LEFT JOIN "Products" p ON rl."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON rl."WarehouseId" = w."Id"
      LEFT JOIN "ProductStockPerWarehouse" ps ON rl."ProductId" = ps."ProductId" AND rl."WarehouseId" = ps."WarehouseId"
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += ` AND rl."ProductId" = $${params.length + 1}`;
      params.push(productId);
    }
    if (warehouseId) {
      query += ` AND rl."WarehouseId" = $${params.length + 1}`;
      params.push(warehouseId);
    }
    if (status) {
      query += ` AND rl."Status" = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY rl."UpdatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching reorder levels:", error);
    res.status(500).json({ message: "Failed to fetch reorder levels", error: error.message });
  }
};

// @desc    Get reorder level by ID
// @route   GET /api/reorder-levels/:id
// @access  Private
const getReorderLevelById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT rl.*, p."ProductName", p."SKU", w."WarehouseName"
       FROM "ReorderLevels" rl
       LEFT JOIN "Products" p ON rl."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON rl."WarehouseId" = w."Id"
       WHERE rl."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Reorder level not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching reorder level:", error);
    res.status(500).json({ message: "Failed to fetch reorder level", error: error.message });
  }
};

// @desc    Create/Update reorder level
// @route   POST /api/reorder-levels
// @access  Private
const upsertReorderLevel = async (req, res) => {
  try {
    const { productId, warehouseId, minStockLevel, maxStockLevel, reorderPoint, reorderQuantity, notes } = req.body;
    const userId = req.user?.UserId;

    // Get current stock
    const stockResult = await appPool.query(
      `SELECT "Quantity" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
      [productId, warehouseId]
    );
    const currentStock = stockResult.rows.length > 0 ? stockResult.rows[0].Quantity : 0;

    // Determine status
    let status = 'Normal';
    if (currentStock <= reorderPoint) {
      status = 'Reorder';
    } else if (currentStock >= maxStockLevel) {
      status = 'Overstocked';
    } else if (currentStock <= minStockLevel) {
      status = 'Critical';
    }

    const result = await appPool.query(
      `INSERT INTO "ReorderLevels" ("ProductId", "WarehouseId", "MinStockLevel", "MaxStockLevel", "ReorderPoint", "ReorderQuantity", "CurrentStock", "Status", "IsActive", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $10)
       ON CONFLICT ("ProductId", "WarehouseId")
       DO UPDATE SET
         "MinStockLevel" = $3,
         "MaxStockLevel" = $4,
         "ReorderPoint" = $5,
         "ReorderQuantity" = $6,
         "CurrentStock" = $7,
         "Status" = $8,
         "Notes" = $9,
         "UpdatedBy" = $10,
         "UpdatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [productId, warehouseId, minStockLevel, maxStockLevel, reorderPoint, reorderQuantity, currentStock, status, notes, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error upserting reorder level:", error);
    res.status(500).json({ message: "Failed to save reorder level", error: error.message });
  }
};

// @desc    Delete reorder level
// @route   DELETE /api/reorder-levels/:id
// @access  Private
const deleteReorderLevel = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`DELETE FROM "ReorderLevels" WHERE "Id" = $1`, [id]);
    res.json({ message: "Reorder level deleted successfully" });
  } catch (error) {
    console.error("Error deleting reorder level:", error);
    res.status(500).json({ message: "Failed to delete reorder level", error: error.message });
  }
};

// @desc    Get reorder alerts
// @route   GET /api/reorder-levels/alerts
// @access  Private
const getReorderAlerts = async (req, res) => {
  try {
    const result = await appPool.query(
      `SELECT rl.*, p."ProductName", p."SKU", w."WarehouseName",
              ps."Quantity" as "CurrentStock"
       FROM "ReorderLevels" rl
       LEFT JOIN "Products" p ON rl."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON rl."WarehouseId" = w."Id"
       LEFT JOIN "ProductStockPerWarehouse" ps ON rl."ProductId" = ps."ProductId" AND rl."WarehouseId" = ps."WarehouseId"
       WHERE rl."IsActive" = TRUE
         AND (ps."Quantity" <= rl."ReorderPoint" OR rl."Status" IN ('Critical', 'Reorder'))
       ORDER BY 
         CASE rl."Status" 
           WHEN 'Critical' THEN 1 
           WHEN 'Reorder' THEN 2 
           ELSE 3 
         END,
         rl."UpdatedAt" DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching reorder alerts:", error);
    res.status(500).json({ message: "Failed to fetch reorder alerts", error: error.message });
  }
};

// @desc    Auto replenish stock
// @route   POST /api/reorder-levels/auto-replenish
// @access  Private
const autoReplenish = async (req, res) => {
  try {
    const { reorderLevelId } = req.body;
    const userId = req.user?.UserId;

    // Get reorder level details
    const reorderResult = await appPool.query(
      `SELECT rl.*, p."ProductName", p."SKU", w."WarehouseName"
       FROM "ReorderLevels" rl
       LEFT JOIN "Products" p ON rl."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON rl."WarehouseId" = w."Id"
       WHERE rl."Id" = $1`,
      [reorderLevelId]
    );

    if (reorderResult.rows.length === 0) {
      return res.status(404).json({ message: "Reorder level not found" });
    }

    const reorder = reorderResult.rows[0];

    // Create purchase requisition
    const prResult = await appPool.query(
      `INSERT INTO "PurchaseRequisitions" ("ProductId", "WarehouseId", "Quantity", "RequiredBy", "Priority", "Status", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, 'High', 'Pending', $5, $6, $6)
       RETURNING *`,
      [reorder.ProductId, reorder.WarehouseId, reorder.ReorderQuantity, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), `Auto-replenishment for ${reorder.ProductName}`, userId]
    );

    // Update reorder level
    await appPool.query(
      `UPDATE "ReorderLevels" SET "LastReorderDate" = CURRENT_TIMESTAMP, "Status" = 'Ordered', "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, reorderLevelId]
    );

    // Add to history
    await appPool.query(
      `INSERT INTO "ReorderHistory" ("ProductId", "WarehouseId", "ReorderLevelId", "ActionType", "Quantity", "StockBefore", "StockAfter", "TriggeredBy", "Notes", "CreatedBy")
       VALUES ($1, $2, $3, 'AutoReplenish', $4, $5, $5, 'System', $6, $7)`,
      [reorder.ProductId, reorder.WarehouseId, reorderLevelId, reorder.ReorderQuantity, reorder.CurrentStock, `Auto-created PR for ${reorder.ReorderQuantity} units`, userId]
    );

    res.json({ 
      message: "Auto-replenishment initiated successfully",
      purchaseRequisition: prResult.rows[0]
    });
  } catch (error) {
    console.error("Error auto replenishing:", error);
    res.status(500).json({ message: "Failed to auto replenish", error: error.message });
  }
};

// @desc    Get reorder history
// @route   GET /api/reorder-levels/history
// @access  Private
const getReorderHistory = async (req, res) => {
  try {
    const { productId, warehouseId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT rh.*, p."ProductName", p."SKU", w."WarehouseName"
      FROM "ReorderHistory" rh
      LEFT JOIN "Products" p ON rh."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON rh."WarehouseId" = w."Id"
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += ` AND rh."ProductId" = $${params.length + 1}`;
      params.push(productId);
    }
    if (warehouseId) {
      query += ` AND rh."WarehouseId" = $${params.length + 1}`;
      params.push(warehouseId);
    }

    query += ` ORDER BY rh."CreatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching reorder history:", error);
    res.status(500).json({ message: "Failed to fetch reorder history", error: error.message });
  }
};

module.exports = {
  getAllReorderLevels,
  getReorderLevelById,
  upsertReorderLevel,
  deleteReorderLevel,
  getReorderAlerts,
  autoReplenish,
  getReorderHistory,
};