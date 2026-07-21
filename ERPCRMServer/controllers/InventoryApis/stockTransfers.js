const { appPool } = require("../../config/db");

const createStockTransfer = async (req, res) => {
  const { FromWarehouseId, ToWarehouseId, TransferDate, Notes, CompanyId, items } = req.body;
  if (!FromWarehouseId || !ToWarehouseId || !CompanyId || !items || !items.length) {
    return res.status(400).json({ success: false, message: "FromWarehouse, ToWarehouse, CompanyId, and items are required" });
  }
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    const transferNo = `TRF-${Date.now()}`;
    const headerResult = await client.query(
      `INSERT INTO "StockTransfers" ("TransferNo", "FromWarehouseId", "ToWarehouseId", "TransferDate", "TotalItems", "Notes", "CompanyId", "CreatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [transferNo, FromWarehouseId, ToWarehouseId, TransferDate || new Date(), items.length, Notes || null, CompanyId, req.user?.userId || null]
    );
    const transferId = headerResult.rows[0].Id;

    for (const item of items) {
      // Check stock availability
      const stockCheck = await client.query(
        `SELECT "Quantity", "AvailableQuantity" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
        [item.ProductId, FromWarehouseId]
      );
      const availableQty = stockCheck.rows.length > 0 ? parseInt(stockCheck.rows[0].AvailableQuantity) : 0;
      if (availableQty < item.Quantity) {
        throw new Error(`Insufficient stock for product ID ${item.ProductId}. Available: ${availableQty}, Requested: ${item.Quantity}`);
      }

      await client.query(
        `INSERT INTO "StockTransferItems" ("StockTransferId", "ProductId", "Quantity", "UnitCost", "Notes") VALUES ($1,$2,$3,$4,$5)`,
        [transferId, item.ProductId, item.Quantity, item.UnitCost || 0, item.Notes || null]
      );

      // Deduct from source warehouse
      await client.query(
        `UPDATE "ProductStockPerWarehouse" SET "Quantity" = "Quantity" - $1, "ReservedQuantity" = "ReservedQuantity" + $1, "UpdatedAt" = CURRENT_TIMESTAMP
         WHERE "ProductId" = $2 AND "WarehouseId" = $3`,
        [item.Quantity, item.ProductId, FromWarehouseId]
      );

      // Add to destination warehouse (or create entry)
      const destStock = await client.query(
        `SELECT "Id" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
        [item.ProductId, ToWarehouseId]
      );
      if (destStock.rows.length > 0) {
        await client.query(
          `UPDATE "ProductStockPerWarehouse" SET "Quantity" = "Quantity" + $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ProductId" = $2 AND "WarehouseId" = $3`,
          [item.Quantity, item.ProductId, ToWarehouseId]
        );
      } else {
        await client.query(
          `INSERT INTO "ProductStockPerWarehouse" ("ProductId", "WarehouseId", "Quantity") VALUES ($1,$2,$3)`,
          [item.ProductId, ToWarehouseId, item.Quantity]
        );
      }

      // Log stock movement
      await client.query(
        `INSERT INTO "StockMovements" ("ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy") VALUES ($1,$2,'TRANSFER', $3,$4,$5)`,
        [item.ProductId, FromWarehouseId, -item.Quantity, `Transferred to warehouse ${ToWarehouseId}`, req.user?.userId]
      );
      await client.query(
        `INSERT INTO "StockMovements" ("ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy") VALUES ($1,$2,'TRANSFER', $3,$4,$5)`,
        [item.ProductId, ToWarehouseId, item.Quantity, `Received from warehouse ${FromWarehouseId}`, req.user?.userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Stock transfer created", data: headerResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating stock transfer:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create stock transfer", error: err.message });
  } finally {
    client.release();
  }
};

const getAllStockTransfers = async (req, res) => {
  const { page = 1, limit = 10, search = "", companyId, status, sortBy = "CreatedAt", sortOrder = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const allowedSort = ["Id", "TransferNo", "TransferDate", "Status"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const whereConditions = ['st."IsDeleted" = FALSE'];
  const queryParams = [];
  let paramCount = 1;

  if (search) {
    whereConditions.push(`(st."TransferNo" ILIKE $${paramCount} OR st."Notes" ILIKE $${paramCount})`);
    queryParams.push(`%${search}%`);
    paramCount++;
  }
  if (companyId) { whereConditions.push(`st."CompanyId" = $${paramCount}`); queryParams.push(companyId); paramCount++; }
  if (status) { whereConditions.push(`st."Status" = $${paramCount}`); queryParams.push(status); paramCount++; }

  const whereClause = whereConditions.join(" AND ");
  try {
    const countResult = await appPool.query(`SELECT COUNT(*) as total FROM "StockTransfers" st WHERE ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const dataResult = await appPool.query(
      `SELECT st.*, fw."Name" as "FromWarehouseName", tw."Name" as "ToWarehouseName", u."Name" as "CreatedByName"
       FROM "StockTransfers" st
       LEFT JOIN "Warehouses" fw ON st."FromWarehouseId" = fw."Id"
       LEFT JOIN "Warehouses" tw ON st."ToWarehouseId" = tw."Id"
       LEFT JOIN "Users" u ON st."CreatedBy" = u."UserId"
       WHERE ${whereClause} ORDER BY st."${sortColumn}" ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, parseInt(limit), offset]
    );
    res.json({ success: true, data: dataResult.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Error fetching stock transfers:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stock transfers", error: err.message });
  }
};

const getStockTransferById = async (req, res) => {
  const { id } = req.params;
  try {
    const header = await appPool.query(
      `SELECT st.*, fw."Name" as "FromWarehouseName", tw."Name" as "ToWarehouseName", u."Name" as "CreatedByName"
       FROM "StockTransfers" st
       LEFT JOIN "Warehouses" fw ON st."FromWarehouseId" = fw."Id"
       LEFT JOIN "Warehouses" tw ON st."ToWarehouseId" = tw."Id"
       LEFT JOIN "Users" u ON st."CreatedBy" = u."UserId"
       WHERE st."Id" = $1 AND st."IsDeleted" = FALSE`, [id]
    );
    if (header.rows.length === 0) return res.status(404).json({ success: false, message: "Stock transfer not found" });
    const items = await appPool.query(
      `SELECT sti.*, p."ProductName", p."ProductCode", u."Symbol" as "UnitSymbol"
       FROM "StockTransferItems" sti
       LEFT JOIN "Products" p ON sti."ProductId" = p."Id"
       LEFT JOIN "Units" u ON p."UnitId" = u."Id"
       WHERE sti."StockTransferId" = $1`, [id]
    );
    res.json({ success: true, data: { ...header.rows[0], items: items.rows } });
  } catch (err) {
    console.error("Error fetching stock transfer:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stock transfer", error: err.message });
  }
};

const updateTransferStatus = async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;
  try {
    const result = await appPool.query(
      `UPDATE "StockTransfers" SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2 AND "IsDeleted" = FALSE RETURNING *`,
      [Status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Stock transfer not found" });
    res.json({ success: true, message: "Status updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating transfer status:", err);
    res.status(500).json({ success: false, message: "Failed to update status", error: err.message });
  }
};

module.exports = { createStockTransfer, getAllStockTransfers, getStockTransferById, updateTransferStatus };