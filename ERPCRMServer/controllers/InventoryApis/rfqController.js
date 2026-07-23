const { appPool } = require("../../config/db");

// @desc    Create RFQ
// @route   POST /api/rfqs
// @access  Private
const createRFQ = async (req, res) => {
  try {
    const { companyId, title, description, priority, expectedDeliveryDate, validUntil, notes, items, vendors } = req.body;
    const userId = req.user?.UserId;

    if (!title || !items || items.length === 0) {
      return res.status(400).json({ message: "Title and at least one item are required" });
    }

    const rfqNumber = `RFQ-${Date.now()}`;

    // Calculate totals
    let subTotal = 0;
    let taxAmount = 0;
    for (const item of items) {
      const itemTotal = (item.quantity || 0) * (item.expectedUnitPrice || 0);
      const itemTax = itemTotal * ((item.taxRate || 0) / 100);
      subTotal += itemTotal;
      taxAmount += itemTax;
    }
    const totalAmount = subTotal + taxAmount;

    const result = await appPool.query(
      `INSERT INTO "RFQ" ("CompanyId", "RFQNumber", "Title", "Description", "Status", "Priority", "ExpectedDeliveryDate", "ValidUntil", "SubTotal", "TaxAmount", "TotalAmount", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, $8, $9, $10, $11, $12, $12) RETURNING *`,
      [companyId || null, rfqNumber, title, description || null, priority || 'Normal', expectedDeliveryDate || null, validUntil || null, subTotal, taxAmount, totalAmount, notes || null, userId]
    );

    const rfqId = result.rows[0].Id;

    // Insert items
    for (const item of items) {
      const itemTotal = (item.quantity || 0) * (item.expectedUnitPrice || 0);
      const itemTax = itemTotal * ((item.taxRate || 0) / 100);
      await appPool.query(
        `INSERT INTO "RFQItems" ("RFQId", "ProductId", "ProductName", "SKU", "Description", "Quantity", "UnitId", "ExpectedUnitPrice", "TaxRate", "TaxAmount", "TotalAmount", "Notes", "CreatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [rfqId, item.productId || null, item.productName || null, item.sku || null, item.description || null, item.quantity, item.unitId || null, item.expectedUnitPrice || 0, item.taxRate || 0, itemTax, itemTotal + itemTax, item.notes || null, userId]
      );
    }

    // Insert vendors
    if (vendors && vendors.length > 0) {
      for (const vendorId of vendors) {
        await appPool.query(
          `INSERT INTO "RFQVendors" ("RFQId", "SupplierId", "Status", "CreatedBy") VALUES ($1, $2, 'Invited', $3)`,
          [rfqId, vendorId, userId]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating RFQ:", error);
    res.status(500).json({ message: "Failed to create RFQ", error: error.message });
  }
};

// @desc    Get all RFQs
// @route   GET /api/rfqs
// @access  Private
const getRFQs = async (req, res) => {
  try {
    const { status, companyId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT r.*, 
      (SELECT json_agg(json_build_object('Id', ri."Id", 'ProductName', ri."ProductName", 'Quantity', ri."Quantity", 'ExpectedUnitPrice', ri."ExpectedUnitPrice", 'TotalAmount', ri."TotalAmount")) FROM "RFQItems" ri WHERE ri."RFQId" = r."Id") as "Items",
      (SELECT json_agg(json_build_object('Id', rv."Id", 'SupplierId', rv."SupplierId", 'Status', rv."Status", 'QuotedAmount', rv."QuotedAmount")) FROM "RFQVendors" rv WHERE rv."RFQId" = r."Id") as "Vendors"
      FROM "RFQ" r WHERE r."IsDeleted" = false`;
    const params = [];

    if (status) {
      query += ` AND r."Status" = $${params.length + 1}`;
      params.push(status);
    }
    if (companyId) {
      query += ` AND r."CompanyId" = $${params.length + 1}`;
      params.push(companyId);
    }

    query += ` ORDER BY r."CreatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching RFQs:", error);
    res.status(500).json({ message: "Failed to fetch RFQs", error: error.message });
  }
};

// @desc    Get RFQ by ID
// @route   GET /api/rfqs/:id
// @access  Private
const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT r.*,
        (SELECT json_agg(ri.*) FROM "RFQItems" ri WHERE ri."RFQId" = r."Id" AND ri."IsDeleted" = false) as "Items",
        (SELECT json_agg(rv.*) FROM "RFQVendors" rv WHERE rv."RFQId" = r."Id") as "Vendors"
       FROM "RFQ" r WHERE r."Id" = $1 AND r."IsDeleted" = false`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching RFQ:", error);
    res.status(500).json({ message: "Failed to fetch RFQ", error: error.message });
  }
};

// @desc    Send RFQ to vendors
// @route   POST /api/rfqs/:id/send
// @access  Private
const sendRFQToVendors = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "RFQ" SET "Status" = 'Sent', "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2 AND "IsDeleted" = false RETURNING *`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error sending RFQ:", error);
    res.status(500).json({ message: "Failed to send RFQ", error: error.message });
  }
};

// @desc    Submit vendor response
// @route   POST /api/rfqs/:id/vendor-response
// @access  Private
const submitVendorResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, quotedAmount, deliveryDays, responseNotes } = req.body;

    const result = await appPool.query(
      `UPDATE "RFQVendors" SET "Status" = 'Responded', "ResponseDate" = CURRENT_TIMESTAMP, "QuotedAmount" = $1, "DeliveryDays" = $2, "ResponseNotes" = $3, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "RFQId" = $4 AND "SupplierId" = $5 RETURNING *`,
      [quotedAmount, deliveryDays, responseNotes, id, supplierId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found for this RFQ" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error submitting vendor response:", error);
    res.status(500).json({ message: "Failed to submit vendor response", error: error.message });
  }
};

// @desc    Select vendor and convert to PO
// @route   POST /api/rfqs/:id/select-vendor
// @access  Private
const selectVendorAndConvert = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId } = req.body;
    const userId = req.user?.UserId;

    // Deselect all other vendors
    await appPool.query(`UPDATE "RFQVendors" SET "IsSelected" = false WHERE "RFQId" = $1`, [id]);

    // Select this vendor
    await appPool.query(
      `UPDATE "RFQVendors" SET "IsSelected" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "RFQId" = $1 AND "SupplierId" = $2`,
      [id, supplierId]
    );

    // Update RFQ status
    await appPool.query(
      `UPDATE "RFQ" SET "Status" = 'Ordered', "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    // Get RFQ details for PO creation
    const rfqResult = await appPool.query(
      `SELECT * FROM "RFQ" WHERE "Id" = $1`,
      [id]
    );
    const rfq = rfqResult.rows[0];

    const itemsResult = await appPool.query(
      `SELECT * FROM "RFQItems" WHERE "RFQId" = $1 AND "IsDeleted" = false`,
      [id]
    );

    // Create Purchase Order
    const poNumber = `PO-${Date.now()}`;
    const poResult = await appPool.query(
      `INSERT INTO "PurchaseOrders" ("CompanyId", "PONumber", "SupplierId", "OrderDate", "ExpectedDeliveryDate", "Status", "SubTotal", "TaxAmount", "TotalAmount", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'Pending', $5, $6, $7, $8, $9, $9) RETURNING *`,
      [rfq.CompanyId, poNumber, supplierId, rfq.ExpectedDeliveryDate, rfq.SubTotal, rfq.TaxAmount, rfq.TotalAmount, `Created from RFQ: ${rfq.RFQNumber}`, userId]
    );

    const poId = poResult.rows[0].Id;

    // Create PO items
    for (const item of itemsResult.rows) {
      await appPool.query(
        `INSERT INTO "PurchaseOrderItems" ("PurchaseOrderId", "ProductId", "ProductName", "SKU", "Quantity", "UnitPrice", "TaxRate", "TaxAmount", "TotalAmount", "CreatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [poId, item.ProductId, item.ProductName, item.SKU, item.Quantity, item.ExpectedUnitPrice, item.TaxRate, item.TaxAmount, item.TotalAmount, userId]
      );
    }

    res.json({ message: "Vendor selected and PO created", purchaseOrder: poResult.rows[0] });
  } catch (error) {
    console.error("Error selecting vendor:", error);
    res.status(500).json({ message: "Failed to select vendor", error: error.message });
  }
};

// @desc    Delete RFQ
// @route   DELETE /api/rfqs/:id
// @access  Private
const deleteRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "RFQ" SET "IsDeleted" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1`, [id]);
    res.json({ message: "RFQ deleted successfully" });
  } catch (error) {
    console.error("Error deleting RFQ:", error);
    res.status(500).json({ message: "Failed to delete RFQ", error: error.message });
  }
};

module.exports = {
  createRFQ,
  getRFQs,
  getRFQById,
  sendRFQToVendors,
  submitVendorResponse,
  selectVendorAndConvert,
  deleteRFQ,
};