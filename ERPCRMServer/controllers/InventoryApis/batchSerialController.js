const { appPool } = require("../../config/db");

const createBatch = async (req, res) => {
  const { BatchNo, ProductId, Quantity, ManufacturingDate, ExpiryDate, SupplierId, PurchaseOrderId, WarehouseId, CompanyId } = req.body;
  if (!BatchNo || !ProductId || !CompanyId || !WarehouseId) {
    return res.status(400).json({ success: false, message: "BatchNo, ProductId, CompanyId, and WarehouseId are required" });
  }
  try {
    const result = await appPool.query(
      `INSERT INTO "Batches" ("BatchNo", "ProductId", "Quantity", "ManufacturingDate", "ExpiryDate", "SupplierId", "PurchaseOrderId", "WarehouseId", "CompanyId", "CreatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [BatchNo, ProductId, Quantity || 0, ManufacturingDate || null, ExpiryDate || null, SupplierId || null, PurchaseOrderId || null, WarehouseId, CompanyId, req.user?.userId || null]
    );
    res.status(201).json({ success: true, message: "Batch created", data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: "Batch already exists for this product & warehouse" });
    console.error("Error creating batch:", err);
    res.status(500).json({ success: false, message: "Failed to create batch", error: err.message });
  }
};

const getAllBatches = async (req, res) => {
  const { page = 1, limit = 10, search = "", companyId, productId, warehouseId, expiryAlert, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "BatchNo", "ManufacturingDate", "ExpiryDate", "Quantity"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['b."IsActive" = TRUE'];
  const queryParams = [];
  let paramCount = 1;

  if (search) { whereConditions.push(`(b."BatchNo" ILIKE $${paramCount})`); queryParams.push(`%${search}%`); paramCount++; }
  if (companyId) { whereConditions.push(`b."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  if (productId) { whereConditions.push(`b."ProductId" = $${paramCount}`); queryParams.push(productId); paramCount++; }
  if (warehouseId) { whereConditions.push(`b."WarehouseId" = $${paramCount}`); queryParams.push(warehouseId); paramCount++; }
  if (expiryAlert === "true") { whereConditions.push(`b."ExpiryDate" IS NOT NULL AND b."ExpiryDate" <= CURRENT_DATE + INTERVAL '30 days' AND b."ExpiryDate" >= CURRENT_DATE`); }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "Batches" b WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT b.*, p."ProductName", p."ProductCode", w."Name" as "WarehouseName", s."Name" as "SupplierName"
       FROM "Batches" b
       LEFT JOIN "Products" p ON b."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON b."WarehouseId" = w."Id"
       LEFT JOIN "Suppliers" s ON b."SupplierId" = s."Id"
       WHERE ${whereClause} ORDER BY b."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching batches:", err);
    res.status(500).json({ success: false, message: "Failed to fetch batches", error: err.message });
  }
};

const getExpiringBatches = async (req, res) => {
  const { companyId, days = 30 } = req.query;
  const whereConditions = ['b."IsActive" = TRUE', `b."ExpiryDate" IS NOT NULL`];
  const queryParams = [];
  let paramCount = 1;

  if (companyId) { whereConditions.push(`b."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  whereConditions.push(`b."ExpiryDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + $${paramCount}::INTEGER`);
  queryParams.push(days);
  paramCount++;

  try {
    const result = await appPool.query(
      `SELECT b.*, p."ProductName", p."ProductCode", w."Name" as "WarehouseName",
              (b."ExpiryDate" - CURRENT_DATE) as "DaysUntilExpiry"
       FROM "Batches" b
       LEFT JOIN "Products" p ON b."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON b."WarehouseId" = w."Id"
       WHERE ${whereConditions.join(" AND ")}
       ORDER BY b."ExpiryDate" ASC`, queryParams
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Error fetching expiring batches:", err);
    res.status(500).json({ success: false, message: "Failed to fetch expiring batches", error: err.message });
  }
};

// Serial Numbers
const createSerialNumber = async (req, res) => {
  const { SerialNo, ProductId, BatchId, WarehouseId, CompanyId } = req.body;
  if (!SerialNo || !ProductId || !CompanyId) {
    return res.status(400).json({ success: false, message: "SerialNo, ProductId, and CompanyId are required" });
  }
  try {
    const result = await appPool.query(
      `INSERT INTO "SerialNumbers" ("SerialNo", "ProductId", "BatchId", "WarehouseId", "CompanyId", "CreatedBy")
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [SerialNo, ProductId, BatchId || null, WarehouseId || null, CompanyId, req.user?.userId || null]
    );
    res.status(201).json({ success: true, message: "Serial number created", data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: "Serial number already exists" });
    console.error("Error creating serial number:", err);
    res.status(500).json({ success: false, message: "Failed to create serial number", error: err.message });
  }
};

const bulkCreateSerialNumbers = async (req, res) => {
  const { prefix, start, end, ProductId, BatchId, WarehouseId, CompanyId } = req.body;
  if (!prefix || !start || !end || !ProductId || !CompanyId) {
    return res.status(400).json({ success: false, message: "prefix, start, end, ProductId, and CompanyId are required" });
  }
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    const serials = [];
    for (let i = parseInt(start); i <= parseInt(end); i++) {
      const serialNo = `${prefix}${i.toString().padStart(4, '0')}`;
      await client.query(
        `INSERT INTO "SerialNumbers" ("SerialNo", "ProductId", "BatchId", "WarehouseId", "CompanyId", "CreatedBy") VALUES ($1,$2,$3,$4,$5,$6)`,
        [serialNo, ProductId, BatchId || null, WarehouseId || null, CompanyId, req.user?.userId || null]
      );
      serials.push(serialNo);
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `${serials.length} serial numbers created`, count: serials.length });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ success: false, message: "One or more serial numbers already exist" });
    console.error("Error bulk creating serial numbers:", err);
    res.status(500).json({ success: false, message: "Failed to create serial numbers", error: err.message });
  } finally {
    client.release();
  }
};

const getAllSerialNumbers = async (req, res) => {
  const { page = 1, limit = 10, search = "", companyId, productId, status, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "SerialNo", "Status", "CreatedAt"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['1=1'];
  const queryParams = [];
  let paramCount = 1;

  if (search) { whereConditions.push(`(s."SerialNo" ILIKE $${paramCount})`); queryParams.push(`%${search}%`); paramCount++; }
  if (companyId) { whereConditions.push(`s."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  if (productId) { whereConditions.push(`s."ProductId" = $${paramCount}`); queryParams.push(productId); paramCount++; }
  if (status) { whereConditions.push(`s."Status" = $${paramCount}`); queryParams.push(status); paramCount++; }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "SerialNumbers" s WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT s.*, p."ProductName", p."ProductCode", w."Name" as "WarehouseName", b."BatchNo"
       FROM "SerialNumbers" s
       LEFT JOIN "Products" p ON s."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON s."WarehouseId" = w."Id"
       LEFT JOIN "Batches" b ON s."BatchId" = b."Id"
       WHERE ${whereClause} ORDER BY s."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching serial numbers:", err);
    res.status(500).json({ success: false, message: "Failed to fetch serial numbers", error: err.message });
  }
};

const updateSerialStatus = async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;
  try {
    const result = await appPool.query(
      `UPDATE "SerialNumbers" SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2 RETURNING *`,
      [Status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Serial number not found" });
    res.json({ success: true, message: "Status updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating serial status:", err);
    res.status(500).json({ success: false, message: "Failed to update status", error: err.message });
  }
};

module.exports = { createBatch, getAllBatches, getExpiringBatches, createSerialNumber, bulkCreateSerialNumbers, getAllSerialNumbers, updateSerialStatus };