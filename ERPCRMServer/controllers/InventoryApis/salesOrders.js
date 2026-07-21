// controllers/InventoryApis/salesOrders.js

const { appPool } = require("../../config/db");

console.log("🛒 Loading Sales Orders Controller");

// Helper: Validate Sales Order
const validateSalesOrder = (data, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!data.CustomerId) errors.push("Customer is required");
        if (!data.OrderDate) errors.push("Order date is required");
    }

    if (data.TotalAmount !== undefined && (isNaN(data.TotalAmount) || data.TotalAmount < 0)) {
        errors.push("Total amount must be a non-negative number");
    }

    if (data.ExpectedDeliveryDate && data.OrderDate) {
        if (new Date(data.ExpectedDeliveryDate) < new Date(data.OrderDate)) {
            errors.push("Expected delivery date cannot be before order date");
        }
    }

    return { valid: errors.length === 0, errors };
};

// Helper: Update SO Total from Items
const updateSOTotal = async (salesOrderId) => {
    const query = `
        UPDATE "SalesOrders"
        SET 
            "TotalAmount" = (
                SELECT COALESCE(SUM("Quantity" * "UnitPrice"), 0)
                FROM "SalesOrderItems"
                WHERE "SalesOrderId" = $1
            ),
            "UpdatedAt" = CURRENT_TIMESTAMP
        WHERE "Id" = $1;
    `;
    await appPool.query(query, [salesOrderId]);
};

// Create Sales Order
const createSalesOrder = async (req, res) => {
    const {
        CustomerId, OrderDate, ExpectedDeliveryDate, Status, Priority,
        TotalAmount, TaxAmount, DiscountAmount, PaymentMethod,
        ShippingAddress, BillingAddress, Notes, InternalNotes, CompanyId
    } = req.body;

    const validation = validateSalesOrder(req.body, false);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    const query = `
        INSERT INTO "SalesOrders"
        ("CustomerId", "CustomerName", "OrderDate", "ExpectedDeliveryDate", "Status", "Priority",
         "TotalAmount", "TaxAmount", "DiscountAmount", "PaymentMethod",
         "ShippingAddress", "BillingAddress", "Notes", "InternalNotes", "CompanyId", "CreatedBy")
        VALUES ($1, (SELECT "Name" FROM "Customers" WHERE "Id" = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [
            CustomerId,
            OrderDate || new Date(),
            ExpectedDeliveryDate || null,
            Status || 'Draft',
            Priority || 'Normal',
            TotalAmount || 0,
            TaxAmount || 0,
            DiscountAmount || 0,
            PaymentMethod || null,
            ShippingAddress || null,
            BillingAddress || null,
            Notes || null,
            InternalNotes || null,
            CompanyId || null,
            req.user?.userId || null
        ]);

        res.status(201).json({
            message: "Sales order created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error creating SalesOrder:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Update Sales Order
const updateSalesOrder = async (req, res) => {
    const { id } = req.params;
    const {
        CustomerId, OrderDate, ExpectedDeliveryDate, Status, Priority,
        TotalAmount, TaxAmount, DiscountAmount, PaidAmount, PaymentMethod,
        ShippingAddress, BillingAddress, Notes, InternalNotes
    } = req.body;

    const validation = validateSalesOrder(req.body, true);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    const query = `
        UPDATE "SalesOrders"
        SET 
            "CustomerId" = COALESCE($1, "CustomerId"),
            "CustomerName" = CASE WHEN $1 IS NOT NULL THEN (SELECT "Name" FROM "Customers" WHERE "Id" = $1) ELSE "CustomerName" END,
            "OrderDate" = COALESCE($2, "OrderDate"),
            "ExpectedDeliveryDate" = $3,
            "Status" = COALESCE($4, "Status"),
            "Priority" = COALESCE($5, "Priority"),
            "TotalAmount" = COALESCE($6, "TotalAmount"),
            "TaxAmount" = COALESCE($7, "TaxAmount"),
            "DiscountAmount" = COALESCE($8, "DiscountAmount"),
            "PaidAmount" = COALESCE($9, "PaidAmount"),
            "PaymentMethod" = $10,
            "ShippingAddress" = $11,
            "BillingAddress" = $12,
            "Notes" = $13,
            "InternalNotes" = $14,
            "UpdatedBy" = $15
        WHERE "Id" = $16 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [
            CustomerId || null,
            OrderDate || null,
            ExpectedDeliveryDate !== undefined ? ExpectedDeliveryDate : null,
            Status || null,
            Priority || null,
            TotalAmount !== undefined ? TotalAmount : null,
            TaxAmount !== undefined ? TaxAmount : null,
            DiscountAmount !== undefined ? DiscountAmount : null,
            PaidAmount !== undefined ? PaidAmount : null,
            PaymentMethod !== undefined ? PaymentMethod : null,
            ShippingAddress !== undefined ? ShippingAddress : null,
            BillingAddress !== undefined ? BillingAddress : null,
            Notes !== undefined ? Notes : null,
            InternalNotes !== undefined ? InternalNotes : null,
            req.user?.userId || null,
            id
        ]);

        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({
            message: "Sales order updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating SalesOrder:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Update Status
const updateSalesOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { Status } = req.body;

    const validStatuses = ['Draft', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    
    if (!validStatuses.includes(Status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    const query = `
        UPDATE "SalesOrders"
        SET "Status" = $1, "UpdatedBy" = $2
        WHERE "Id" = $3 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [Status, req.user?.userId || null, id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({
            message: "Status updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Payment
const updatePayment = async (req, res) => {
    const { id } = req.params;
    const { PaidAmount, PaymentMethod, PaymentStatus } = req.body;

    if (PaidAmount === undefined || isNaN(PaidAmount) || PaidAmount < 0) {
        return res.status(400).json({ message: "Valid paid amount is required" });
    }

    const query = `
        UPDATE "SalesOrders"
        SET 
            "PaidAmount" = $1,
            "PaymentMethod" = COALESCE($2, "PaymentMethod"),
            "PaymentStatus" = COALESCE($3, 
                CASE 
                    WHEN $1 = 0 THEN 'Pending'
                    WHEN $1 >= "NetAmount" THEN 'Paid'
                    ELSE 'Partial'
                END
            ),
            "UpdatedBy" = $4
        WHERE "Id" = $5 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [
            PaidAmount,
            PaymentMethod || null,
            PaymentStatus || null,
            req.user?.userId || null,
            id
        ]);

        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({
            message: "Payment updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Soft Delete
const softDeleteSalesOrder = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "SalesOrders"
        SET "IsDeleted" = true, "DeletedAt" = CURRENT_TIMESTAMP, "Status" = 'Cancelled'
        WHERE "Id" = $1 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({
            message: "Sales order cancelled successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error soft deleting SalesOrder:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Restore
const restoreSalesOrder = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "SalesOrders"
        SET "IsDeleted" = false, "DeletedAt" = NULL, "Status" = 'Draft'
        WHERE "Id" = $1 AND "IsDeleted" = true
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found or not deleted" });
        }

        res.json({
            message: "Sales order restored successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error restoring SalesOrder:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Hard Delete
const hardDeleteSalesOrder = async (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM "SalesOrders" WHERE "Id" = $1 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({
            message: "Sales order permanently deleted",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error hard deleting SalesOrder:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get by ID
const getSalesOrderById = async (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            so.*,
            c."Name" as "CustomerName",
            c."Phone" as "CustomerPhone",
            c."Email" as "CustomerEmail",
            u."Name" as "CreatedByName"
        FROM "SalesOrders" so
        LEFT JOIN "Customers" c ON so."CustomerId" = c."Id"
        LEFT JOIN "Users" u ON so."CreatedBy" = u."UserId"
        WHERE so."Id" = $1
        LIMIT 1;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Sales order not found" });
        }

        res.json({ data: rows[0] });
    } catch (error) {
        console.error("Error fetching SalesOrder by Id:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All with Filters
const getAllSalesOrders = async (req, res) => {
    const {
        limit = 10, offset = 0, search = '', status = '', paymentStatus = '',
        customerId = '', startDate = '', endDate = '', priority = '',
        sortBy = 'OrderDate', sortOrder = 'DESC', includeDeleted = 'false'
    } = req.query;

    let query = `
        SELECT 
            so.*,
            c."Name" as "CustomerName",
            c."Phone" as "CustomerPhone"
        FROM "SalesOrders" so
        LEFT JOIN "Customers" c ON so."CustomerId" = c."Id"
        WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Search
    if (search) {
        query += ` AND (
            so."SONumber" ILIKE $${paramIndex} OR 
            c."Name" ILIKE $${paramIndex} OR
            so."Notes" ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    // Status filter
    if (status) {
        query += ` AND so."Status" = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    // Payment Status filter
    if (paymentStatus) {
        query += ` AND so."PaymentStatus" = $${paramIndex}`;
        params.push(paymentStatus);
        paramIndex++;
    }

    // Customer filter
    if (customerId) {
        query += ` AND so."CustomerId" = $${paramIndex}`;
        params.push(customerId);
        paramIndex++;
    }

    // Priority filter
    if (priority) {
        query += ` AND so."Priority" = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
    }

    // Date range
    if (startDate) {
        query += ` AND so."OrderDate" >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
    }

    if (endDate) {
        query += ` AND so."OrderDate" <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
    }

    // Deleted filter
    if (includeDeleted !== 'true') {
        query += ` AND so."IsDeleted" = false`;
    }

    // Sorting
    const validSortColumns = ['OrderDate', 'SONumber', 'TotalAmount', 'Status', 'CreatedAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'OrderDate';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY so."${sortColumn}" ${sortDirection}`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Count query
    let countQuery = `
        SELECT COUNT(*)::int as total 
        FROM "SalesOrders" so
        LEFT JOIN "Customers" c ON so."CustomerId" = c."Id"
        WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (search) {
        countQuery += ` AND (
            so."SONumber" ILIKE $${countParamIndex} OR 
            c."Name" ILIKE $${countParamIndex} OR
            so."Notes" ILIKE $${countParamIndex}
        )`;
        countParams.push(`%${search}%`);
        countParamIndex++;
    }

    if (status) {
        countQuery += ` AND so."Status" = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
    }

    if (paymentStatus) {
        countQuery += ` AND so."PaymentStatus" = $${countParamIndex}`;
        countParams.push(paymentStatus);
        countParamIndex++;
    }

    if (customerId) {
        countQuery += ` AND so."CustomerId" = $${countParamIndex}`;
        countParams.push(customerId);
        countParamIndex++;
    }

    if (priority) {
        countQuery += ` AND so."Priority" = $${countParamIndex}`;
        countParams.push(priority);
        countParamIndex++;
    }

    if (startDate) {
        countQuery += ` AND so."OrderDate" >= $${countParamIndex}`;
        countParams.push(startDate);
        countParamIndex++;
    }

    if (endDate) {
        countQuery += ` AND so."OrderDate" <= $${countParamIndex}`;
        countParams.push(endDate);
        countParamIndex++;
    }

    if (includeDeleted !== 'true') {
        countQuery += ` AND so."IsDeleted" = false`;
    }

    try {
        const [dataResult, countResult] = await Promise.all([
            appPool.query(query, params),
            appPool.query(countQuery, countParams)
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
        console.error("Error fetching all SalesOrders:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Statistics
const getSalesOrderStats = async (req, res) => {
    const { companyId = '' } = req.query;

    let query = `
        SELECT 
            COUNT(*)::int as total_orders,
            COUNT(CASE WHEN "Status" = 'Draft' THEN 1 END)::int as draft_orders,
            COUNT(CASE WHEN "Status" = 'Pending' THEN 1 END)::int as pending_orders,
            COUNT(CASE WHEN "Status" = 'Confirmed' THEN 1 END)::int as confirmed_orders,
            COUNT(CASE WHEN "Status" = 'Processing' THEN 1 END)::int as processing_orders,
            COUNT(CASE WHEN "Status" = 'Shipped' THEN 1 END)::int as shipped_orders,
            COUNT(CASE WHEN "Status" = 'Delivered' THEN 1 END)::int as delivered_orders,
            COUNT(CASE WHEN "PaymentStatus" = 'Pending' THEN 1 END)::int as pending_payment,
            COUNT(CASE WHEN "PaymentStatus" = 'Paid' THEN 1 END)::int as paid_orders,
            COALESCE(SUM("NetAmount"), 0)::decimal as total_revenue,
            COALESCE(SUM("PaidAmount"), 0)::decimal as total_collected,
            COALESCE(SUM("BalanceAmount"), 0)::decimal as total_outstanding
        FROM "SalesOrders"
        WHERE "IsDeleted" = false
    `;

    const params = [];
    if (companyId) {
        query += ` AND "CompanyId" = $1`;
        params.push(companyId);
    }

    try {
        const { rows } = await appPool.query(query, params);
        res.json({ data: rows[0] });
    } catch (error) {
        console.error("Error fetching sales order stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get by Customer
const getSalesOrdersByCustomer = async (req, res) => {
    const { customerId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const query = `
        SELECT * FROM "SalesOrders"
        WHERE "CustomerId" = $1 AND "IsDeleted" = false
        ORDER BY "OrderDate" DESC
        LIMIT $2 OFFSET $3;
    `;

    const countQuery = `
        SELECT COUNT(*)::int as total
        FROM "SalesOrders"
        WHERE "CustomerId" = $1 AND "IsDeleted" = false;
    `;

    try {
        const [dataResult, countResult] = await Promise.all([
            appPool.query(query, [customerId, limit, offset]),
            appPool.query(countQuery, [customerId])
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
        console.error("Error fetching orders by customer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createSalesOrder,
    updateSalesOrder,
    updateSalesOrderStatus,
    updatePayment,
    softDeleteSalesOrder,
    restoreSalesOrder,
    hardDeleteSalesOrder,
    getSalesOrderById,
    getAllSalesOrders,
    getSalesOrderStats,
    getSalesOrdersByCustomer
};

console.log("✅ Sales Orders Controller Loaded Successfully");
