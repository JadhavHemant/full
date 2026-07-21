// controllers/InventoryApis/purchaseOrderItems.js
const { appPool } = require("../../config/db");

// Helper: Validate PO Item
const validatePOItem = (data, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!data.PurchaseOrderId) errors.push("PurchaseOrderId is required");
        if (!data.ProductId) errors.push("ProductId is required");
    }

    if (data.Quantity !== undefined) {
        const qty = parseInt(data.Quantity);
        if (isNaN(qty) || qty <= 0) {
            errors.push("Quantity must be a positive number");
        }
    }

    if (data.UnitCost !== undefined) {
        const cost = parseFloat(data.UnitCost);
        if (isNaN(cost) || cost < 0) {
            errors.push("UnitCost must be a non-negative number");
        }
    }

    if (data.ReceivedQuantity !== undefined) {
        const recQty = parseInt(data.ReceivedQuantity);
        if (isNaN(recQty) || recQty < 0) {
            errors.push("ReceivedQuantity cannot be negative");
        }
    }

    return { valid: errors.length === 0, errors };
};

// Helper: Check if PO exists and is editable
const checkPOEditable = async (purchaseOrderId) => {
    const result = await appPool.query(
        `SELECT "Status" FROM "PurchaseOrders" WHERE "Id" = $1`,
        [purchaseOrderId]
    );

    if (result.rows.length === 0) {
        throw new Error("Purchase Order not found");
    }

    const status = result.rows[0].Status;
    if (["Received", "Cancelled"].includes(status)) {
        throw new Error(`Cannot modify items for a ${status} purchase order`);
    }

    return true;
};

// Helper: Update PO Total Amount
const updatePOTotalAmount = async (purchaseOrderId) => {
    const query = `
        UPDATE "PurchaseOrders"
        SET "TotalAmount" = (
            SELECT COALESCE(SUM("Quantity" * "UnitCost"), 0)
            FROM "PurchaseOrderItems"
            WHERE "PurchaseOrderId" = $1
        ),
        "UpdatedAt" = CURRENT_TIMESTAMP
        WHERE "Id" = $1;
    `;
    await appPool.query(query, [purchaseOrderId]);
};

// Create PurchaseOrderItem
const createPurchaseOrderItem = async (req, res) => {
    const { PurchaseOrderId, ProductId, Quantity, UnitCost, Notes } = req.body;

    const validation = validatePOItem(req.body, false);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    try {
        // Check if PO is editable
        await checkPOEditable(PurchaseOrderId);

        // Check if product exists
        const productCheck = await appPool.query(
            `SELECT "Id", "Name" FROM "Products" WHERE "Id" = $1`,
            [ProductId]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check for duplicate item
        const duplicateCheck = await appPool.query(
            `SELECT "Id" FROM "PurchaseOrderItems" 
             WHERE "PurchaseOrderId" = $1 AND "ProductId" = $2`,
            [PurchaseOrderId, ProductId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                message: "Product already exists in this purchase order. Please update quantity instead."
            });
        }

        const query = `
            INSERT INTO "PurchaseOrderItems"
            ("PurchaseOrderId", "ProductId", "Quantity", "UnitCost", "Notes")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const { rows } = await appPool.query(query, [
            PurchaseOrderId,
            ProductId,
            Quantity,
            UnitCost,
            Notes || null
        ]);

        // Update PO total amount
        await updatePOTotalAmount(PurchaseOrderId);

        res.status(201).json({
            message: "Purchase order item created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error creating PurchaseOrderItem:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Update PurchaseOrderItem by Id
const updatePurchaseOrderItem = async (req, res) => {
    const { id } = req.params;
    const { Quantity, UnitCost, ReceivedQuantity, Notes } = req.body;

    const validation = validatePOItem(req.body, true);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    try {
        // Get current item to check PO
        const currentItem = await appPool.query(
            `SELECT "PurchaseOrderId" FROM "PurchaseOrderItems" WHERE "Id" = $1`,
            [id]
        );

        if (currentItem.rows.length === 0) {
            return res.status(404).json({ message: "PurchaseOrderItem not found" });
        }

        const purchaseOrderId = currentItem.rows[0].PurchaseOrderId;
        await checkPOEditable(purchaseOrderId);

        const query = `
            UPDATE "PurchaseOrderItems"
            SET 
                "Quantity" = COALESCE($1, "Quantity"),
                "UnitCost" = COALESCE($2, "UnitCost"),
                "ReceivedQuantity" = COALESCE($3, "ReceivedQuantity"),
                "Notes" = COALESCE($4, "Notes")
            WHERE "Id" = $5
            RETURNING *;
        `;

        const { rows } = await appPool.query(query, [
            Quantity || null,
            UnitCost || null,
            ReceivedQuantity !== undefined ? ReceivedQuantity : null,
            Notes !== undefined ? Notes : null,
            id
        ]);

        // Update PO total amount
        await updatePOTotalAmount(purchaseOrderId);

        res.json({
            message: "Purchase order item updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating PurchaseOrderItem:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Bulk Update Received Quantities
const bulkUpdateReceivedQuantities = async (req, res) => {
    const { items } = req.body; // Array of { id, receivedQuantity }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Items array is required and must not be empty"
        });
    }

    const client = await appPool.connect();

    try {
        await client.query("BEGIN");

        const updatedItems = [];

        for (const item of items) {
            const { id, receivedQuantity } = item;

            if (!id || receivedQuantity === undefined) {
                throw new Error("Each item must have id and receivedQuantity");
            }

            const result = await client.query(
                `UPDATE "PurchaseOrderItems"
                 SET "ReceivedQuantity" = $1
                 WHERE "Id" = $2
                 RETURNING *;`,
                [receivedQuantity, id]
            );

            if (result.rows.length > 0) {
                updatedItems.push(result.rows[0]);
            }
        }

        await client.query("COMMIT");

        res.json({
            message: "Received quantities updated successfully",
            data: updatedItems
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error bulk updating received quantities:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    } finally {
        client.release();
    }
};

// Delete PurchaseOrderItem by Id
const deletePurchaseOrderItem = async (req, res) => {
    const { id } = req.params;

    try {
        // Get item to check PO
        const itemResult = await appPool.query(
            `SELECT "PurchaseOrderId" FROM "PurchaseOrderItems" WHERE "Id" = $1`,
            [id]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ message: "PurchaseOrderItem not found" });
        }

        const purchaseOrderId = itemResult.rows[0].PurchaseOrderId;
        await checkPOEditable(purchaseOrderId);

        const query = `DELETE FROM "PurchaseOrderItems" WHERE "Id" = $1 RETURNING *;`;
        const { rows } = await appPool.query(query, [id]);

        // Update PO total amount
        await updatePOTotalAmount(purchaseOrderId);

        res.json({
            message: "Purchase order item deleted successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error deleting PurchaseOrderItem:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Get PurchaseOrderItem by Id with details
const getPurchaseOrderItemById = async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            poi.*,
            p."Name" as "ProductName",
            p."SKU" as "ProductSKU",
            u."UnitName" as "UnitName",
            po."PONumber",
            po."Status" as "POStatus"
        FROM "PurchaseOrderItems" poi
        LEFT JOIN "Products" p ON poi."ProductId" = p."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        LEFT JOIN "PurchaseOrders" po ON poi."PurchaseOrderId" = po."Id"
        WHERE poi."Id" = $1
        LIMIT 1;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "PurchaseOrderItem not found" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching PurchaseOrderItem by Id:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All PurchaseOrderItems by PurchaseOrderId
const getItemsByPurchaseOrderId = async (req, res) => {
    const { purchaseOrderId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
        SELECT 
            poi.*,
            p."Name" as "ProductName",
            p."SKU" as "ProductSKU",
            p."Description" as "ProductDescription",
            u."UnitName" as "UnitName",
            c."Name" as "CategoryName"
        FROM "PurchaseOrderItems" poi
        LEFT JOIN "Products" p ON poi."ProductId" = p."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        LEFT JOIN "Categories" c ON p."CategoryId" = c."Id"
        WHERE poi."PurchaseOrderId" = $1
        ORDER BY poi."Id" ASC
        LIMIT $2 OFFSET $3;
    `;

    const countQuery = `
        SELECT COUNT(*)::int as total
        FROM "PurchaseOrderItems"
        WHERE "PurchaseOrderId" = $1;
    `;

    try {
        const [dataResult, countResult] = await Promise.all([
            appPool.query(query, [purchaseOrderId, limit, offset]),
            appPool.query(countQuery, [purchaseOrderId])
        ]);

        res.json({
            data: dataResult.rows,
            pagination: {
                total: countResult.rows[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error("Error fetching items by PO:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All PurchaseOrderItems with Pagination
const getAllPurchaseOrderItems = async (req, res) => {
    const { limit = 10, offset = 0, productId, status } = req.query;

    const filters = [];
    const values = [];
    let idx = 1;

    if (productId) {
        filters.push(`poi."ProductId" = $${idx++}`);
        values.push(productId);
    }

    if (status) {
        filters.push(`po."Status" = $${idx++}`);
        values.push(status);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
        SELECT 
            poi.*,
            p."Name" as "ProductName",
            p."SKU" as "ProductSKU",
            u."UnitName" as "UnitName",
            po."PONumber",
            po."Status" as "POStatus",
            po."OrderDate",
            s."Name" as "SupplierName"
        FROM "PurchaseOrderItems" poi
        LEFT JOIN "Products" p ON poi."ProductId" = p."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        LEFT JOIN "PurchaseOrders" po ON poi."PurchaseOrderId" = po."Id"
        LEFT JOIN "Suppliers" s ON po."SupplierId" = s."Id"
        ${whereClause}
        ORDER BY poi."CreatedAt" DESC
        LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const countQuery = `
        SELECT COUNT(*)::int as total
        FROM "PurchaseOrderItems" poi
        LEFT JOIN "PurchaseOrders" po ON poi."PurchaseOrderId" = po."Id"
        ${whereClause};
    `;

    try {
        const [dataResult, countResult] = await Promise.all([
            appPool.query(query, values),
            appPool.query(countQuery, values.slice(0, idx - 1))
        ]);

        res.json({
            data: dataResult.rows,
            pagination: {
                total: countResult.rows[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error("Error fetching all PurchaseOrderItems:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Purchase Order Summary (total items, costs, etc.)
const getPurchaseOrderSummary = async (req, res) => {
    const { purchaseOrderId } = req.params;

    const query = `
        SELECT 
            COUNT(*)::int as total_items,
            SUM("Quantity")::int as total_quantity,
            SUM("ReceivedQuantity")::int as total_received,
            SUM("Quantity" * "UnitCost")::decimal as total_cost,
            AVG("UnitCost")::decimal as average_unit_cost,
            MIN("UnitCost")::decimal as min_unit_cost,
            MAX("UnitCost")::decimal as max_unit_cost
        FROM "PurchaseOrderItems"
        WHERE "PurchaseOrderId" = $1;
    `;

    try {
        const { rows } = await appPool.query(query, [purchaseOrderId]);
        res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching PO summary:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createPurchaseOrderItem,
    updatePurchaseOrderItem,
    bulkUpdateReceivedQuantities,
    deletePurchaseOrderItem,
    getPurchaseOrderItemById,
    getItemsByPurchaseOrderId,
    getAllPurchaseOrderItems,
    getPurchaseOrderSummary
};
