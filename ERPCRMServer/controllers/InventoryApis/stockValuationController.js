const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { appPool } = require("../../config/db");

// @desc    Get all stock valuations
// @route   GET /api/stock-valuation
// @access  Private
const getAllStockValuations = async (req, res) => {
  try {
    const { productId, warehouseId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sv.*, p."ProductName", p."SKU", w."WarehouseName"
      FROM "StockValuation" sv
      LEFT JOIN "Products" p ON sv."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += ` AND sv."ProductId" = $${params.length + 1}`;
      params.push(productId);
    }
    if (warehouseId) {
      query += ` AND sv."WarehouseId" = $${params.length + 1}`;
      params.push(warehouseId);
    }

    query += ` ORDER BY sv."UpdatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching stock valuations:", error);
    res.status(500).json({ message: "Failed to fetch stock valuations", error: error.message });
  }
};

// @desc    Get stock valuation by ID
// @route   GET /api/stock-valuation/:id
// @access  Private
const getStockValuationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT sv.*, p."ProductName", p."SKU", w."WarehouseName"
       FROM "StockValuation" sv
       LEFT JOIN "Products" p ON sv."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
       WHERE sv."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Stock valuation not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching stock valuation:", error);
    res.status(500).json({ message: "Failed to fetch stock valuation", error: error.message });
  }
};

// @desc    Calculate stock valuation
// @route   POST /api/stock-valuation/calculate
// @access  Private
const calculateStockValuation = async (req, res) => {
  try {
    const { productId, warehouseId, costingMethod } = req.body;
    const userId = req.user?.UserId;

    // Get current stock
    let stockQuery = `
      SELECT ps."ProductId", ps."WarehouseId", ps."Quantity", p."ProductName", p."SKU", w."WarehouseName"
      FROM "ProductStockPerWarehouse" ps
      LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
      WHERE ps."Quantity" > 0
    `;
    const params = [];

    if (productId) {
      stockQuery += ` AND ps."ProductId" = $${params.length + 1}`;
      params.push(productId);
    }
    if (warehouseId) {
      stockQuery += ` AND ps."WarehouseId" = $${params.length + 1}`;
      params.push(warehouseId);
    }

    const stockResult = await appPool.query(stockQuery, params);

    // Calculate valuation for each product-warehouse combination
    for (const stock of stockResult.rows) {
      // Get stock movements for costing calculation
      const movements = await appPool.query(
        `SELECT * FROM "StockMovements"
         WHERE "ProductId" = $1 AND "WarehouseId" = $2
         ORDER BY "CreatedAt" ASC`,
        [stock.ProductId, stock.WarehouseId]
      );

      // Calculate costs based on method
      let currentCost = 0;
      let averageCost = 0;
      let fifoCost = 0;
      let lifoCost = 0;

      if (movements.rows.length > 0) {
        // Simple weighted average calculation
        let totalValue = 0;
        let totalQty = 0;

        movements.rows.forEach(movement => {
          if (movement.Quantity > 0) {
            totalValue += movement.Quantity * (movement.UnitCost || 0);
            totalQty += movement.Quantity;
          }
        });

        averageCost = totalQty > 0 ? totalValue / totalQty : 0;
        currentCost = averageCost;
        fifoCost = movements.rows[0]?.UnitCost || 0;
        lifoCost = movements.rows[movements.rows.length - 1]?.UnitCost || 0;
      }

      const totalValue = currentCost * stock.Quantity;

      // Upsert stock valuation
      await appPool.query(
        `INSERT INTO "StockValuation" ("ProductId", "WarehouseId", "CostingMethod", "CurrentCost", "AverageCost", "FIFOCost", "LIFOCost", "TotalStock", "TotalValue", "LastCalculatedAt", "CreatedBy", "UpdatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $10)
         ON CONFLICT ("ProductId", "WarehouseId")
         DO UPDATE SET
           "CostingMethod" = $3,
           "CurrentCost" = $4,
           "AverageCost" = $5,
           "FIFOCost" = $6,
           "LIFOCost" = $7,
           "TotalStock" = $8,
           "TotalValue" = $9,
           "LastCalculatedAt" = CURRENT_TIMESTAMP,
           "UpdatedBy" = $10`,
        [stock.ProductId, stock.WarehouseId, costingMethod || 'WeightedAverage', currentCost, averageCost, fifoCost, lifoCost, stock.Quantity, totalValue, userId]
      );
    }

    res.json({ message: "Stock valuation calculated successfully", count: stockResult.rows.length });
  } catch (error) {
    console.error("Error calculating stock valuation:", error);
    res.status(500).json({ message: "Failed to calculate stock valuation", error: error.message });
  }
};

// @desc    Get valuation report
// @route   GET /api/stock-valuation/report
// @access  Private
const getValuationReport = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    let query = `
      SELECT 
        w."WarehouseName",
        COUNT(sv."Id") as total_products,
        SUM(sv."TotalStock") as total_stock,
        SUM(sv."TotalValue") as total_value,
        AVG(sv."AverageCost") as avg_cost
      FROM "StockValuation" sv
      LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
      WHERE 1=1
    `;
    const params = [];

    if (warehouseId) {
      query += ` AND sv."WarehouseId" = $${params.length + 1}`;
      params.push(warehouseId);
    }

    query += ` GROUP BY w."Id", w."WarehouseName" ORDER BY total_value DESC`;

    const result = await appPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching valuation report:", error);
    res.status(500).json({ message: "Failed to fetch valuation report", error: error.message });
  }
};

// @desc    Create/Update costing method
// @route   POST /api/stock-valuation/costing-methods
// @access  Private
const upsertCostingMethod = async (req, res) => {
  try {
    const { companyId, methodName, methodCode, description, isDefault } = req.body;
    const userId = req.user?.UserId;

    if (isDefault) {
      await appPool.query(`UPDATE "CostingMethod" SET "IsDefault" = FALSE WHERE "CompanyId" = $1`, [companyId]);
    }

    const result = await appPool.query(
      `INSERT INTO "CostingMethod" ("CompanyId", "MethodName", "MethodCode", "Description", "IsDefault", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       ON CONFLICT ("CompanyId", "MethodCode")
       DO UPDATE SET "MethodName" = $2, "Description" = $4, "IsDefault" = $5, "UpdatedBy" = $6, "UpdatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [companyId, methodName, methodCode, description, isDefault, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error upserting costing method:", error);
    res.status(500).json({ message: "Failed to save costing method", error: error.message });
  }
};

// @desc    Get all costing methods
// @route   GET /api/stock-valuation/costing-methods
// @access  Private
const getCostingMethods = async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await appPool.query(
      `SELECT * FROM "CostingMethod" WHERE "CompanyId" = $1 ORDER BY "IsDefault" DESC, "MethodName" ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching costing methods:", error);
    res.status(500).json({ message: "Failed to fetch costing methods", error: error.message });
  }
};

module.exports = {
  getAllStockValuations,
  getStockValuationById,
  calculateStockValuation,
  getValuationReport,
  upsertCostingMethod,
  getCostingMethods,
};