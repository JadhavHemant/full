const { appPool } = require("../../config/db");

// @desc    Get all landed costs
// @route   GET /api/stock-valuation/landed-costs
// @access  Private
const getAllLandedCosts = async (req, res) => {
  try {
    const { productId, purchaseOrderId, grnId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT lc.*, p."ProductName", p."SKU", po."OrderNumber" as "PONumber"
      FROM "LandedCost" lc
      LEFT JOIN "Products" p ON lc."ProductId" = p."Id"
      LEFT JOIN "PurchaseOrders" po ON lc."PurchaseOrderId" = po."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (productId) { idx++; query += ` AND lc."ProductId" = $${idx}`; params.push(productId); }
    if (purchaseOrderId) { idx++; query += ` AND lc."PurchaseOrderId" = $${idx}`; params.push(purchaseOrderId); }
    if (grnId) { idx++; query += ` AND lc."GRNId" = $${idx}`; params.push(grnId); }

    query += ` ORDER BY lc."CreatedAt" DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching landed costs:", error);
    res.status(500).json({ message: "Failed to fetch landed costs", error: error.message });
  }
};

// @desc    Get landed cost by ID
// @route   GET /api/stock-valuation/landed-costs/:id
// @access  Private
const getLandedCostById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT lc.*, p."ProductName", p."SKU", po."OrderNumber" as "PONumber"
       FROM "LandedCost" lc
       LEFT JOIN "Products" p ON lc."ProductId" = p."Id"
       LEFT JOIN "PurchaseOrders" po ON lc."PurchaseOrderId" = po."Id"
       WHERE lc."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Landed cost not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching landed cost:", error);
    res.status(500).json({ message: "Failed to fetch landed cost", error: error.message });
  }
};

// @desc    Create landed cost
// @route   POST /api/stock-valuation/landed-costs
// @access  Private
const createLandedCost = async (req, res) => {
  try {
    const {
      productId, purchaseOrderId, grnId, costType, amount,
      currency, exchangeRate, description, allocationMethod
    } = req.body;
    const userId = req.user?.UserId;

    const amountInBaseCurrency = (amount || 0) * (exchangeRate || 1);

    const result = await appPool.query(
      `INSERT INTO "LandedCost"
       ("ProductId", "PurchaseOrderId", "GRNId", "CostType", "Amount",
        "Currency", "ExchangeRate", "AmountInBaseCurrency", "Description",
        "AllocationMethod", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING *`,
      [
        productId, purchaseOrderId || null, grnId || null, costType, amount,
        currency || 'INR', exchangeRate || 1, amountInBaseCurrency,
        description || null, allocationMethod || 'ByQuantity', userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating landed cost:", error);
    res.status(500).json({ message: "Failed to create landed cost", error: error.message });
  }
};

// @desc    Update landed cost
// @route   PUT /api/stock-valuation/landed-costs/:id
// @access  Private
const updateLandedCost = async (req, res) => {
  try {
    const { id } = req.params;
    const { costType, amount, currency, exchangeRate, description, allocationMethod } = req.body;
    const userId = req.user?.UserId;

    const amountInBaseCurrency = (amount || 0) * (exchangeRate || 1);

    const result = await appPool.query(
      `UPDATE "LandedCost"
       SET "CostType" = COALESCE($1, "CostType"),
           "Amount" = COALESCE($2, "Amount"),
           "Currency" = COALESCE($3, "Currency"),
           "ExchangeRate" = COALESCE($4, "ExchangeRate"),
           "AmountInBaseCurrency" = COALESCE($5, "AmountInBaseCurrency"),
           "Description" = COALESCE($6, "Description"),
           "AllocationMethod" = COALESCE($7, "AllocationMethod"),
           "UpdatedBy" = $8,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $9
       RETURNING *`,
      [
        costType, amount, currency, exchangeRate, amountInBaseCurrency,
        description, allocationMethod, userId, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Landed cost not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating landed cost:", error);
    res.status(500).json({ message: "Failed to update landed cost", error: error.message });
  }
};

// @desc    Allocate landed costs to products
// @route   POST /api/stock-valuation/landed-costs/allocate
// @access  Private
const allocateLandedCosts = async (req, res) => {
  try {
    const { purchaseOrderId, grnId } = req.body;
    const userId = req.user?.UserId;

    // Get unallocated landed costs
    const costs = await appPool.query(
      `SELECT * FROM "LandedCost" WHERE "IsAllocated" = FALSE AND ("PurchaseOrderId" = $1 OR "GRNId" = $2)`,
      [purchaseOrderId, grnId]
    );

    if (costs.rows.length === 0) {
      return res.status(400).json({ message: "No unallocated landed costs found" });
    }

    // Get GRN items to allocate across
    let grnItems;
    if (grnId) {
      grnItems = await appPool.query(
        `SELECT gi."ProductId", gi."Quantity", gi."Id"
         FROM "GRN" g
         JOIN "PurchaseOrderItems" gi ON g."PurchaseOrderId" = gi."PurchaseOrderId"
         AND gi."ProductId" IN (SELECT "ProductId" FROM "LandedCost" WHERE "GRNId" = $1 AND "IsAllocated" = FALSE)
         WHERE g."Id" = $1`,
        [grnId]
      );
    } else {
      grnItems = await appPool.query(
        `SELECT gi."ProductId", gi."Quantity"
         FROM "PurchaseOrderItems" gi
         WHERE gi."PurchaseOrderId" = $1
         AND gi."ProductId" IN (SELECT DISTINCT "ProductId" FROM "LandedCost" WHERE "PurchaseOrderId" = $1 AND "IsAllocated" = FALSE)`,
        [purchaseOrderId]
      );
    }

    if (grnItems.rows.length === 0) {
      return res.status(400).json({ message: "No GRN items found for allocation" });
    }

    const totalQty = grnItems.rows.reduce((sum, item) => sum + parseInt(item.Quantity), 0);
    let allocatedCount = 0;

    // Allocate each cost across products proportionally
    for (const cost of costs.rows) {
      for (const item of grnItems.rows) {
        const allocationAmount = (parseFloat(cost.AmountInBaseCurrency) * parseInt(item.Quantity)) / totalQty;

        // Fixed: Use correct column names matching the CostAdjustment model
        await appPool.query(
          `INSERT INTO "CostAdjustment"
           ("ProductId", "WarehouseId", "AdjustmentType", "OldCost", "NewCost",
            "AdjustmentAmount", "Reason", "ReferenceDocument", "ReferenceId",
            "Status", "CreatedBy", "UpdatedBy")
           VALUES ($1, NULL, 'LandedCost', 0, 0, $2, $3, 'PurchaseOrder', $4, 'Pending', $5, $5)`,
          [
            item.ProductId,
            allocationAmount,
            `Allocated landed cost: ${cost.Description || cost.CostType}`,
            purchaseOrderId,
            userId
          ]
        );
      }

      // Mark landed cost as allocated
      await appPool.query(
        `UPDATE "LandedCost" SET "IsAllocated" = TRUE, "AllocatedAt" = CURRENT_TIMESTAMP, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
        [userId, cost.Id]
      );
      allocatedCount++;
    }

    res.json({ message: `Successfully allocated ${allocatedCount} landed cost(s) across ${grnItems.rows.length} products` });
  } catch (error) {
    console.error("Error allocating landed costs:", error);
    res.status(500).json({ message: "Failed to allocate landed costs", error: error.message });
  }
};

// @desc    Delete landed cost
// @route   DELETE /api/stock-valuation/landed-costs/:id
// @access  Private
const deleteLandedCost = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`DELETE FROM "LandedCost" WHERE "Id" = $1`, [id]);
    res.json({ message: "Landed cost deleted successfully" });
  } catch (error) {
    console.error("Error deleting landed cost:", error);
    res.status(500).json({ message: "Failed to delete landed cost", error: error.message });
  }
};

module.exports = {
  getAllLandedCosts,
  getLandedCostById,
  createLandedCost,
  updateLandedCost,
  allocateLandedCosts,
  deleteLandedCost,
};
