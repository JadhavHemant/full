/**
 * Data Import Routes
 * Handles importing data from CSV, Excel, PDF, DOCX files with auto-mapping
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { appPool } = require('../../../config/db');
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── Import Configuration: Column Mappings & Auto-Population Rules ──
const importConfigs = {
  products: {
    table: '"Products"',
    uniqueKey: 'ProductCode',
    defaultValues: { IsActive: true, IsDelete: false, StockQuantity: 0, ReorderLevel: 5 },
    columnMapping: [
      { source: 'ProductName', target: 'ProductName', required: true },
      { source: 'ProductCode', target: 'ProductCode', required: true },
      { source: 'SKU', target: 'SKU' },
      { source: 'Barcode', target: 'Barcode' },
      { source: 'HSNCode', target: 'HSNCode' },
      { source: 'Price', target: 'Price', type: 'number' },
      { source: 'Cost', target: 'Cost', type: 'number' },
      { source: 'StockQuantity', target: 'StockQuantity', type: 'number' },
      { source: 'MinimumStock', target: 'MinimumStock', type: 'number' },
      { source: 'ReorderLevel', target: 'ReorderLevel', type: 'number' },
      { source: 'IsActive', target: 'IsActive', type: 'boolean' },
      { source: 'CategoryId', target: 'CategoryId', type: 'number' },
      { source: 'CategoryName', target: 'CategoryId', type: 'lookup', lookupTable: '"ProductCategories"', lookupField: 'CategoryName', returnField: 'Id' },
    ],
    autoCalculations: [
      { target: 'ProductCode', logic: (row) => row.ProductCode || `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
    ],
  },
  customers: {
    table: '"Customers"',
    uniqueKey: 'Email',
    defaultValues: { IsDeleted: false, IsActive: true },
    columnMapping: [
      { source: 'CustomerName', target: 'CustomerName', required: true },
      { source: 'Email', target: 'Email', required: true },
      { source: 'Phone', target: 'Phone' },
      { source: 'Address', target: 'Address' },
      { source: 'City', target: 'City' },
      { source: 'State', target: 'State' },
      { source: 'Pincode', target: 'Pincode' },
      { source: 'GSTIN', target: 'GSTIN' },
      { source: 'Country', target: 'Country' },
      { source: 'IsActive', target: 'IsActive', type: 'boolean' },
    ],
    autoCalculations: [],
  },
  suppliers: {
    table: '"Suppliers"',
    uniqueKey: 'Email',
    defaultValues: { IsDeleted: false, IsActive: true },
    columnMapping: [
      { source: 'SupplierName', target: 'SupplierName', required: true },
      { source: 'Email', target: 'Email', required: true },
      { source: 'Phone', target: 'Phone' },
      { source: 'Address', target: 'Address' },
      { source: 'City', target: 'City' },
      { source: 'State', target: 'State' },
      { source: 'Pincode', target: 'Pincode' },
      { source: 'GSTIN', target: 'GSTIN' },
      { source: 'Country', target: 'Country' },
      { source: 'IsActive', target: 'IsActive', type: 'boolean' },
    ],
    autoCalculations: [],
  },
  'purchase-orders': {
    table: '"PurchaseOrders"',
    uniqueKey: 'OrderNumber',
    defaultValues: { IsDeleted: false, Status: 'Draft' },
    columnMapping: [
      { source: 'OrderNumber', target: 'OrderNumber', required: true },
      { source: 'SupplierId', target: 'SupplierId', type: 'number' },
      { source: 'SupplierName', target: 'SupplierId', type: 'lookup', lookupTable: '"Suppliers"', lookupField: 'SupplierName', returnField: 'Id' },
      { source: 'OrderDate', target: 'OrderDate', type: 'date' },
      { source: 'ExpectedDate', target: 'ExpectedDate', type: 'date' },
      { source: 'Status', target: 'Status' },
      { source: 'SubTotal', target: 'SubTotal', type: 'number' },
      { source: 'TaxAmount', target: 'TaxAmount', type: 'number' },
      { source: 'GrandTotal', target: 'GrandTotal', type: 'number' },
      { source: 'Remarks', target: 'Remarks' },
    ],
    autoCalculations: [
      { target: 'GrandTotal', logic: (row) => (parseFloat(row.SubTotal) || 0) + (parseFloat(row.TaxAmount) || 0) },
      { target: 'OrderNumber', logic: (row) => row.OrderNumber || `PO-${Date.now()}` },
    ],
  },
  'sales-orders': {
    table: '"SalesOrders"',
    uniqueKey: 'OrderNumber',
    defaultValues: { IsDeleted: false, Status: 'Draft' },
    columnMapping: [
      { source: 'OrderNumber', target: 'OrderNumber', required: true },
      { source: 'CustomerId', target: 'CustomerId', type: 'number' },
      { source: 'CustomerName', target: 'CustomerId', type: 'lookup', lookupTable: '"Customers"', lookupField: 'CustomerName', returnField: 'Id' },
      { source: 'OrderDate', target: 'OrderDate', type: 'date' },
      { source: 'Status', target: 'Status' },
      { source: 'SubTotal', target: 'SubTotal', type: 'number' },
      { source: 'TaxAmount', target: 'TaxAmount', type: 'number' },
      { source: 'GrandTotal', target: 'GrandTotal', type: 'number' },
      { source: 'Remarks', target: 'Remarks' },
    ],
    autoCalculations: [
      { target: 'GrandTotal', logic: (row) => (parseFloat(row.SubTotal) || 0) + (parseFloat(row.TaxAmount) || 0) },
      { target: 'OrderNumber', logic: (row) => row.OrderNumber || `SO-${Date.now()}` },
    ],
  },
};

// ── Parse uploaded file to extract rows ──
async function parseFile(buffer, mimetype) {
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype.endsWith('xlsx') || mimetype.endsWith('xls')) {
    return await parseExcel(buffer);
  } else if (mimetype.includes('csv') || mimetype.endsWith('csv')) {
    return parseCSV(buffer.toString('utf-8'));
  } else if (mimetype.includes('pdf')) {
    return [{ warning: 'PDF import may not extract structured data well. Consider using CSV/Excel.', raw: buffer.toString('utf-8').substring(0, 200) }];
  } else if (mimetype.includes('word') || mimetype.endsWith('docx')) {
    return await parseDocx(buffer);
  } else if (mimetype.includes('json') || mimetype.endsWith('json')) {
    return JSON.parse(buffer.toString('utf-8'));
  }
  throw new Error(`Unsupported file type: ${mimetype}`);
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheet found in Excel file');
  
  const rows = [];
  const headers = [];
  worksheet.getRow(1).eachCell((cell) => headers.push(cell.value));
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber - 1]] = cell.value;
    });
    rows.push(obj);
  });
  return rows;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

// ── Import endpoint ──
router.post('/import/:entity', verifyAccessToken, upload.single('file'), async (req, res) => {
  try {
    const { entity } = req.params;
    const config = importConfigs[entity];
    if (!config) return res.status(400).json({ message: `Unknown entity: ${entity}. Supported: ${Object.keys(importConfigs).join(', ')}` });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rows = await parseFile(req.file.buffer, req.file.mimetype);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'No data found in file' });

    const results = { imported: 0, skipped: 0, errors: [], skippedRows: [] };
    const { table, uniqueKey, defaultValues, columnMapping, autoCalculations } = config;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const record = { ...defaultValues };

        // Map columns
        for (const mapping of columnMapping) {
          let value = row[mapping.source] || row[mapping.source.toLowerCase()] || row[mapping.source.replace(/([A-Z])/g, '_$1').toLowerCase()] || '';
          
          if (mapping.type === 'lookup' && value) {
            // Lookup value from reference table
            const lookupResult = await appPool.query(
              `SELECT "${mapping.returnField}" FROM ${mapping.lookupTable} WHERE "${mapping.lookupField}" = $1 LIMIT 1`,
              [String(value)]
            );
            record[mapping.target] = lookupResult.rows.length > 0 ? lookupResult.rows[0][mapping.returnField] : null;
          } else if (mapping.type === 'number') {
            record[mapping.target] = parseFloat(value) || 0;
          } else if (mapping.type === 'boolean') {
            record[mapping.target] = value === true || value === 'true' || value === '1' || value === 'yes';
          } else if (mapping.type === 'date') {
            record[mapping.target] = value ? new Date(value) : null;
          } else {
            record[mapping.target] = String(value);
          }
        }

        // Check required fields
        let missingRequired = false;
        for (const mapping of columnMapping) {
          if (mapping.required && !record[mapping.target]) {
            results.errors.push(`Row ${i + 1}: Missing required field '${mapping.source}'`);
            missingRequired = true;
          }
        }
        if (missingRequired) { results.skipped++; continue; }

        // Auto-calculations
        if (autoCalculations) {
          for (const calc of autoCalculations) {
            record[calc.target] = calc.logic(record);
          }
        }

        // Check for existing record by unique key
        if (uniqueKey && record[uniqueKey]) {
          const existing = await appPool.query(
            `SELECT "Id" FROM ${table} WHERE "${uniqueKey}" = $1 LIMIT 1`,
            [record[uniqueKey]]
          );
          if (existing.rows.length > 0) {
            // Update existing record
            const updateCols = Object.keys(record).filter(k => k !== 'Id');
            const setClause = updateCols.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
            const values = updateCols.map(k => record[k]);
            values.push(existing.rows[0].Id);
            await appPool.query(
              `UPDATE ${table} SET ${setClause} WHERE "Id" = $${values.length}`,
              values
            );
            results.imported++;
            continue;
          }
        }

        // Insert new record
        const cols = Object.keys(record).filter(k => k !== 'Id');
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map(k => record[k]);
        await appPool.query(
          `INSERT INTO ${table} ("${cols.join('", "')}") VALUES (${placeholders})`,
          values
        );
        results.imported++;
      } catch (rowErr) {
        results.errors.push(`Row ${i + 1}: ${rowErr.message}`);
        results.skipped++;
      }
    }

    res.json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped`,
      details: results,
    });
  } catch (error) {
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
});

// ── Get import template (column headers) ──
router.get('/import/template/:entity', verifyAccessToken, async (req, res) => {
  try {
    const { entity } = req.params;
    const config = importConfigs[entity];
    if (!config) return res.status(400).json({ message: `Unknown entity: ${entity}` });

    const headerRow = config.columnMapping.map(m => m.source);
    const requiredFields = config.columnMapping.filter(m => m.required).map(m => m.source);
    
    // Generate sample data row
    const sampleRow = {};
    config.columnMapping.forEach(m => {
      if (m.type === 'number') sampleRow[m.source] = 0;
      else if (m.type === 'boolean') sampleRow[m.source] = true;
      else if (m.type === 'date') sampleRow[m.source] = new Date().toISOString().split('T')[0];
      else if (m.type === 'lookup') sampleRow[m.source] = `Existing ${m.lookupField} value`;
      else sampleRow[m.source] = `Sample ${m.source}`;
    });

    res.json({
      entity,
      headers: headerRow,
      requiredFields,
      defaultValues: config.defaultValues,
      autoCalculations: config.autoCalculations?.map(c => ({ target: c.target, description: `Auto-calculated (not required in file)` })),
      sampleRow,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get template', error: error.message });
  }
});

// ── Preview import data before committing ──
router.post('/import/preview/:entity', verifyAccessToken, upload.single('file'), async (req, res) => {
  try {
    const { entity } = req.params;
    const config = importConfigs[entity];
    if (!config) return res.status(400).json({ message: `Unknown entity: ${entity}` });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rows = await parseFile(req.file.buffer, req.file.mimetype);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'No data found in file' });

    // Only return first 10 rows as preview, with validation status
    const preview = rows.slice(0, 10).map((row, idx) => {
      const issues = [];
      for (const mapping of config.columnMapping) {
        if (mapping.required && !row[mapping.source] && !row[mapping.source.toLowerCase()]) {
          issues.push(`Missing required: ${mapping.source}`);
        }
        if (mapping.type === 'number' && row[mapping.source] && isNaN(parseFloat(row[mapping.source]))) {
          issues.push(`Invalid number: ${mapping.source}`);
        }
      }
      return { rowNumber: idx + 2, data: row, status: issues.length > 0 ? 'Issues found' : 'Valid', issues };
    });

    res.json({
      entity,
      totalRows: rows.length,
      preview,
      columnMapping: config.columnMapping,
    });
  } catch (error) {
    res.status(500).json({ message: 'Preview failed', error: error.message });
  }
});

// ── Export data with auto-population template ──
router.get('/export/template/:entity', verifyAccessToken, async (req, res) => {
  try {
    const { entity } = req.params;
    const config = importConfigs[entity];
    if (!config) return res.status(400).json({ message: `Unknown entity: ${entity}` });

    // Create Excel workbook with headers
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(entity);
    
    // Style header row
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
      }
    };

    const requiredStyle = { font: { color: { argb: 'FFFF0000' }, bold: true } };

    // Add headers
    const headerRow = sheet.addRow(config.columnMapping.map(m => m.source));
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Mark required field cells (add comment/note)
    config.columnMapping.forEach((m, idx) => {
      if (m.required) {
        const cell = sheet.getCell(1, idx + 1);
        cell.note = 'REQUIRED FIELD';
        cell.font = { bold: true, color: { argb: 'FFFF0000' }, size: 12 };
      }
    });

    // Auto-population hints row
    const hintRow = sheet.addRow(config.columnMapping.map(m => {
      if (m.type === 'number') return 'Enter number value';
      if (m.type === 'boolean') return 'true/false';
      if (m.type === 'date') return 'YYYY-MM-DD';
      if (m.type === 'lookup') return `Existing ${m.lookupField} (auto-mapped)`;
      return 'Enter value';
    }));
    hintRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: 'FF999999' }, size: 10 };
    });

    // Set column widths
    config.columnMapping.forEach((_, idx) => {
      sheet.getColumn(idx + 1).width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}-import-template.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
});

module.exports = router;