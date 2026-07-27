const { appPool } = require("../../config/db");

// @desc    Get all cost adjustments
// @route   GET /api/stock-valuation/adjustments
// @access  Private
const getAllCostAdjustments = async (req, res) => {
  try {
    const { productId, adjustmentType, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ca.*, p."ProductName", p."SKU", w."WarehouseName"
      FROM "CostAdjustment" ca
      LEFT JOIN "Products" p ON ca."ProductId" = p."Id"
      LEFT JOIN "Warehouses" w ON ca."WarehouseId" = w."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (productId) { idx++; query += ` AND ca."ProductId" = $${idx}`; params.push(productId); }
    if (adjustmentType) { idx++; query += ` AND ca."AdjustmentType" = $${idx}`; params.push(adjustmentType); }
    if (status) { idx++; query += ` AND ca."Status" = $${idx}`; params.push(status); }

    query += ` ORDER BY ca."CreatedAt" DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching cost adjustments:", error);
    res.status(500).json({ message: "Failed to fetch cost adjustments", error: error.message });
  }
};

// @desc    Get cost adjustment by ID
// @route   GET /api/stock-valuation/adjustments/:id
// @access  Private
const getCostAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT ca.*, p."ProductName", p."SKU", w."WarehouseName"
       FROM "CostAdjustment" ca
       LEFT JOIN "Products" p ON ca."ProductId" = p."Id"
       LEFT JOIN "Warehouses" w ON ca."WarehouseId" = w."Id"
       WHERE ca."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cost adjustment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching cost adjustment:", error);
    res.status(500).json({ message: "Failed to fetch cost adjustment", error: error.message });
  }
};

// @desc    Create cost adjustment
// @route   POST /api/stock-valuation/adjustments
// @access  Private
const createCostAdjustment = async (req, res) => {
  try {
    const {
      productId, warehouseId, adjustmentType, oldCost, newCost,
      adjustmentAmount, reason, referenceDocument, referenceId
    } = req.body;
    const userId = req.user?.UserId;

    // Validate required fields
    if (!productId || !adjustmentType || oldCost === undefined || newCost === undefined) {
      return res.status(400).json({
        message: "ProductId, adjustmentType, oldCost, and newCost are required"
      });
    }

    // Calculate adjustment amount if not provided
    const calculatedAmount = adjustmentAmount !== undefined
      ? adjustmentAmount
      : parseFloat(newCost) - parseFloat(oldCost);

    const result = await appPool.query(
      `INSERT INTO "CostAdjustment"
       ("ProductId", "WarehouseId", "AdjustmentType", "OldCost", "NewCost",
        "AdjustmentAmount", "Reason", "ReferenceDocument", "ReferenceId",
        "Status", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending', $10, $10)
       RETURNING *`,
      [
        productId, warehouseId || null, adjustmentType, oldCost, newCost,
        calculatedAmount, reason || null, referenceDocument || null,
        referenceId || null, userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating cost adjustment:", error);
    res.status(500).json({ message: "Failed to create cost adjustment", error: error.message });
  }
};

// @desc    Update cost adjustment
// @route   PUT /api/stock-valuation/adjustments/:id
// @access  Private
const updateCostAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      adjustmentType, oldCost, newCost, adjustmentAmount,
      reason, referenceDocument, referenceId, status
    } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "CostAdjustment"
       SET "AdjustmentType" = COALESCE($1, "AdjustmentType"),
           "OldCost" = COALESCE($2, "OldCost"),
           "NewCost" = COALESCE($3, "NewCost"),
           "AdjustmentAmount" = COALESCE($4, "AdjustmentAmount"),
           "Reason" = COALESCE($5, "Reason"),
           "ReferenceDocument" = COALESCE($6, "ReferenceDocument"),
           "ReferenceId" = COALESCE($7, "ReferenceId"),
           "Status" = COALESCE($8, "Status"),
           "UpdatedBy" = $9,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $10
       RETURNING *`,
      [
        adjustmentType, oldCost, newCost, adjustmentAmount,
        reason, referenceDocument, referenceId, status, userId, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cost adjustment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating cost adjustment:", error);
    res.status(500).json({ message: "Failed to update cost adjustment", error: error.message });
  }
};

// @desc    Approve cost adjustment
// @route   POST /api/stock-valuation/adjustments/:id/approve
// @access  Private
const approveCostAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const checkResult = await appPool.query(
      `SELECT * FROM "CostAdjustment" WHERE "Id" = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Cost adjustment not found" });
    }

    const adjustment = checkResult.rows[0];

    if (adjustment.Status === 'Approved') {
      return res.status(400).json({ message: "Cost adjustment is already approved" });
    }

    // Update the stock valuation with the new cost
    await appPool.query(
      `UPDATE "StockValuation"
       SET "CurrentCost" = $1,
           "AverageCost" = $1,
           "TotalValue" = $1 * "TotalStock",
           "LastCalculatedAt" = CURRENT_TIMESTAMP,
           "UpdatedBy" = $2,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "ProductId" = $3 AND "WarehouseId" = $4`,
      [adjustment.NewCost, userId, adjustment.ProductId, adjustment.WarehouseId]
    );

    // Approve the adjustment
    const result = await appPool.query(
      `UPDATE "CostAdjustment"
       SET "Status" = 'Approved',
           "ApprovedBy" = $1,
           "ApprovedAt" = CURRENT_TIMESTAMP,
           "UpdatedBy" = $1,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $2
       RETURNING *`,
      [userId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error approving cost adjustment:", error);
    res.status(500).json({ message: "Failed to approve cost adjustment", error: error.message });
  }
};

// @desc    Delete cost adjustment
// @route   DELETE /api/stock-valuation/adjustments/:id
// @access  Private
const deleteCostAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`DELETE FROM "CostAdjustment" WHERE "Id" = $1`, [id]);
    res.json({ message: "Cost adjustment deleted successfully" });
  } catch (error) {
    console.error("Error deleting cost adjustment:", error);
    res.status(500).json({ message: "Failed to delete cost adjustment", error: error.message });
  }
};

module.exports = {
  getAllCostAdjustments,
  getCostAdjustmentById,
  createCostAdjustment,
  updateCostAdjustment,
  approveCostAdjustment,
  deleteCostAdjustment,
};
