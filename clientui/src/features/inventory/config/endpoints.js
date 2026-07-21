import { API_BASE_URL } from "../../../Components/Endpoint/Endpoint";

const INVENTORY_BASE = `${API_BASE_URL}`;

export const INVENTORY_ENDPOINTS = {
  productCategories: `${INVENTORY_BASE}/productcategory`,
  units: `${INVENTORY_BASE}/units`,
  products: `${INVENTORY_BASE}/products`,
  warehouses: `${INVENTORY_BASE}/warehouses`,
  productStock: `${INVENTORY_BASE}/product-stock`,
  stockMovements: `${INVENTORY_BASE}/stock-movements`,
  suppliers: `${INVENTORY_BASE}/suppliers`,
  purchaseOrders: `${INVENTORY_BASE}/purchase-orders`,
  purchaseOrderItems: `${INVENTORY_BASE}/purchase-order-items`,
  customers: `${INVENTORY_BASE}/customers`,
  salesOrders: `${INVENTORY_BASE}/sales-orders`,
  brands: `${INVENTORY_BASE}/brands`,
  taxes: `${INVENTORY_BASE}/taxes`,
  productTaxMap: `${INVENTORY_BASE}/product-tax-map`,
  auditLogs: `${INVENTORY_BASE}/audit-logs`,
  profitLossReports: `${INVENTORY_BASE}/profit-loss-reports`,
  stockTransfers: `${INVENTORY_BASE}/stock-transfers`,
  stockAdjustments: `${INVENTORY_BASE}/stock-adjustments`,
  grn: `${INVENTORY_BASE}/grn`,
  batches: `${INVENTORY_BASE}/batches`,
  serialNumbers: `${INVENTORY_BASE}/serial-numbers`,
  erpModules: `${INVENTORY_BASE}/erp`,
  dashboard: `${INVENTORY_BASE}/dashboard`,
};