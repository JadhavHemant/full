const { appPool } = require("../../config/db");

// @desc    Perform 3-way matching (PO vs GRN vs Invoice)
// @route   POST /api/invoice-matching
// @access  Private
const performMatching = async (req, res) => {
  try {
    const { purchaseOrderId, grnId, invoiceId, varianceThreshold } = req.body;
    const userId = req.user?.UserId;

    if (!purchaseOrderId) return res.status(400).json({ message: "PurchaseOrderId is required" });

    // Get PO data
    const poResult = await appPool.query(`
      SELECT po.*, 
        (SELECT json_agg(poi.*) FROM "PurchaseOrderItems" poi WHERE poi."PurchaseOrderId" = po."Id") as "Items"
      FROM "PurchaseOrders" po WHERE po."Id" = $1`, [purchaseOrderId]);
    if (poResult.rows.length === 0) return res.status(404).json({ message: "Purchase order not found" });
    const po = poResult.rows[0];

    // Get GRN data if provided
    let grnData = null;
    let grnItems = [];
    if (grnId) {
      const grnResult = await appPool.query(`
        SELECT g.*, 
          (SELECT json_agg(gi.*) FROM "GRNItems" gi WHERE gi."GRNId" = g."Id") as "Items"
        FROM "GRN" g WHERE g."Id" = $1`, [grnId]);
      if (grnResult.rows.length > 0) {
        grnData = grnResult.rows[0];
        grnItems = grnData.Items || [];
      }
    }

    // Get Invoice data if provided
    let invoiceData = null;
    let invoiceItems = [];
    if (invoiceId) {
      const invResult = await appPool.query(`
        SELECT i.*,
          (SELECT json_agg(ii.*) FROM "InvoiceItems" ii WHERE ii."InvoiceId" = i."Id") as "Items"
        FROM "Invoices" i WHERE i."Id" = $1`, [invoiceId]);
      if (invResult.rows.length > 0) {
        invoiceData = invResult.rows[0];
        invoiceItems = invoiceData.Items || [];
      }
    }

    // Calculate variances
    const poItems = po.Items || [];
    let totalVariance = 0;
    let matchLines = [];

    for (const poItem of poItems) {
      const grnItem = grnItems.find(g => g.ProductId === poItem.ProductId);
      const invItem = invoiceItems.find(i => i.ProductId === poItem.ProductId);

      const poQty = poItem.Quantity || 0;
      const poPrice = poItem.UnitPrice || 0;
      const poTotal = poQty * poPrice;

      const grnQty = grnItem?.Quantity || 0;
      const grnAccepted = grnItem?.AcceptedQuantity || grnQty;
      const invQty = invItem?.Quantity || 0;
      const invPrice = invItem?.UnitPrice || 0;
      const invTotal = invQty * invPrice;

      const qtyVariance = poQty - (grnQty || invQty);
      const priceVariance = poPrice - invPrice;
      const lineVariance = poTotal - invTotal;
      totalVariance += lineVariance;

      matchLines.push({
        productId: poItem.ProductId,
        poQuantity: poQty,
        poUnitPrice: poPrice,
        poTotal,
        grnQuantity: grnQty,
        grnAcceptedQuantity: grnAccepted,
        invoiceQuantity: invQty,
        invoiceUnitPrice: invPrice,
        invoiceTotal: invTotal,
        quantityVariance: qtyVariance,
        priceVariance,
        totalVariance: lineVariance,
        status: Math.abs(lineVariance) <= (varianceThreshold || 0) ? 'Matched' : 'Variance',
      });
    }

    const variancePct = po.TotalAmount > 0 ? (totalVariance / po.TotalAmount) * 100 : 0;
    const matchStatus = Math.abs(variancePct) <= 5 ? 'Matched' : 'Variance';

    // Create match record
    const matchResult = await appPool.query(`
      INSERT INTO "InvoiceMatch" ("PurchaseOrderId", "GRNId", "InvoiceId", "MatchStatus", "POTotal", "GRNTotal", "InvoiceTotal", "VarianceThreshold", "TotalVariance", "VariancePercentage", "ApprovalStatus", "CreatedBy", "UpdatedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, $11) RETURNING *`,
      [purchaseOrderId, grnId || null, invoiceId || null, matchStatus, po.TotalAmount || 0, grnData?.TotalAmount || 0, invoiceData?.TotalAmount || 0, varianceThreshold || 0, totalVariance, variancePct, userId]
    );

    const matchId = matchResult.rows[0].Id;

    // Insert match lines
    for (const line of matchLines) {
      await appPool.query(`
        INSERT INTO "InvoiceMatchLine" ("InvoiceMatchId", "ProductId", "POQuantity", "POUnitPrice", "POTotal", "GRNQuantity", "GRNAcceptedQuantity", "InvoiceQuantity", "InvoiceUnitPrice", "InvoiceTotal", "QuantityVariance", "PriceVariance", "TotalVariance", "Status", "Notes")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [matchId, line.productId, line.poQuantity, line.poUnitPrice, line.poTotal, line.grnQuantity, line.grnAcceptedQuantity, line.invoiceQuantity, line.invoiceUnitPrice, line.invoiceTotal, line.quantityVariance, line.priceVariance, line.totalVariance, line.status, null]
      );
    }

    res.status(201).json(matchResult.rows[0]);
  } catch (error) {
    console.error("Error performing matching:", error);
    res.status(500).json({ message: "Failed to perform matching", error: error.message });
  }
};

// @desc    Get all matches
// @route   GET /api/invoice-matching
// @access  Private
const getMatches = async (req, res) => {
  try {
    const { matchStatus, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT im.*, po."PONumber" FROM "InvoiceMatch" im LEFT JOIN "PurchaseOrders" po ON im."PurchaseOrderId" = po."Id" WHERE 1=1`;
    const params = [];
    if (matchStatus) { query += ` AND im."MatchStatus" = $${params.length + 1}`; params.push(matchStatus); }
    query += ` ORDER BY im."CreatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Failed to fetch matches", error: error.message });
  }
};

// @desc    Approve match
// @route   POST /api/invoice-matching/:id/approve
// @access  Private
const approveMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;
    const result = await appPool.query(
      `UPDATE "InvoiceMatch" SET "ApprovalStatus" = 'Approved', "ApprovedBy" = $1, "ApprovedAt" = CURRENT_TIMESTAMP, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2 RETURNING *`,
      [userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Match not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error approving match:", error);
    res.status(500).json({ message: "Failed to approve match", error: error.message });
  }
};

module.exports = { performMatching, getMatches, approveMatch };