const { appPool } = require("../../config/db");

// ─────────────────────────────────────────────────────────────────
//  PUTAWAY TASKS
// ─────────────────────────────────────────────────────────────────

const createPutawayTask = async (req, res) => {
  try {
    const { companyId, referenceType, referenceId, productId, warehouseId, toBinId, quantity, priority, assignedTo, notes } = req.body;
    const userId = req.user?.UserId;

    if (!productId || !warehouseId || !quantity) {
      return res.status(400).json({ message: "productId, warehouseId, and quantity are required" });
    }

    const taskNumber = `PUT-${Date.now()}`;
    const result = await appPool.query(
      `INSERT INTO "PutawayTask" ("CompanyId","TaskNumber","ReferenceType","ReferenceId","ProductId","WarehouseId","ToBinId","Quantity","Priority","AssignedTo","Notes","Status","CreatedBy","UpdatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pending',$12,$12) RETURNING *`,
      [companyId || null, taskNumber, referenceType || 'Manual', referenceId || null, productId, warehouseId, toBinId || null, quantity, priority || 'Normal', assignedTo || null, notes || null, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating putaway task:", error);
    res.status(500).json({ message: "Failed to create putaway task", error: error.message });
  }
};

const getPutawayTasks = async (req, res) => {
  try {
    const { status, warehouseId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = `pt."IsDeleted" = false`;
    if (status) { where += ` AND pt."Status" = $${params.length + 1}`; params.push(status); }
    if (warehouseId) { where += ` AND pt."WarehouseId" = $${params.length + 1}`; params.push(warehouseId); }
    params.push(limit, offset);

    const result = await appPool.query(
      `SELECT pt.*, p."Name" AS "ProductName", w."Name" AS "WarehouseName", u."Name" AS "AssignedToName"
       FROM "PutawayTask" pt
       LEFT JOIN "Products" p ON pt."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON pt."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON pt."AssignedTo" = u."UserId"
       WHERE ${where}
       ORDER BY pt."CreatedAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("Error fetching putaway tasks:", error);
    res.status(500).json({ message: "Failed to fetch putaway tasks", error: error.message });
  }
};

const completePutawayTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { putawayQuantity, toBinId } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "PutawayTask" SET "Status" = 'Completed', "PutawayQuantity" = $1, "ToBinId" = COALESCE($2,"ToBinId"), "CompletedAt" = CURRENT_TIMESTAMP, "UpdatedBy" = $3, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $4 AND "IsDeleted" = false RETURNING *`,
      [putawayQuantity, toBinId || null, userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Putaway task not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error completing putaway task:", error);
    res.status(500).json({ message: "Failed to complete putaway task", error: error.message });
  }
};

const deletePutawayTask = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "PutawayTask" SET "IsDeleted" = true WHERE "Id" = $1`, [id]);
    res.json({ message: "Putaway task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete putaway task", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
//  PICKING LISTS
// ─────────────────────────────────────────────────────────────────

const createPickingList = async (req, res) => {
  try {
    const { companyId, referenceType, referenceId, warehouseId, pickingType, priority, assignedTo, notes, items } = req.body;
    const userId = req.user?.UserId;

    if (!warehouseId) return res.status(400).json({ message: "warehouseId is required" });

    const listNumber = `PICK-${Date.now()}`;
    const result = await appPool.query(
      `INSERT INTO "PickingList" ("CompanyId","ListNumber","ReferenceType","ReferenceId","WarehouseId","PickingType","Priority","AssignedTo","Notes","Status","CreatedBy","UpdatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$10) RETURNING *`,
      [companyId || null, listNumber, referenceType || 'SalesOrder', referenceId || null, warehouseId, pickingType || 'Single', priority || 'Normal', assignedTo || null, notes || null, userId]
    );
    const pickingListId = result.rows[0].Id;

    if (items && items.length > 0) {
      for (const item of items) {
        await appPool.query(
          `INSERT INTO "PickingItem" ("PickingListId","ProductId","FromBinId","Quantity","BatchId")
           VALUES ($1,$2,$3,$4,$5)`,
          [pickingListId, item.productId, item.fromBinId || null, item.quantity, item.batchId || null]
        );
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating picking list:", error);
    res.status(500).json({ message: "Failed to create picking list", error: error.message });
  }
};

const getPickingLists = async (req, res) => {
  try {
    const { status, warehouseId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = `pl."IsDeleted" = false`;
    if (status) { where += ` AND pl."Status" = $${params.length + 1}`; params.push(status); }
    if (warehouseId) { where += ` AND pl."WarehouseId" = $${params.length + 1}`; params.push(warehouseId); }
    params.push(limit, offset);

    const result = await appPool.query(
      `SELECT pl.*, w."Name" AS "WarehouseName", u."Name" AS "AssignedToName"
       FROM "PickingList" pl
       LEFT JOIN "Warehouses" w ON pl."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON pl."AssignedTo" = u."UserId"
       WHERE ${where}
       ORDER BY pl."CreatedAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("Error fetching picking lists:", error);
    res.status(500).json({ message: "Failed to fetch picking lists", error: error.message });
  }
};

const getPickingListById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT pl.*, w."Name" AS "WarehouseName"
       FROM "PickingList" pl
       LEFT JOIN "Warehouses" w ON pl."WarehouseId" = w."Id"
       WHERE pl."Id" = $1 AND pl."IsDeleted" = false`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Picking list not found" });

    const items = await appPool.query(
      `SELECT pi.*, p."Name" AS "ProductName", p."SKU"
       FROM "PickingItem" pi
       LEFT JOIN "Products" p ON pi."ProductId" = p."Id"
       WHERE pi."PickingListId" = $1`,
      [id]
    );
    res.json({ ...result.rows[0], Items: items.rows });
  } catch (error) {
    console.error("Error fetching picking list:", error);
    res.status(500).json({ message: "Failed to fetch picking list", error: error.message });
  }
};

const confirmPicking = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{ pickingItemId, pickedQuantity }]
    const userId = req.user?.UserId;

    if (items && items.length > 0) {
      for (const item of items) {
        await appPool.query(
          `UPDATE "PickingItem" SET "PickedQuantity" = $1, "Status" = CASE WHEN $1 >= "Quantity" THEN 'Completed' ELSE 'Partial' END WHERE "Id" = $2`,
          [item.pickedQuantity, item.pickingItemId]
        );
      }
    }

    // Check if all items are completed
    const checkResult = await appPool.query(
      `SELECT COUNT(*) FILTER (WHERE "Status" != 'Completed') AS "pending" FROM "PickingItem" WHERE "PickingListId" = $1`,
      [id]
    );
    const allDone = parseInt(checkResult.rows[0].pending) === 0;

    const result = await appPool.query(
      `UPDATE "PickingList" SET "Status" = $1, "CompletedAt" = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $3 RETURNING *`,
      [allDone ? 'Completed' : 'In Progress', userId, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error confirming picking:", error);
    res.status(500).json({ message: "Failed to confirm picking", error: error.message });
  }
};

const deletePickingList = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "PickingList" SET "IsDeleted" = true WHERE "Id" = $1`, [id]);
    res.json({ message: "Picking list deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete picking list", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
//  CYCLE COUNT
// ─────────────────────────────────────────────────────────────────

const createCycleCount = async (req, res) => {
  try {
    const { companyId, warehouseId, countType, scheduledDate, assignedTo, notes } = req.body;
    const userId = req.user?.UserId;

    if (!warehouseId) return res.status(400).json({ message: "warehouseId is required" });

    const countNumber = `CC-${Date.now()}`;
    const result = await appPool.query(
      `INSERT INTO "CycleCount" ("CompanyId","CountNumber","WarehouseId","CountType","Status","ScheduledDate","AssignedTo","CreatedBy","UpdatedBy")
       VALUES ($1,$2,$3,$4,'Planned',$5,$6,$7,$7) RETURNING *`,
      [companyId || null, countNumber, warehouseId, countType || 'ABC', scheduledDate || null, assignedTo || null, userId]
    );

    // Auto-populate items from current product stock in that warehouse
    const stockItems = await appPool.query(
      `SELECT "ProductId", "Quantity" FROM "ProductStockPerWarehouse" WHERE "WarehouseId" = $1 AND "Quantity" > 0`,
      [warehouseId]
    );

    for (const item of stockItems.rows) {
      await appPool.query(
        `INSERT INTO "CycleCountItem" ("CycleCountId","ProductId","ExpectedQuantity","Status") VALUES ($1,$2,$3,'Pending')`,
        [result.rows[0].Id, item.ProductId, item.Quantity]
      );
    }

    await appPool.query(
      `UPDATE "CycleCount" SET "TotalItems" = $1 WHERE "Id" = $2`,
      [stockItems.rows.length, result.rows[0].Id]
    );

    res.status(201).json({ ...result.rows[0], TotalItems: stockItems.rows.length });
  } catch (error) {
    console.error("Error creating cycle count:", error);
    res.status(500).json({ message: "Failed to create cycle count", error: error.message });
  }
};

const getCycleCounts = async (req, res) => {
  try {
    const { status, warehouseId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = `cc."IsDeleted" = false`;
    if (status) { where += ` AND cc."Status" = $${params.length + 1}`; params.push(status); }
    if (warehouseId) { where += ` AND cc."WarehouseId" = $${params.length + 1}`; params.push(warehouseId); }
    params.push(limit, offset);

    const result = await appPool.query(
      `SELECT cc.*, w."Name" AS "WarehouseName", u."Name" AS "AssignedToName"
       FROM "CycleCount" cc
       LEFT JOIN "Warehouses" w ON cc."WarehouseId" = w."Id"
       LEFT JOIN "Users" u ON cc."AssignedTo" = u."UserId"
       WHERE ${where}
       ORDER BY cc."CreatedAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("Error fetching cycle counts:", error);
    res.status(500).json({ message: "Failed to fetch cycle counts", error: error.message });
  }
};

const getCycleCountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT cc.*, w."Name" AS "WarehouseName" FROM "CycleCount" cc LEFT JOIN "Warehouses" w ON cc."WarehouseId" = w."Id" WHERE cc."Id" = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Cycle count not found" });

    const items = await appPool.query(
      `SELECT cci.*, p."Name" AS "ProductName", p."SKU"
       FROM "CycleCountItem" cci
       LEFT JOIN "Products" p ON cci."ProductId" = p."Id"
       WHERE cci."CycleCountId" = $1
       ORDER BY p."Name"`,
      [id]
    );
    res.json({ ...result.rows[0], Items: items.rows });
  } catch (error) {
    console.error("Error fetching cycle count:", error);
    res.status(500).json({ message: "Failed to fetch cycle count", error: error.message });
  }
};

const recordCountResult = async (req, res) => {
  try {
    const { id } = req.params; // cycleCountId
    const { items } = req.body; // [{ cycleCountItemId, countedQuantity, notes }]
    const userId = req.user?.UserId;

    let varianceItems = 0;
    let varianceValue = 0;

    for (const item of items) {
      const itemResult = await appPool.query(
        `UPDATE "CycleCountItem" SET "CountedQuantity" = $1, "Variance" = $1 - "ExpectedQuantity", "Status" = 'Counted', "CountedBy" = $2, "CountedAt" = CURRENT_TIMESTAMP, "Notes" = $3
         WHERE "Id" = $4 RETURNING *`,
        [item.countedQuantity, userId, item.notes || null, item.cycleCountItemId]
      );
      if (itemResult.rows.length > 0) {
        const variance = parseFloat(itemResult.rows[0].Variance);
        if (Math.abs(variance) > 0) {
          varianceItems++;
          varianceValue += Math.abs(variance);
        }
      }
    }

    // Update cycle count summary
    const countedResult = await appPool.query(
      `SELECT COUNT(*) AS counted FROM "CycleCountItem" WHERE "CycleCountId" = $1 AND "Status" = 'Counted'`,
      [id]
    );
    const countedCount = parseInt(countedResult.rows[0].counted);

    const totalResult = await appPool.query(
      `SELECT "TotalItems" FROM "CycleCount" WHERE "Id" = $1`,
      [id]
    );
    const totalItems = parseInt(totalResult.rows[0]?.TotalItems || 0);
    const allCounted = countedCount >= totalItems;

    const updated = await appPool.query(
      `UPDATE "CycleCount" SET "CountedItems" = $1, "VarianceItems" = "VarianceItems" + $2, "VarianceValue" = "VarianceValue" + $3,
       "Status" = CASE WHEN $4 THEN 'Completed' ELSE 'In Progress' END,
       "CompletedDate" = CASE WHEN $4 THEN CURRENT_DATE ELSE NULL END,
       "UpdatedBy" = $5, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $6 RETURNING *`,
      [countedCount, varianceItems, varianceValue, allCounted, userId, id]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    console.error("Error recording count:", error);
    res.status(500).json({ message: "Failed to record count result", error: error.message });
  }
};

const deleteCycleCount = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "CycleCount" SET "IsDeleted" = true WHERE "Id" = $1`, [id]);
    res.json({ message: "Cycle count deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete cycle count", error: error.message });
  }
};

module.exports = {
  // Putaway
  createPutawayTask, getPutawayTasks, completePutawayTask, deletePutawayTask,
  // Picking
  createPickingList, getPickingLists, getPickingListById, confirmPicking, deletePickingList,
  // Cycle Count
  createCycleCount, getCycleCounts, getCycleCountById, recordCountResult, deleteCycleCount,
};
