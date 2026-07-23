const { appPool } = require("../../config/db");

// @desc    Create price list
// @route   POST /api/price-lists
// @access  Private
const createPriceList = async (req, res) => {
  try {
    const { companyId, name, description, type, effectiveFrom, effectiveTo, currency, priceType, markupPercentage, items, customerIds } = req.body;
    const userId = req.user?.UserId;

    if (!name) return res.status(400).json({ message: "Name is required" });

    const result = await appPool.query(
      `INSERT INTO "PriceList" ("CompanyId", "Name", "Description", "Type", "IsActive", "EffectiveFrom", "EffectiveTo", "Currency", "PriceType", "MarkupPercentage", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10, $10) RETURNING *`,
      [companyId || null, name, description || null, type || 'Sales', effectiveFrom || null, effectiveTo || null, currency || 'INR', priceType || 'Fixed', markupPercentage || 0, userId]
    );

    const priceListId = result.rows[0].Id;

    // Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        await appPool.query(
          `INSERT INTO "PriceListItem" ("PriceListId", "ProductId", "UnitPrice", "MinQuantity", "MaxQuantity", "DiscountPercentage", "EffectiveFrom", "EffectiveTo", "CreatedBy", "UpdatedBy")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [priceListId, item.productId, item.unitPrice, item.minQuantity || 1, item.maxQuantity || null, item.discountPercentage || 0, item.effectiveFrom || null, item.effectiveTo || null, userId]
        );
      }
    }

    // Link customers
    if (customerIds && customerIds.length > 0) {
      for (const customerId of customerIds) {
        await appPool.query(
          `INSERT INTO "PriceListCustomer" ("PriceListId", "CustomerId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [priceListId, customerId]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating price list:", error);
    res.status(500).json({ message: "Failed to create price list", error: error.message });
  }
};

// @desc    Get all price lists
// @route   GET /api/price-lists
// @access  Private
const getPriceLists = async (req, res) => {
  try {
    const { type, companyId, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT pl.* FROM "PriceList" pl WHERE pl."IsDeleted" = false`;
    const params = [];

    if (type) { query += ` AND pl."Type" = $${params.length + 1}`; params.push(type); }
    if (companyId) { query += ` AND pl."CompanyId" = $${params.length + 1}`; params.push(companyId); }
    if (isActive !== undefined) { query += ` AND pl."IsActive" = $${params.length + 1}`; params.push(isActive === 'true'); }

    query += ` ORDER BY pl."CreatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching price lists:", error);
    res.status(500).json({ message: "Failed to fetch price lists", error: error.message });
  }
};

// @desc    Get price list by ID
// @route   GET /api/price-lists/:id
// @access  Private
const getPriceListById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT pl.*,
        (SELECT json_agg(pli.*) FROM "PriceListItem" pli WHERE pli."PriceListId" = pl."Id") as "Items",
        (SELECT json_agg(plc.*) FROM "PriceListCustomer" plc WHERE plc."PriceListId" = pl."Id") as "Customers"
       FROM "PriceList" pl WHERE pl."Id" = $1 AND pl."IsDeleted" = false`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Price list not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching price list:", error);
    res.status(500).json({ message: "Failed to fetch price list", error: error.message });
  }
};

// @desc    Get effective price for a product
// @route   GET /api/price-lists/effective/:productId
// @access  Private
const getEffectivePrice = async (req, res) => {
  try {
    const { productId } = req.params;
    const { customerId, quantity } = req.query;

    let query = `
      SELECT pli."UnitPrice", pli."DiscountPercentage", pl."Name" as "PriceListName"
      FROM "PriceListItem" pli
      JOIN "PriceList" pl ON pli."PriceListId" = pl."Id"
      WHERE pli."ProductId" = $1 AND pl."IsActive" = true AND pl."IsDeleted" = false
      AND (pl."EffectiveFrom" IS NULL OR pl."EffectiveFrom" <= CURRENT_DATE)
      AND (pl."EffectiveTo" IS NULL OR pl."EffectiveTo" >= CURRENT_DATE)
    `;
    const params = [productId];

    if (customerId) {
      query += ` AND (pl."Id" IN (SELECT "PriceListId" FROM "PriceListCustomer" WHERE "CustomerId" = $${params.length + 1}) OR pl."IsDefault" = true)`;
      params.push(customerId);
    }

    if (quantity) {
      query += ` AND (pli."MinQuantity" <= $${params.length + 1} AND (pli."MaxQuantity" IS NULL OR pli."MaxQuantity" >= $${params.length + 1}))`;
      params.push(quantity);
    }

    query += ` ORDER BY pli."UnitPrice" ASC LIMIT 1`;

    const result = await appPool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: "No effective price found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching effective price:", error);
    res.status(500).json({ message: "Failed to fetch effective price", error: error.message });
  }
};

// @desc    Update price list
// @route   PUT /api/price-lists/:id
// @access  Private
const updatePriceList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, effectiveFrom, effectiveTo, isActive } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "PriceList" SET "Name" = COALESCE($1, "Name"), "Description" = COALESCE($2, "Description"), "EffectiveFrom" = COALESCE($3, "EffectiveFrom"), "EffectiveTo" = COALESCE($4, "EffectiveTo"), "IsActive" = COALESCE($5, "IsActive"), "UpdatedBy" = $6, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $7 AND "IsDeleted" = false RETURNING *`,
      [name || null, description || null, effectiveFrom || null, effectiveTo || null, isActive, userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Price list not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating price list:", error);
    res.status(500).json({ message: "Failed to update price list", error: error.message });
  }
};

// @desc    Delete price list
// @route   DELETE /api/price-lists/:id
// @access  Private
const deletePriceList = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "PriceList" SET "IsDeleted" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1`, [id]);
    res.json({ message: "Price list deleted successfully" });
  } catch (error) {
    console.error("Error deleting price list:", error);
    res.status(500).json({ message: "Failed to delete price list", error: error.message });
  }
};

module.exports = { createPriceList, getPriceLists, getPriceListById, getEffectivePrice, updatePriceList, deletePriceList };