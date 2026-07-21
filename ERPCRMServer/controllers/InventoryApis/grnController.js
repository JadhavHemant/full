const { appPool } = require("../../config/db");

const createGRN = async (req, res) => {
  const { PurchaseOrderId, SupplierId, WarehouseId, ReceivedDate, Notes, CompanyId, items } = req.body;
  if (!SupplierId || !WarehouseId || !CompanyId || !items || !items.length) {
    return res.status(400).json({ success: false, message: "SupplierId, WarehouseId, CompanyId, and items are required" });
  }
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    const grnNumber = `GRN-${Date.now()}`;
    
    // Get PO number if purchase order is linked
    let poNumber = null;
    if (PurchaseOrderId) {
      const poResult = await client.query(`SELECT "PONumber" FROM "PurchaseOrders" WHERE "Id" = $1`, [PurchaseOrderId]);
      if (poResult.rows.length > 0) poNumber = poResult.rows[0].PONumber;
    }

    const headerResult = await client.query(
      `INSERT INTO "GRN" ("GRNNumber", "PONumber", "PurchaseOrderId", "SupplierId", "WarehouseId", "ReceivedDate", "TotalQuantity", "TotalAmount", "Notes", "CompanyId", "CreatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [grnNumber, poNumber, PurchaseOrderId || null, SupplierId, WarehouseId, ReceivedDate || new Date(), items.length, 0, Notes || null, CompanyId, req.user?.userId || null]
    );
    const grnId = headerResult.rows[0].Id;
    let totalAmount = 0;
    let totalQty = 0;

    for (const item of items) {
      await client.query(
        `INSERT INTO "GRNItems" ("GRNId", "ProductId", "QuantityReceived", "QuantityAccepted", "QuantityRejected", "UnitCost", "BatchNo", "ManufacturingDate", "ExpiryDate", "Notes")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [grnId, item.ProductId, item.QuantityReceived, item.QuantityAccepted || item.QuantityReceived, 
         item.QuantityRejected || 0, item.UnitCost || 0, item.BatchNo || null, item.ManufacturingDate || null, item.ExpiryDate || null, item.Notes || null]
      );

      const acceptedQty = item.QuantityAccepted || item.QuantityReceived;
      totalQty += acceptedQty;
      totalAmount += acceptedQty * (item.UnitCost || 0);

      // Update product stock in warehouse
      const existingStock = await client.query(
        `SELECT "Id" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
        [item.ProductId, WarehouseId]
      );
      if (existingStock.rows.length > 0) {
        await client.query(
          `UPDATE "ProductStockPerWarehouse" SET "Quantity" = "Quantity" + $1, "LastRestocked" = CURRENT_TIMESTAMP, "UpdatedAt" = CURRENT_TIMESTAMP
           WHERE "ProductId" = $2 AND "WarehouseId" = $3`,
          [acceptedQty, item.ProductId, WarehouseId]
        );
      } else {
        await client.query(
          `INSERT INTO "ProductStockPerWarehouse" ("ProductId", "WarehouseId", "Quantity", "LastRestocked") VALUES ($1,$2,$3,CURRENT_TIMESTAMP)`,
          [item.ProductId, WarehouseId, acceptedQty]
        );
      }

      // Update purchase order received quantity if linked
      if (PurchaseOrderId) {
        await client.query(
          `UPDATE "PurchaseOrderItems" SET "ReceivedQuantity" = "ReceivedQuantity" + $1 WHERE "PurchaseOrderId" = $2 AND "ProductId" = $3`,
          [acceptedQty, PurchaseOrderId, item.ProductId]
        );
      }

      // Create batch entry if batch number provided
      if (item.BatchNo) {
        await client.query(
          `INSERT INTO "Batches" ("BatchNo", "ProductId", "Quantity", "ManufacturingDate", "ExpiryDate", "SupplierId", "PurchaseOrderId", "WarehouseId", "CompanyId", "CreatedBy")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT ("BatchNo", "ProductId", "WarehouseId") DO UPDATE SET "Quantity" = "Batches"."Quantity" + $3`,
          [item.BatchNo, item.ProductId, acceptedQty, item.ManufacturingDate || null, item.ExpiryDate || null, SupplierId, PurchaseOrderId || null, WarehouseId, CompanyId, req.user?.userId]
        );
      }

      // Log stock movement
      await client.query(
        `INSERT INTO "StockMovements" ("ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy") VALUES ($1,$2,'IN',$3,$4,$5)`,
        [item.ProductId, WarehouseId, acceptedQty, `GRN: ${grnNumber}`, req.user?.userId]
      );
    }

    // Update GRN totals
    await client.query(
      `UPDATE "GRN" SET "TotalQuantity" = $1, "TotalAmount" = $2 WHERE "Id" = $3`,
      [totalQty, totalAmount, grnId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "GRN created successfully", data: headerResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating GRN:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create GRN", error: err.message });
  } finally {
    client.release();
  }
};

const getAllGRNs = async (req, res) => {
  const { page = 1, limit = 10, search = "", companyId, status, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "GRNNumber", "ReceivedDate", "Status", "TotalAmount"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['g."IsDeleted" = FALSE'];
  const queryParams = [];
  let paramCount = 1;

  if (search) { whereConditions.push(`(g."GRNNumber" ILIKE $${paramCount} OR g."PONumber" ILIKE $${paramCount})`); queryParams.push(`%${search}%`); paramCount++; }
  if (companyId) { whereConditions.push(`g."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  if (status) { whereConditions.push(`g."Status" = $${paramCount}`); queryParams.push(status); paramCount++; }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "GRN" g WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT g.*, s."Name" as "SupplierName", w."Name" as "WarehouseName", u."Name" as "CreatedByName"
       FROM "GRN" g
       LEFT JOIN "Suppliers" s ON g."SupplierId" = s."Id"
       LEFT JOIN "Warehouses" w ON g."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON g."CreatedBy" = u."UserId"
       WHERE ${whereClause} ORDER BY g."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching GRNs:", err);
    res.status(500).json({ success: false, message: "Failed to fetch GRNs", error: err.message });
  }
};

const getGRNById = async (req, res) => {
  const { id } = req.params;
  try {
    const header = await appPool.query(
      `SELECT g.*, s."Name" as "SupplierName", w."Name" as "WarehouseName", u."Name" as "CreatedByName"
       FROM "GRN" g
       LEFT JOIN "Suppliers" s ON g."SupplierId" = s."Id"
       LEFT JOIN "Warehouses" w ON g."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON g."CreatedBy" = u."UserId"
       WHERE g."Id" = $1 AND g."IsDeleted" = FALSE`, [id]
    );
    if (header.rows.length === 0) return res.status(404).json({ success: false, message: "GRN not found" });
    const items = await appPool.query(
      `SELECT gi.*, p."ProductName", p."ProductCode", p."SKU"
       FROM "GRNItems" gi
       LEFT JOIN "Products" p ON gi."ProductId" = p."Id"
       WHERE gi."GRNId" = $1`, [id]
    );
    res.json({ success: true, data: { ...header.rows[0], items: items.rows } });
  } catch (err) {
    console.error("Error fetching GRN:", err);
    res.status(500).json({ success: false, message: "Failed to fetch GRN", error: err.message });
  }
};

module.exports = { createGRN, getAllGRNs, getGRNById };