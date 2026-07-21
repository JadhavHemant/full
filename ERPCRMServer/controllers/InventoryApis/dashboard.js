const { appPool } = require('../../config/db');
const { pgQuery } = require('../../utils/pgCompat');

const getDashboardStats = async (req, res) => {
  try {
    const { companyId } = req.query;
    let companyFilter = '';
    const params = [];
    let paramIdx = 0;
    if (companyId) {
      paramIdx++;
      companyFilter = ` AND p."CompanyId" = $${paramIdx}`;
      params.push(parseInt(companyId));
    }

    // Use appPool.query directly (PostgreSQL), NOT pgQuery (MSSQL compat)
    const stockValue = await appPool.query(
      `SELECT COALESCE(SUM(psw."Quantity" * p."Cost"), 0) AS "TotalStockValue",
              COALESCE(SUM(psw."Quantity"), 0) AS "TotalStockUnits"
       FROM "ProductStockPerWarehouse" psw
       JOIN "Products" p ON psw."ProductId" = p."Id"
       WHERE p."IsDelete" = false${companyFilter}`, params
    );

    const lowStock = await pgQuery(appPool,
      `SELECT COUNT(*) AS "LowStockCount"
       FROM "Products" p
       WHERE p."IsDelete" = false AND p."IsActive" = true
       AND EXISTS (SELECT 1 FROM "ProductStockPerWarehouse" psw WHERE psw."ProductId" = p."Id" AND psw."Quantity" <= p."ReorderLevel")
       ${companyFilter}`, params
    );

    const outOfStock = await pgQuery(appPool,
      `SELECT COUNT(*) AS "OutOfStockCount"
       FROM "Products" p
       WHERE p."IsDelete" = false AND p."IsActive" = true
       AND NOT EXISTS (SELECT 1 FROM "ProductStockPerWarehouse" psw WHERE psw."ProductId" = p."Id" AND psw."Quantity" > 0)
       ${companyFilter}`, params
    );

    const purchaseSummary = await pgQuery(appPool,
      `SELECT COUNT(*) AS "TotalOrders",
              COALESCE(SUM("TotalAmount"), 0) AS "TotalAmount",
              SUM(CASE WHEN "Status" = 'Pending' THEN 1 ELSE 0 END) AS "PendingOrders"
       FROM "PurchaseOrders"
       WHERE 1=1 ${companyFilter}`, params
    );

    const salesSummary = await pgQuery(appPool,
      `SELECT COUNT(*) AS "TotalOrders",
              COALESCE(SUM("TotalAmount"), 0) AS "TotalAmount",
              SUM(CASE WHEN "Status" = 'Pending' THEN 1 ELSE 0 END) AS "PendingOrders"
       FROM "SalesOrders"
       WHERE "IsDeleted" = false ${companyFilter}`, params
    );

    const recentTransactions = await pgQuery(appPool,
      `SELECT sm.*, p."ProductName" AS "ProductName", w."WarehouseName" AS "WarehouseName"
       FROM "StockMovements" sm
       LEFT JOIN "Products" p ON sm."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON sm."WarehouseId" = w."Id"
       WHERE sm."IsDeleted" = false
       ORDER BY sm."CreatedAt" DESC
       LIMIT 10`
    );

    const expiryAlerts = await pgQuery(appPool,
      `SELECT bs.*, p."ProductName" AS "ProductName", w."WarehouseName" AS "WarehouseName"
       FROM "BatchSerial" bs
       LEFT JOIN "Products" p ON bs."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON bs."WarehouseId" = w."Id"
       WHERE bs."IsDeleted" = false AND bs."ExpiryDate" IS NOT NULL
       AND bs."ExpiryDate" <= CURRENT_DATE + INTERVAL '30 days'
       AND bs."ExpiryDate" >= CURRENT_DATE
       ORDER BY bs."ExpiryDate" ASC
       LIMIT 10`
    );

    const totalProducts = await pgQuery(appPool,
      `SELECT COUNT(*) AS "Total" FROM "Products" WHERE "IsDelete" = false ${companyFilter}`, params
    );

    const totalSuppliers = await pgQuery(appPool,
      `SELECT COUNT(*) AS "Total" FROM "Suppliers" WHERE "IsDeleted" = false ${companyFilter}`, params
    );

    const totalCustomers = await pgQuery(appPool,
      `SELECT COUNT(*) AS "Total" FROM "Customers" WHERE "IsDeleted" = false ${companyFilter}`, params
    );

    const pendingApprovals = await pgQuery(appPool,
      `SELECT COUNT(*) AS "Total" FROM "ApprovalWorkflows" WHERE "IsActive" = true ${companyFilter}`, params
    );

    const unreadNotifications = await pgQuery(appPool,
      `SELECT COUNT(*) AS "Total" FROM "Notifications" WHERE "IsRead" = false ${companyFilter}`, params
    );

    const poByStatus = await pgQuery(appPool,
      `SELECT "Status", COUNT(*) AS "Count" FROM "PurchaseOrders" WHERE 1=1 ${companyFilter} GROUP BY "Status"`, params
    );

    const soByStatus = await pgQuery(appPool,
      `SELECT "Status", COUNT(*) AS "Count" FROM "SalesOrders" WHERE "IsDeleted" = false ${companyFilter} GROUP BY "Status"`, params
    );

    const monthlySales = await pgQuery(appPool,
      `SELECT TO_CHAR("OrderDate", 'YYYY-MM') AS "Month", COUNT(*) AS "Orders", COALESCE(SUM("TotalAmount"), 0) AS "Revenue"
       FROM "SalesOrders"
       WHERE "IsDeleted" = false AND "OrderDate" >= CURRENT_DATE - INTERVAL '6 months'
       ${companyFilter}
       GROUP BY TO_CHAR("OrderDate", 'YYYY-MM')
       ORDER BY "Month"`, params
    );

    const monthlyPurchases = await pgQuery(appPool,
      `SELECT TO_CHAR("OrderDate", 'YYYY-MM') AS "Month", COUNT(*) AS "Orders", COALESCE(SUM("TotalAmount"), 0) AS "Spent"
       FROM "PurchaseOrders"
       WHERE 1=1 AND "OrderDate" >= CURRENT_DATE - INTERVAL '6 months'
       ${companyFilter}
       GROUP BY TO_CHAR("OrderDate", 'YYYY-MM')
       ORDER BY "Month"`, params
    );

    const topProducts = await pgQuery(appPool,
      `SELECT p."ProductName", COALESCE(SUM(soi."Quantity"), 0) AS "TotalSold"
       FROM "SalesOrderItems" soi
       JOIN "Products" p ON soi."ProductId" = p."Id"
       JOIN "SalesOrders" so ON soi."SalesOrderId" = so."Id"
       WHERE so."IsDeleted" = false AND soi."IsDeleted" = false
       GROUP BY p."ProductName"
       ORDER BY "TotalSold" DESC
       LIMIT 5`
    );

    const rows = (result) => result.rows || result.recordset || [];
    const r = (result, idx = 0) => {
      const data = rows(result);
      return data.length > 0 ? data[idx] : {};
    };

    res.json({
      data: {
        totalStockValue: r(stockValue).TotalStockValue || 0,
        totalStockUnits: r(stockValue).TotalStockUnits || 0,
        lowStockCount: r(lowStock).LowStockCount || 0,
        outOfStockCount: r(outOfStock).OutOfStockCount || 0,
        totalProducts: r(totalProducts).Total || 0,
        totalSuppliers: r(totalSuppliers).Total || 0,
        totalCustomers: r(totalCustomers).Total || 0,
        purchaseSummary: r(purchaseSummary),
        salesSummary: r(salesSummary),
        recentTransactions: rows(recentTransactions),
        expiryAlerts: rows(expiryAlerts),
        pendingApprovals: r(pendingApprovals).Total || 0,
        unreadNotifications: r(unreadNotifications).Total || 0,
        poByStatus: rows(poByStatus),
        soByStatus: rows(soByStatus),
        monthlySales: rows(monthlySales),
        monthlyPurchases: rows(monthlyPurchases),
        topProducts: rows(topProducts),
      }
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: error.message });
  }
};

module.exports = { getDashboardStats };