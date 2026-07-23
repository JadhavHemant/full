const { appPool } = require("../../config/db");
const { hierarchyAccess, getReportHierarchyFilter } = require("../../middleware/hierarchyAccessControl");

// @desc    Stock Aging Report
// @route   GET /api/reports/stock-aging
// @access  Private
const getStockAgingReport = async (req, res) => {
  const userHierarchy = req.userHierarchy;
  try {
    const { warehouseId, days = 90, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await appPool.query(`
      SELECT 
        p."Id" as "ProductId", p."ProductName", p."SKU",
        w."Id" as "WarehouseId", w."WarehouseName",
        ps."Quantity" as "CurrentStock",
        COALESCE(sm."LastMovementDate", p."CreatedAt") as "LastMovementDate",
        EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) as "DaysSinceLastMovement",
        CASE 
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) <= 30 THEN '0-30 Days'
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) <= 60 THEN '31-60 Days'
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) <= 90 THEN '61-90 Days'
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) <= 180 THEN '91-180 Days'
          ELSE '180+ Days'
        END as "AgingBucket",
        sv."TotalValue" as "StockValue"
      FROM "Products" p
      JOIN "ProductStockPerWarehouse" ps ON p."Id" = ps."ProductId"
      JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
      LEFT JOIN (
        SELECT "ProductId", "WarehouseId", MAX("CreatedAt") as "LastMovementDate"
        FROM "StockMovements" GROUP BY "ProductId", "WarehouseId"
      ) sm ON p."Id" = sm."ProductId" AND ps."WarehouseId" = sm."WarehouseId"
      LEFT JOIN "StockValuation" sv ON p."Id" = sv."ProductId" AND ps."WarehouseId" = sv."WarehouseId"
      WHERE ps."Quantity" > 0 ${warehouseId ? `AND ps."WarehouseId" = $1` : ''} ${getReportHierarchyFilter(userHierarchy, 'p."CreatedBy"')}
      ORDER BY "DaysSinceLastMovement" DESC
      LIMIT $${warehouseId ? 2 : 1} OFFSET $${warehouseId ? 3 : 2}
    `, warehouseId ? [warehouseId, limit, offset] : [limit, offset]);

    // Get aging summary
    const summary = await appPool.query(`
      SELECT 
        COUNT(*) as "TotalProducts",
        SUM(ps."Quantity") as "TotalStock",
        SUM(CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) <= 30 THEN ps."Quantity" ELSE 0 END) as "CurrentStock",
        SUM(CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) BETWEEN 31 AND 60 THEN ps."Quantity" ELSE 0 END) as "SlowMoving",
        SUM(CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) BETWEEN 61 AND 90 THEN ps."Quantity" ELSE 0 END) as "Moderate",
        SUM(CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) BETWEEN 91 AND 180 THEN ps."Quantity" ELSE 0 END) as "Aging",
        SUM(CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) > 180 THEN ps."Quantity" ELSE 0 END) as "Obsolete"
      FROM "Products" p
      JOIN "ProductStockPerWarehouse" ps ON p."Id" = ps."ProductId"
      LEFT JOIN (
        SELECT "ProductId", "WarehouseId", MAX("CreatedAt") as "LastMovementDate"
        FROM "StockMovements" GROUP BY "ProductId", "WarehouseId"
      ) sm ON p."Id" = sm."ProductId" AND ps."WarehouseId" = sm."WarehouseId"
      WHERE ps."Quantity" > 0 ${warehouseId ? `AND ps."WarehouseId" = $1` : ''} ${getReportHierarchyFilter(userHierarchy, 'p."CreatedBy"')}
    `, warehouseId ? [warehouseId] : []);

    res.json({ data: result.rows, summary: summary.rows[0], total: result.rows.length });
  } catch (error) {
    console.error("Error fetching stock aging report:", error);
    res.status(500).json({ message: "Failed to fetch stock aging report", error: error.message });
  }
};

// @desc    ABC Analysis Report
// @route   GET /api/reports/abc-analysis
// @access  Private
const getABCAnalysis = async (req, res) => {
  try {
    const { warehouseId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Calculate total sales value for each product
    const result = await appPool.query(`
      WITH ProductSales AS (
        SELECT 
          p."Id" as "ProductId", p."ProductName", p."SKU",
          COALESCE(SUM(soi."Quantity" * soi."UnitPrice"), 0) as "TotalSalesValue",
          COALESCE(SUM(soi."Quantity"), 0) as "TotalQuantity",
          COUNT(DISTINCT so."Id") as "OrderCount"
        FROM "Products" p
        LEFT JOIN "SalesOrderItems" soi ON p."Id" = soi."ProductId"
        LEFT JOIN "SalesOrders" so ON soi."SalesOrderId" = so."Id" AND so."IsDeleted" = false
        GROUP BY p."Id", p."ProductName", p."SKU"
      ),
      TotalValue AS (
        SELECT SUM("TotalSalesValue") as "GrandTotal" FROM ProductSales
      )
      SELECT 
        ps.*,
        CASE 
          WHEN ps."TotalSalesValue" >= (SELECT "GrandTotal" * 0.8 FROM TotalValue) THEN 'A'
          WHEN ps."TotalSalesValue" >= (SELECT "GrandTotal" * 0.95 FROM TotalValue) THEN 'B'
          ELSE 'C'
        END as "ABCCategory",
        ROUND(ps."TotalSalesValue" / NULLIF((SELECT "GrandTotal" FROM TotalValue), 0) * 100, 2) as "ValuePercentage",
        ROW_NUMBER() OVER (ORDER BY ps."TotalSalesValue" DESC) as "Rank"
      FROM ProductSales ps
      ORDER BY ps."TotalSalesValue" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get category summary
    const summary = await appPool.query(`
      WITH ProductSales AS (
        SELECT p."Id",
          COALESCE(SUM(soi."Quantity" * soi."UnitPrice"), 0) as "TotalSalesValue"
        FROM "Products" p
        LEFT JOIN "SalesOrderItems" soi ON p."Id" = soi."ProductId"
        LEFT JOIN "SalesOrders" so ON soi."SalesOrderId" = so."Id" AND so."IsDeleted" = false
        GROUP BY p."Id"
      ),
      TotalValue AS (SELECT SUM("TotalSalesValue") as "GrandTotal" FROM ProductSales)
      SELECT 
        CASE 
          WHEN ps."TotalSalesValue" >= (SELECT "GrandTotal" * 0.8 FROM TotalValue) THEN 'A'
          WHEN ps."TotalSalesValue" >= (SELECT "GrandTotal" * 0.95 FROM TotalValue) THEN 'B'
          ELSE 'C'
        END as "Category",
        COUNT(*) as "ProductCount",
        SUM(ps."TotalSalesValue") as "TotalValue",
        ROUND(SUM(ps."TotalSalesValue") / NULLIF((SELECT "GrandTotal" FROM TotalValue), 0) * 100, 2) as "ValuePercentage"
      FROM ProductSales ps
      GROUP BY "Category"
      ORDER BY "Category"
    `);

    res.json({ data: result.rows, summary: summary.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching ABC analysis:", error);
    res.status(500).json({ message: "Failed to fetch ABC analysis", error: error.message });
  }
};

// @desc    Slow Moving / Non-Moving Stock Report
// @route   GET /api/reports/slow-moving
// @access  Private
const getSlowMovingStock = async (req, res) => {
  try {
    const { warehouseId, days = 90, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await appPool.query(`
      SELECT 
        p."Id" as "ProductId", p."ProductName", p."SKU",
        w."WarehouseName",
        ps."Quantity" as "CurrentStock",
        COALESCE(sm."LastMovementDate", p."CreatedAt") as "LastMovementDate",
        EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) as "DaysSinceLastMovement",
        CASE 
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) > 180 THEN 'Non-Moving'
          WHEN EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) > 90 THEN 'Slow-Moving'
          ELSE 'Normal'
        END as "MovementStatus"
      FROM "Products" p
      JOIN "ProductStockPerWarehouse" ps ON p."Id" = ps."ProductId"
      JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
      LEFT JOIN (
        SELECT "ProductId", "WarehouseId", MAX("CreatedAt") as "LastMovementDate"
        FROM "StockMovements" GROUP BY "ProductId", "WarehouseId"
      ) sm ON p."Id" = sm."ProductId" AND ps."WarehouseId" = sm."WarehouseId"
      WHERE ps."Quantity" > 0
      AND EXTRACT(DAY FROM NOW() - COALESCE(sm."LastMovementDate", p."CreatedAt")) > $1
      ${warehouseId ? `AND ps."WarehouseId" = $2` : ''}
      ORDER BY "DaysSinceLastMovement" DESC
      LIMIT $${warehouseId ? 3 : 2} OFFSET $${warehouseId ? 4 : 3}
    `, warehouseId ? [days, warehouseId, limit, offset] : [days, limit, offset]);

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching slow moving stock:", error);
    res.status(500).json({ message: "Failed to fetch slow moving stock", error: error.message });
  }
};

// @desc    Vendor Performance Report
// @route   GET /api/reports/vendor-performance
// @access  Private
const getVendorPerformance = async (req, res) => {
  const userHierarchy = req.userHierarchy;
  try {
    const { supplierId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await appPool.query(`
      SELECT 
        s."Id" as "SupplierId", s."SupplierName", s."ContactPerson",
        COUNT(DISTINCT po."Id") as "TotalOrders",
        COALESCE(SUM(po."TotalAmount"), 0) as "TotalOrderValue",
        COUNT(DISTINCT CASE WHEN po."Status" = 'Delivered' THEN po."Id" END) as "CompletedOrders",
        COUNT(DISTINCT CASE WHEN po."Status" = 'Cancelled' THEN po."Id" END) as "CancelledOrders",
        COUNT(DISTINCT gr."Id") as "TotalGRNs",
        AVG(CASE 
          WHEN po."ExpectedDeliveryDate" IS NOT NULL AND gr."CreatedAt" IS NOT NULL 
          THEN EXTRACT(DAY FROM gr."CreatedAt" - po."ExpectedDeliveryDate")
          ELSE 0 
        END) as "AvgDeliveryDelayDays",
        COUNT(DISTINCT pr."Id") as "TotalReturns",
        COALESCE(SUM(pr."TotalAmount"), 0) as "TotalReturnValue"
      FROM "Suppliers" s
      LEFT JOIN "PurchaseOrders" po ON s."Id" = po."SupplierId"
      LEFT JOIN "GRN" gr ON po."Id" = gr."PurchaseOrderId"
      LEFT JOIN "PurchaseReturns" pr ON po."Id" = pr."PurchaseOrderId"
      WHERE s."IsDeleted" = false ${getReportHierarchyFilter(userHierarchy, 'po."CreatedBy"')}
      ${supplierId ? `AND s."Id" = $1` : ''}
      GROUP BY s."Id", s."SupplierName", s."ContactPerson"
      ORDER BY "TotalOrderValue" DESC
      LIMIT $${supplierId ? 2 : 1} OFFSET $${supplierId ? 3 : 2}
    `, supplierId ? [supplierId, limit, offset] : [limit, offset]);

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching vendor performance:", error);
    res.status(500).json({ message: "Failed to fetch vendor performance", error: error.message });
  }
};

module.exports = { getStockAgingReport, getABCAnalysis, getSlowMovingStock, getVendorPerformance };