const { appPool } = require("../../config/db");

// ──────────────────────────────────────────────
// Helper: FIFO/LIFO/Weighted Average costing engine
// ──────────────────────────────────────────────

/**
 * Calculate FIFO cost for a given product/warehouse.
 * Uses stock movement layers (receipts) and matches them against current stock.
 */
const calculateFIFO = (movements, currentQty) => {
  if (currentQty <= 0) return 0;

  let remaining = currentQty;
  let totalCost = 0;

  for (const m of movements) {
    if (m.Quantity > 0 && (m.UnitCost || 0) > 0) {
      const layerQty = Math.min(remaining, m.Quantity);
      totalCost += layerQty * parseFloat(m.UnitCost);
      remaining -= layerQty;
      if (remaining <= 0) break;
    }
  }

  return remaining > 0 ? 0 : totalCost / currentQty;
};

/**
 * Calculate LIFO cost for a given product/warehouse.
 */
const calculateLIFO = (movements, currentQty) => {
  if (currentQty <= 0) return 0;

  let remaining = currentQty;
  let totalCost = 0;

  const receipts = movements
    .filter(m => m.Quantity > 0 && (m.UnitCost || 0) > 0)
    .reverse();

  for (const m of receipts) {
    const layerQty = Math.min(remaining, m.Quantity);
    totalCost += layerQty * parseFloat(m.UnitCost);
    remaining -= layerQty;
    if (remaining <= 0) break;
  }

  return remaining > 0 ? 0 : totalCost / currentQty;
};

/**
 * Calculate Weighted Average cost for a given product/warehouse.
 */
const calculateWeightedAverage = (movements) => {
  let totalValue = 0;
  let totalQty = 0;

  for (const m of movements) {
    if (m.Quantity > 0 && (m.UnitCost || 0) > 0) {
      totalValue += m.Quantity * parseFloat(m.UnitCost);
      totalQty += m.Quantity;
    }
  }

  return totalQty > 0 ? totalValue / totalQty : 0;
};

// ──────────────────────────────────────────────
// Controllers
// ──────────────────────────────────────────────

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

    for (const stock of stockResult.rows) {
      // Get stock movements for costing calculation (receipts only for FIFO/LIFO)
      const movements = await appPool.query(
        `SELECT * FROM "StockMovements"
         WHERE "ProductId" = $1 AND "WarehouseId" = $2
         ORDER BY "CreatedAt" ASC`,
        [stock.ProductId, stock.WarehouseId]
      );

      const method = costingMethod || 'WeightedAverage';
      let currentCost = 0;
      let averageCost = 0;
      let fifoCost = 0;
      let lifoCost = 0;

      if (movements.rows.length > 0) {
        // Calculate all costing methods
        averageCost = calculateWeightedAverage(movements.rows);
        fifoCost = calculateFIFO(movements.rows, stock.Quantity);
        lifoCost = calculateLIFO(movements.rows, stock.Quantity);

        // Set current cost based on selected method
        switch (method) {
          case 'FIFO':
            currentCost = fifoCost;
            break;
          case 'LIFO':
            currentCost = lifoCost;
            break;
          case 'Standard': {
            const existing = await appPool.query(
              `SELECT "StandardCost" FROM "StockValuation" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
              [stock.ProductId, stock.WarehouseId]
            );
            currentCost = existing.rows.length > 0 ? parseFloat(existing.rows[0].StandardCost) : 0;
            break;
          }
          case 'WeightedAverage':
          default:
            currentCost = averageCost;
            break;
        }
      }

      const totalValue = currentCost * stock.Quantity;

      await appPool.query(
        `INSERT INTO "StockValuation"
         ("ProductId", "WarehouseId", "CostingMethod", "CurrentCost", "AverageCost",
          "FIFOCost", "LIFOCost", "TotalStock", "TotalValue", "LastCalculatedAt",
          "CreatedBy", "UpdatedBy")
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
        [stock.ProductId, stock.WarehouseId, method, currentCost, averageCost,
         fifoCost, lifoCost, stock.Quantity, totalValue, userId]
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
    const { warehouseId, productId, categoryId, dateFrom, dateTo, export: exportFormat } = req.query;

    let query = `
      SELECT
        w."WarehouseName",
        COUNT(sv."Id") as total_products,
        SUM(sv."TotalStock") as total_stock,
        SUM(sv."TotalValue") as total_value,
        AVG(sv."AverageCost") as avg_cost
      FROM "StockValuation" sv
      LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
      LEFT JOIN "Products" p ON sv."ProductId" = p."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (warehouseId) { idx++; query += ` AND sv."WarehouseId" = $${idx}`; params.push(warehouseId); }
    if (productId) { idx++; query += ` AND sv."ProductId" = $${idx}`; params.push(productId); }
    if (categoryId) { idx++; query += ` AND p."CategoryId" = $${idx}`; params.push(categoryId); }
    if (dateFrom) { idx++; query += ` AND sv."LastCalculatedAt" >= $${idx}`; params.push(dateFrom); }
    if (dateTo) { idx++; query += ` AND sv."LastCalculatedAt" <= $${idx}`; params.push(dateTo); }

    query += ` GROUP BY w."Id", w."WarehouseName" ORDER BY total_value DESC`;

    const result = await appPool.query(query, params);

    if (exportFormat) {
      return res.json({
        exportData: result.rows,
        format: exportFormat,
        filters: { warehouseId, productId, categoryId, dateFrom, dateTo }
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching valuation report:", error);
    res.status(500).json({ message: "Failed to fetch valuation report", error: error.message });
  }
};

// @desc    Get detailed valuation report (per-product breakdown)
// @route   GET /api/stock-valuation/report/detailed
// @access  Private
const getDetailedValuationReport = async (req, res) => {
  try {
    const { warehouseId, productId, categoryId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        sv.*,
        p."ProductName", p."SKU", p."ProductCode",
        w."WarehouseName",
        c."CategoryName"
      FROM "StockValuation" sv
      LEFT JOIN "Products" p ON sv."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
      LEFT JOIN "ProductCategories" c ON p."CategoryId" = c."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (warehouseId) { idx++; query += ` AND sv."WarehouseId" = $${idx}`; params.push(warehouseId); }
    if (productId) { idx++; query += ` AND sv."ProductId" = $${idx}`; params.push(productId); }
    if (categoryId) { idx++; query += ` AND p."CategoryId" = $${idx}`; params.push(categoryId); }

    query += ` ORDER BY sv."TotalValue" DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM "StockValuation" sv LEFT JOIN "Products" p ON sv."ProductId" = p."Id" WHERE 1=1`;
    const countParams = [];
    let countIdx = 0;

    if (warehouseId) { countIdx++; countQuery += ` AND sv."WarehouseId" = $${countIdx}`; countParams.push(warehouseId); }
    if (productId) { countIdx++; countQuery += ` AND sv."ProductId" = $${countIdx}`; countParams.push(productId); }
    if (categoryId) { countIdx++; countQuery += ` AND p."CategoryId" = $${countIdx}`; countParams.push(categoryId); }

    const countResult = await appPool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching detailed valuation report:", error);
    res.status(500).json({ message: "Failed to fetch detailed valuation report", error: error.message });
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

// @desc    Export stock valuation report
// @route   GET /api/stock-valuation/export
// @access  Private
const exportValuationReport = async (req, res) => {
  try {
    const { warehouseId, format = 'json' } = req.query;

    let query = `
      SELECT
        sv."Id",
        p."ProductName",
        p."SKU",
        w."WarehouseName",
        sv."CostingMethod",
        sv."CurrentCost",
        sv."AverageCost",
        sv."FIFOCost",
        sv."LIFOCost",
        sv."TotalStock",
        sv."TotalValue",
        sv."LastCalculatedAt"
      FROM "StockValuation" sv
      LEFT JOIN "Products" p ON sv."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON sv."WarehouseId" = w."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (warehouseId) { idx++; query += ` AND sv."WarehouseId" = $${idx}`; params.push(warehouseId); }

    query += ` ORDER BY sv."TotalValue" DESC`;

    const result = await appPool.query(query, params);

    if (format === 'csv') {
      const headers = ['Id', 'Product', 'SKU', 'Warehouse', 'CostingMethod', 'CurrentCost', 'AverageCost', 'FIFOCost', 'LIFOCost', 'TotalStock', 'TotalValue', 'LastCalculatedAt'];
      const csvRows = [headers.join(',')];
      for (const row of result.rows) {
        csvRows.push([
          row.Id,
          `"${row.ProductName || ''}"`,
          `"${row.SKU || ''}"`,
          `"${row.WarehouseName || ''}"`,
          `"${row.CostingMethod || ''}"`,
          row.CurrentCost,
          row.AverageCost,
          row.FIFOCost,
          row.LIFOCost,
          row.TotalStock,
          row.TotalValue,
          row.LastCalculatedAt
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stock-valuation-report.csv"`);
      return res.send(csvRows.join('\n'));
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Error exporting valuation report:", error);
    res.status(500).json({ message: "Failed to export valuation report", error: error.message });
  }
};

module.exports = {
  getAllStockValuations,
  getStockValuationById,
  calculateStockValuation,
  getValuationReport,
  getDetailedValuationReport,
  exportValuationReport,
  upsertCostingMethod,
  getCostingMethods,
};
