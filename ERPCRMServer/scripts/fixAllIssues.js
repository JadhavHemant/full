const fs = require('fs');
const path = require('path');

// Fix purchaseRequisitions.js - fix Users.Id to Users.UserId
const fixFile = (relPath, replacements) => {
  const filePath = path.join(__dirname, '..', relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${relPath}`);
};

// Fix purchaseRequisitions.js
fixFile('controllers/InventoryApis/purchaseRequisitions.js', [
  ['u.Id', 'u."UserId"'],
  ['pr.IsDeleted = 0', 'pr."IsDeleted" = false'],
  ['pr.RequestedById', 'pr."RequestedById"'],
  ['pr.RequisitionNumber', 'pr."RequisitionNumber"'],
  ['pr.Status', 'pr."Status"'],
  ['pr.CompanyId', 'pr."CompanyId"'],
  ['pr.Priority', 'pr."Priority"'],
  ['pr.CreatedAt', 'pr."CreatedAt"'],
  ['pr.Id', 'pr."Id"'],
  ['pri.RequisitionId', 'pri."RequisitionId"'],
  ['pri.IsDeleted = 0', 'pri."IsDeleted" = false'],
  ['pri.ProductId', 'pri."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
]);

// Fix purchaseReturns.js
fixFile('controllers/InventoryApis/purchaseReturns.js', [
  ['pr.IsDeleted = 0', 'pr."IsDeleted" = false'],
  ['pr.ReturnNumber', 'pr."ReturnNumber"'],
  ['pr.PurchaseOrderId', 'pr."PurchaseOrderId"'],
  ['pr.SupplierId', 'pr."SupplierId"'],
  ['pr.CompanyId', 'pr."CompanyId"'],
  ['pr.Status', 'pr."Status"'],
  ['pr.CreatedAt', 'pr."CreatedAt"'],
  ['pr.Id', 'pr."Id"'],
  ['pri.ReturnId', 'pri."ReturnId"'],
  ['pri.IsDeleted = 0', 'pri."IsDeleted" = false'],
  ['pri.ProductId', 'pri."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
]);

// Fix salesQuotations.js
fixFile('controllers/InventoryApis/salesQuotations.js', [
  ['sq.IsDeleted = 0', 'sq."IsDeleted" = false'],
  ['sq.QuotationNumber', 'sq."QuotationNumber"'],
  ['sq.CustomerId', 'sq."CustomerId"'],
  ['sq.CompanyId', 'sq."CompanyId"'],
  ['sq.Status', 'sq."Status"'],
  ['sq.CreatedAt', 'sq."CreatedAt"'],
  ['sq.Id', 'sq."Id"'],
  ['sqi.QuotationId', 'sqi."QuotationId"'],
  ['sqi.IsDeleted = 0', 'sqi."IsDeleted" = false'],
  ['sqi.ProductId', 'sqi."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
  ['c.Name', 'c."CustomerName"'],
  ['c.Id', 'c."Id"'],
]);

// Fix deliveryChallans.js
fixFile('controllers/InventoryApis/deliveryChallans.js', [
  ['dc.IsDeleted = 0', 'dc."IsDeleted" = false'],
  ['dc.ChallanNumber', 'dc."ChallanNumber"'],
  ['dc.SalesOrderId', 'dc."SalesOrderId"'],
  ['dc.CustomerId', 'dc."CustomerId"'],
  ['dc.CompanyId', 'dc."CompanyId"'],
  ['dc.Status', 'dc."Status"'],
  ['dc.CreatedAt', 'dc."CreatedAt"'],
  ['dc.Id', 'dc."Id"'],
  ['dci.ChallanId', 'dci."ChallanId"'],
  ['dci.IsDeleted = 0', 'dci."IsDeleted" = false'],
  ['dci.ProductId', 'dci."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
]);

// Fix salesReturns.js
fixFile('controllers/InventoryApis/salesReturns.js', [
  ['sr.IsDeleted = 0', 'sr."IsDeleted" = false'],
  ['sr.ReturnNumber', 'sr."ReturnNumber"'],
  ['sr.SalesOrderId', 'sr."SalesOrderId"'],
  ['sr.CustomerId', 'sr."CustomerId"'],
  ['sr.CompanyId', 'sr."CompanyId"'],
  ['sr.Status', 'sr."Status"'],
  ['sr.CreatedAt', 'sr."CreatedAt"'],
  ['sr.Id', 'sr."Id"'],
  ['sri.ReturnId', 'sri."ReturnId"'],
  ['sri.IsDeleted = 0', 'sri."IsDeleted" = false'],
  ['sri.ProductId', 'sri."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
]);

// Fix production.js
fixFile('controllers/InventoryApis/production.js', [
  ['b.IsDeleted = 0', 'b."IsDeleted" = false'],
  ['b.BOMCode', 'b."BOMCode"'],
  ['b.ProductId', 'b."ProductId"'],
  ['b.ProductName', 'b."ProductName"'],
  ['b.CompanyId', 'b."CompanyId"'],
  ['b.CreatedAt', 'b."CreatedAt"'],
  ['b.Id', 'b."Id"'],
  ['bi.BOMId', 'bi."BOMId"'],
  ['bi.IsDeleted = 0', 'bi."IsDeleted" = false'],
  ['bi.ProductId', 'bi."ProductId"'],
  ['p.Name', 'p."ProductName"'],
  ['p.Id', 'p."Id"'],
  ['po.IsDeleted = 0', 'po."IsDeleted" = false'],
  ['po.OrderNumber', 'po."OrderNumber"'],
  ['po.BOMId', 'po."BOMId"'],
  ['po.ProductId', 'po."ProductId"'],
  ['po.CompanyId', 'po."CompanyId"'],
  ['po.Status', 'po."Status"'],
  ['po.CreatedAt', 'po."CreatedAt"'],
  ['po.Id', 'po."Id"'],
]);

// Fix notifications.js (approvals)
fixFile('controllers/InventoryApis/notifications.js', [
  ['aw.RequestedById', 'aw."WorkflowName"'],
  ['aw.IsDeleted = 0', 'aw."IsActive" = true'],
]);

// Fix dashboard.js remaining unquoted queries
fixFile('controllers/InventoryApis/dashboard.js', [
  ['SELECT COUNT(*) AS Total FROM Products WHERE IsDeleted = 0', 'SELECT COUNT(*) AS "Total" FROM "Products" WHERE "IsDelete" = false'],
  ['SELECT COUNT(*) AS Total FROM Suppliers WHERE IsDeleted = 0', 'SELECT COUNT(*) AS "Total" FROM "Suppliers" WHERE "IsDeleted" = false'],
  ['SELECT COUNT(*) AS Total FROM Customers WHERE IsDeleted = 0', 'SELECT COUNT(*) AS "Total" FROM "Customers" WHERE "IsDeleted" = false'],
  ["SELECT COUNT(*) AS Total FROM ApprovalWorkflows WHERE Status = 'Pending'", 'SELECT COUNT(*) AS "Total" FROM "ApprovalWorkflows" WHERE "IsActive" = true'],
  ['SELECT COUNT(*) AS Total FROM Notifications WHERE IsRead = 0', 'SELECT COUNT(*) AS "Total" FROM "Notifications" WHERE "IsRead" = false'],
  ['SELECT Status, COUNT(*) AS Count FROM PurchaseOrders WHERE IsDeleted = 0', 'SELECT "Status", COUNT(*) AS "Count" FROM "PurchaseOrders" WHERE "IsDeleted" = false'],
  ['SELECT Status, COUNT(*) AS Count FROM SalesOrders WHERE IsDeleted = 0', 'SELECT "Status", COUNT(*) AS "Count" FROM "SalesOrders" WHERE "IsDeleted" = false'],
  ['SELECT TO_CHAR(OrderDate', 'SELECT TO_CHAR("OrderDate"'],
  ["'YYYY-MM') AS Month, COUNT(*) AS Orders, COALESCE(SUM(GrandTotal), 0) AS Revenue", '"YYYY-MM") AS "Month", COUNT(*) AS "Orders", COALESCE(SUM("GrandTotal"), 0) AS "Revenue"'],
  ['FROM SalesOrders', 'FROM "SalesOrders"'],
  ['WHERE IsDeleted = 0 AND OrderDate', 'WHERE "IsDeleted" = false AND "OrderDate"'],
  ["GROUP BY TO_CHAR(OrderDate", 'GROUP BY TO_CHAR("OrderDate"'],
  ['ORDER BY Month', 'ORDER BY "Month"'],
  ["'YYYY-MM') AS Month, COUNT(*) AS Orders, COALESCE(SUM(GrandTotal), 0) AS Spent", '"YYYY-MM") AS "Month", COUNT(*) AS "Orders", COALESCE(SUM("GrandTotal"), 0) AS "Spent"'],
  ['FROM PurchaseOrders', 'FROM "PurchaseOrders"'],
  ['SELECT p.Name, COALESCE(SUM(soi.Quantity)', 'SELECT p."ProductName", COALESCE(SUM(soi."Quantity")'],
  ['0) AS TotalSold', '0) AS "TotalSold"'],
  ['FROM SalesOrderItems soi', 'FROM "SalesOrderItems" soi'],
  ['JOIN Products p ON soi.ProductId = p.Id', 'JOIN "Products" p ON soi."ProductId" = p."Id"'],
  ['JOIN SalesOrders so ON soi.SalesOrderId = so.Id', 'JOIN "SalesOrders" so ON soi."SalesOrderId" = so."Id"'],
  ['WHERE so.IsDeleted = 0 AND soi.IsDeleted = 0', 'WHERE so."IsDeleted" = false AND soi."IsDeleted" = false'],
  ['GROUP BY p.Name', 'GROUP BY p."ProductName"'],
  ['ORDER BY TotalSold DESC', 'ORDER BY "TotalSold" DESC'],
]);

console.log('\nAll fixes applied!');