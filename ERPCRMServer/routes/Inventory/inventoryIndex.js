/**
 * Inventory Routes Index
 * Centralized export of all inventory route modules
 */

const productCategoryRoutes = require('./productCategory/productCategory');
const UnitRoutes = require('./units/units');
const ProductsRoutes = require('./products/Product');
const warehousesRoutes = require('./warehouses/warehouses');
const productStock = require('./productStock.routes/productStock.routes');
const StockMovements = require('./stockMovements/stockMovements');
const Suppliers = require('./suppliers/suppliers');
const PurchaseOrders = require('./purchaseOrders/purchaseOrders');
const PurchaseOrderItems = require('./purchaseOrderItems/purchaseOrderItems.routes');
const Customers = require('./customersroutes/customersroutes');
const SalesOrders = require('./salesOrders/salesOrders');
const Taxes = require('./taxes/taxes');
const ProductTaxMap = require('./productTaxMap/productTaxMap');
const AuditLogs = require('./auditLogs/auditLogs');
const ProfitLossReports = require('./profitLossReports/profitLossReports.routes');
const BrandsRoutes = require('./brands/brands');
const StockTransfersRoutes = require('./stockTransfers/stockTransfers.routes');
const StockAdjustmentsRoutes = require('./stockAdjustments/stockAdjustments.routes');
const GRNRoutes = require('./grn/grn.routes');
const BatchSerialRoutes = require('./batchSerial/batchSerial.routes');
const erpModulesRoutes = require('./erpModules/erpModules.routes');
const exportRoutes = require('./utils/exportRoutes');
const StockValuationRoutes = require('./stockValuation/stockValuation.routes');
const ReorderLevelsRoutes = require('./reorderLevels/reorderLevels.routes');

// Optional routes — loaded conditionally to avoid boot failure if files don't exist
let FinancialYearsRoutes = null;
let DocumentsRoutes = null;
let EmailRoutes = null;
let AdvancedAuditRoutes = null;

try { FinancialYearsRoutes = require('./financialYears/financialYears.routes'); } catch (e) { /* not available */ }
try { DocumentsRoutes = require('./documents/documents.routes'); } catch (e) { /* not available */ }
try { EmailRoutes = require('./email/email.routes'); } catch (e) { /* not available */ }
try { AdvancedAuditRoutes = require('./advancedAudit/advancedAudit.routes'); } catch (e) { /* not available */ }

module.exports = {
  productCategoryRoutes,
  UnitRoutes,
  ProductsRoutes,
  warehousesRoutes,
  productStock,
  StockMovements,
  Suppliers,
  PurchaseOrders,
  PurchaseOrderItems,
  Customers,
  SalesOrders,
  Taxes,
  ProductTaxMap,
  AuditLogs,
  ProfitLossReports,
  BrandsRoutes,
  StockTransfersRoutes,
  StockAdjustmentsRoutes,
  GRNRoutes,
  BatchSerialRoutes,
  erpModulesRoutes,
  exportRoutes,
  StockValuationRoutes,
  ReorderLevelsRoutes,
  FinancialYearsRoutes,
  DocumentsRoutes,
  EmailRoutes,
  AdvancedAuditRoutes,
};
