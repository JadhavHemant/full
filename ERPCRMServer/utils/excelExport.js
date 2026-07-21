/**
 * Excel Export Utility
 * Generates CSV/Excel-compatible data for export
 */

const generateCSV = (data, columns) => {
  if (!data || data.length === 0) return '';
  const headers = columns.map(c => c.label || c.key).join(',');
  const rows = data.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
  });
  return [headers, ...rows].join('\n');
};

const generateJSON = (data) => {
  return JSON.stringify(data, null, 2);
};

const generateExcelCompatibleCSV = (data, columns, filename = 'export.csv') => {
  const csv = generateCSV(data, columns);
  return {
    filename,
    contentType: 'text/csv; charset=utf-8',
    content: '\uFEFF' + csv, // BOM for Excel UTF-8
  };
};

// Product export columns
const productColumns = [
  { key: 'Id', label: 'ID' },
  { key: 'ProductName', label: 'Product Name' },
  { key: 'ProductCode', label: 'Product Code' },
  { key: 'SKU', label: 'SKU' },
  { key: 'Barcode', label: 'Barcode' },
  { key: 'HSNCode', label: 'HSN Code' },
  { key: 'Price', label: 'Price' },
  { key: 'Cost', label: 'Cost' },
  { key: 'StockQuantity', label: 'Stock Quantity' },
  { key: 'MinimumStock', label: 'Min Stock' },
  { key: 'ReorderLevel', label: 'Reorder Level' },
  { key: 'IsActive', label: 'Active' },
];

// Sales Order export columns
const salesOrderColumns = [
  { key: 'Id', label: 'ID' },
  { key: 'OrderNumber', label: 'Order Number' },
  { key: 'CustomerName', label: 'Customer' },
  { key: 'OrderDate', label: 'Order Date' },
  { key: 'Status', label: 'Status' },
  { key: 'SubTotal', label: 'Sub Total' },
  { key: 'TaxAmount', label: 'Tax' },
  { key: 'GrandTotal', label: 'Grand Total' },
];

// Purchase Order export columns
const purchaseOrderColumns = [
  { key: 'Id', label: 'ID' },
  { key: 'OrderNumber', label: 'Order Number' },
  { key: 'SupplierName', label: 'Supplier' },
  { key: 'OrderDate', label: 'Order Date' },
  { key: 'Status', label: 'Status' },
  { key: 'GrandTotal', label: 'Grand Total' },
];

// Customer export columns
const customerColumns = [
  { key: 'Id', label: 'ID' },
  { key: 'CustomerName', label: 'Customer Name' },
  { key: 'Email', label: 'Email' },
  { key: 'Phone', label: 'Phone' },
  { key: 'City', label: 'City' },
  { key: 'State', label: 'State' },
  { key: 'IsActive', label: 'Active' },
];

// Supplier export columns
const supplierColumns = [
  { key: 'Id', label: 'ID' },
  { key: 'SupplierName', label: 'Supplier Name' },
  { key: 'Email', label: 'Email' },
  { key: 'Phone', label: 'Phone' },
  { key: 'City', label: 'City' },
  { key: 'State', label: 'State' },
  { key: 'IsActive', label: 'Active' },
];

module.exports = {
  generateCSV,
  generateJSON,
  generateExcelCompatibleCSV,
  productColumns,
  salesOrderColumns,
  purchaseOrderColumns,
  customerColumns,
  supplierColumns
};