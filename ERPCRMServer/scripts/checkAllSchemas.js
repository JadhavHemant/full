const { appPool } = require('../config/db');
(async () => {
  const tables = [
    'PurchaseRequisitions', 'PurchaseRequisitionItems',
    'PurchaseReturns', 'PurchaseReturnItems',
    'SalesQuotations', 'SalesQuotationItems',
    'DeliveryChallans', 'DeliveryChallanItems',
    'SalesReturns', 'SalesReturnItems',
    'BOM', 'BOMItems',
    'ProductionOrders', 'ProductionTracking',
    'ApprovalWorkflows', 'ApprovalActions',
    'StockAdjustments', 'StockTransfers',
    'GRN', 'GRNItems'
  ];
  for (const t of tables) {
    try {
      const r = await appPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`${t}: ${r.rows.map(x => x.column_name).join(', ')}`);
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  await appPool.end();
})();