const express = require('express');
const router = express.Router();
const { appPool } = require('../../../config/db');
const { generateBarcodeSVG, generateQRCodeSVG, generateBarcodeDataURL, generateQRCodeDataURL, generateProductCode, generateSKU } = require('../../../utils/barcodeGenerator');
const { generateCSV, generateExcelCompatibleCSV, productColumns, salesOrderColumns, purchaseOrderColumns, customerColumns, supplierColumns } = require('../../../utils/excelExport');
const { generateInvoiceHTML, generateSalesOrderHTML, generateStockReportHTML } = require('../../../utils/pdfReport');
const { generatePDF, generateDOCX, getFileHeaders } = require('../../../utils/fileExport');
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const ExcelJS = require('exceljs');

// ── Barcode & QR Code ──
router.get('/barcode/:data', (req, res) => {
  const { data } = req.params;
  const { width, height } = req.query;
  const svg = generateBarcodeSVG(decodeURIComponent(data), { width: parseInt(width)||200, height: parseInt(height)||80 });
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

router.get('/qrcode/:data', (req, res) => {
  const { data } = req.params;
  const { size } = req.query;
  const svg = generateQRCodeSVG(decodeURIComponent(data), { size: parseInt(size)||200 });
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

router.get('/barcode-url/:data', (req, res) => {
  const { data } = req.params;
  const url = generateBarcodeDataURL(decodeURIComponent(data));
  res.json({ dataUrl: url });
});

router.get('/qrcode-url/:data', (req, res) => {
  const { data } = req.params;
  const url = generateQRCodeDataURL(decodeURIComponent(data));
  res.json({ dataUrl: url });
});

router.get('/product-code', (req, res) => {
  const { prefix, id } = req.query;
  res.json({ productCode: generateProductCode(prefix||'PRD', parseInt(id)||0) });
});

router.get('/sku', (req, res) => {
  const { category, id } = req.query;
  res.json({ sku: generateSKU(category||'GEN', parseInt(id)||0) });
});

// ── Excel Export (CSV) ──
router.get('/export/products', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT * FROM "Products" WHERE "IsDelete" = false ORDER BY "Id"`);
    const exportData = generateExcelCompatibleCSV(result.rows, productColumns, 'products.csv');
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

router.get('/export/customers', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT * FROM "Customers" WHERE "IsDeleted" = false ORDER BY "Id"`);
    const exportData = generateExcelCompatibleCSV(result.rows, customerColumns, 'customers.csv');
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

router.get('/export/suppliers', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT * FROM "Suppliers" WHERE "IsDeleted" = false ORDER BY "Id"`);
    const exportData = generateExcelCompatibleCSV(result.rows, supplierColumns, 'suppliers.csv');
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

router.get('/export/sales-orders', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT * FROM "SalesOrders" WHERE "IsDeleted" = false ORDER BY "Id"`);
    const exportData = generateExcelCompatibleCSV(result.rows, salesOrderColumns, 'sales-orders.csv');
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

router.get('/export/purchase-orders', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT * FROM "PurchaseOrders" WHERE "IsDeleted" = false ORDER BY "Id"`);
    const exportData = generateExcelCompatibleCSV(result.rows, purchaseOrderColumns, 'purchase-orders.csv');
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

// ── PDF Reports (HTML) ──
router.get('/report/invoice/:id', verifyAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(`SELECT * FROM "Invoices" WHERE "Id" = $1`, [parseInt(id)]);
    if (!result.rows.length) return res.status(404).json({ message: 'Invoice not found' });
    const html = generateInvoiceHTML(result.rows[0]);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: 'Report failed', error: error.message });
  }
});

router.get('/report/sales-order/:id', verifyAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(`SELECT * FROM "SalesOrders" WHERE "Id" = $1`, [parseInt(id)]);
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    const html = generateSalesOrderHTML(result.rows[0]);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: 'Report failed', error: error.message });
  }
});

router.get('/report/stock', verifyAccessToken, async (req, res) => {
  try {
    const result = await appPool.query(`SELECT p."ProductName", p."ProductCode", COALESCE(SUM(psw."Quantity"), 0) AS "Quantity", p."ReorderLevel" FROM "Products" p LEFT JOIN "ProductStockPerWarehouse" psw ON p."Id" = psw."ProductId" WHERE p."IsDelete" = false GROUP BY p."Id", p."ProductName", p."ProductCode", p."ReorderLevel" ORDER BY p."ProductName"`);
    const html = generateStockReportHTML(result.rows);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: 'Report failed', error: error.message });
  }
});

// ── PDF / DOCX Export for any entity ──
router.get('/export/:entity/:format', verifyAccessToken, async (req, res) => {
  try {
    const { entity, format } = req.params;
    if (!['pdf', 'docx', 'csv', 'xlsx'].includes(format)) {
      return res.status(400).json({ message: `Unsupported format: ${format}. Supported: pdf, docx, csv, xlsx` });
    }

    // Define entity configs
    const entityConfigs = {
      products: {
        table: '"Products"',
        where: '"IsDelete" = false',
        orderBy: '"Id"',
        columns: productColumns,
        title: 'Products Export',
        headers: productColumns.map(c => c.label),
      },
      customers: {
        table: '"Customers"',
        where: '"IsDeleted" = false',
        orderBy: '"Id"',
        columns: customerColumns,
        title: 'Customers Export',
        headers: customerColumns.map(c => c.label),
      },
      suppliers: {
        table: '"Suppliers"',
        where: '"IsDeleted" = false',
        orderBy: '"Id"',
        columns: supplierColumns,
        title: 'Suppliers Export',
        headers: supplierColumns.map(c => c.label),
      },
      'sales-orders': {
        table: '"SalesOrders"',
        where: '"IsDeleted" = false',
        orderBy: '"Id"',
        columns: salesOrderColumns,
        title: 'Sales Orders Export',
        headers: salesOrderColumns.map(c => c.label),
      },
      'purchase-orders': {
        table: '"PurchaseOrders"',
        where: '"IsDeleted" = false',
        orderBy: '"Id"',
        columns: purchaseOrderColumns,
        title: 'Purchase Orders Export',
        headers: purchaseOrderColumns.map(c => c.label),
      },
    };

    const config = entityConfigs[entity];
    if (!config) return res.status(400).json({ message: `Unknown entity: ${entity}` });

    const result = await appPool.query(`SELECT * FROM ${config.table} WHERE ${config.where} ORDER BY ${config.orderBy}`);
    const data = result.rows;

    if (format === 'pdf') {
      const rows = data.map(row => config.columns.map(c => String(row[c.key] ?? '')));
      const buffer = await generatePDF({
        title: config.title,
        headers: config.headers,
        rows,
        footer: `Generated by ERP CRM System | ${data.length} records | ${new Date().toISOString()}`,
      });
      const headers = getFileHeaders(entity, 'pdf');
      res.set(headers);
      res.send(buffer);
    } else if (format === 'docx') {
      const rows = data.map(row => config.columns.map(c => String(row[c.key] ?? '')));
      const buffer = await generateDOCX({
        title: config.title,
        headers: config.headers,
        rows,
        footer: `Generated by ERP CRM System | ${data.length} records`,
      });
      const headers = getFileHeaders(entity, 'docx');
      res.set(headers);
      res.send(buffer);
    } else if (format === 'csv') {
      const exportData = generateExcelCompatibleCSV(data, config.columns, `${entity}.csv`);
      res.setHeader('Content-Type', exportData.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.content);
    } else if (format === 'xlsx') {
      // Generate proper XLSX using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(entity);
      
      // Style header
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } },
      };
      const headerRow = sheet.addRow(config.headers);
      headerRow.eachCell((cell) => { cell.style = headerStyle; });

      // Data
      data.forEach(row => {
        sheet.addRow(config.columns.map(c => row[c.key] ?? ''));
      });

      // Column widths
      config.headers.forEach((_, idx) => { sheet.getColumn(idx + 1).width = 20; });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}.xlsx"`);
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

// ── Bulk export with auto-population for migration (new user data transfer) ──
router.get('/export/bulk/:format', verifyAccessToken, async (req, res) => {
  try {
    const { format } = req.params;
    const entities = ['products', 'customers', 'suppliers', 'sales-orders', 'purchase-orders'];
    
    if (format === 'pdf') {
      // Generate a combined PDF with all entities
      const pdf = require('pdfkit');
      const doc = new pdf({ margin: 30, size: 'A4' });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="full-data-export.pdf"');
        res.send(buffer);
      });

      doc.fontSize(20).font('Helvetica-Bold').text('ERP CRM System - Full Data Export', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      for (const entity of entities) {
        const configMap = {
          products: { table: '"Products"', where: '"IsDelete" = false', columns: productColumns },
          customers: { table: '"Customers"', where: '"IsDeleted" = false', columns: customerColumns },
          suppliers: { table: '"Suppliers"', where: '"IsDeleted" = false', columns: supplierColumns },
          'sales-orders': { table: '"SalesOrders"', where: '"IsDeleted" = false', columns: salesOrderColumns },
          'purchase-orders': { table: '"PurchaseOrders"', where: '"IsDeleted" = false', columns: purchaseOrderColumns },
        };
        const cfg = configMap[entity];
        const result = await appPool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.where} ORDER BY "Id" LIMIT 100`);
        
        if (doc.y > 600) doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#4361ee').text(entity.toUpperCase(), { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('#333');
        result.rows.slice(0, 20).forEach(row => {
          const vals = cfg.columns.map(c => row[c.key] ?? '').join(' | ');
          doc.text(vals, { indent: 10 });
        });
        if (result.rows.length > 20) doc.text(`... and ${result.rows.length - 20} more records`);
        doc.moveDown(1);
      }
      doc.end();
    } else if (format === 'xlsx') {
      // Generate combined workbook with multiple sheets
      const workbook = new ExcelJS.Workbook();
      
      for (const entity of entities) {
        const configMap = {
          products: { table: '"Products"', where: '"IsDelete" = false', columns: productColumns, headers: productColumns.map(c => c.label) },
          customers: { table: '"Customers"', where: '"IsDeleted" = false', columns: customerColumns, headers: customerColumns.map(c => c.label) },
          suppliers: { table: '"Suppliers"', where: '"IsDeleted" = false', columns: supplierColumns, headers: supplierColumns.map(c => c.label) },
          'sales-orders': { table: '"SalesOrders"', where: '"IsDeleted" = false', columns: salesOrderColumns, headers: salesOrderColumns.map(c => c.label) },
          'purchase-orders': { table: '"PurchaseOrders"', where: '"IsDeleted" = false', columns: purchaseOrderColumns, headers: purchaseOrderColumns.map(c => c.label) },
        };
        const cfg = configMap[entity];
        const result = await appPool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.where} ORDER BY "Id"`);
        
        const sheet = workbook.addWorksheet(entity);
        const headerStyle = {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } },
        };
        const headerRow = sheet.addRow(cfg.headers);
        headerRow.eachCell((cell) => { cell.style = headerStyle; });
        result.rows.forEach(row => sheet.addRow(cfg.columns.map(c => row[c.key] ?? '')));
        cfg.headers.forEach((_, idx) => { sheet.getColumn(idx + 1).width = 18; });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="full-data-export.xlsx"');
      res.send(Buffer.from(buffer));
    } else {
      res.status(400).json({ message: 'Bulk export only supports pdf and xlsx formats' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Bulk export failed', error: error.message });
  }
});

module.exports = router;
