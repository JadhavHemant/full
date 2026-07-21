/**
 * Notification link resolver for inventory modules.
 * Maps notification event types to inventory page routes.
 */
const inventoryNotificationLinks = {
  "inventory.stock": { path: "/Admin/ProductStock", label: "View Stock" },
  "inventory.product": { path: "/Admin/Product", label: "View Products" },
  "inventory.purchase": { path: "/Admin/PurchaseOrder", label: "View Purchase Orders" },
  "inventory.sales": { path: "/Admin/SalesOrder", label: "View Sales Orders" },
  "inventory.warehouse": { path: "/Admin/Warehouse", label: "View Warehouses" },
  "inventory.stock-transfer": { path: "/Admin/StockTransfers", label: "View Stock Transfers" },
  "inventory.stock-adjustment": { path: "/Admin/StockAdjustments", label: "View Stock Adjustments" },
  "inventory.batch": { path: "/Admin/Batches", label: "View Batches" },
  "inventory.serial": { path: "/Admin/SerialNumbers", label: "View Serial Numbers" },
  "inventory.grn": { path: "/Admin/GRN", label: "View GRN" },
  "inventory.brand": { path: "/Admin/Brands", label: "View Brands" },
};

export const resolveInventoryNotificationLink = (eventType) => {
  return inventoryNotificationLinks[eventType] || { path: "/Admin", label: "Dashboard" };
};

export default inventoryNotificationLinks;