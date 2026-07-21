// controllers/InventoryApis/customers.js

const { appPool } = require("../../config/db");

console.log("👥 Loading Customers Controller");

// Helper: Validate Customer Data
const validateCustomer = (data, isUpdate = false) => {
    const errors = [];

    if (!isUpdate && !data.Name?.trim()) {
        errors.push("Customer name is required");
    }

    if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
        errors.push("Invalid email format");
    }

    if (data.Phone && !/^\d{10}$/.test(data.Phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.push("Phone must be 10 digits");
    }

    if (data.CreditLimit !== undefined && (isNaN(data.CreditLimit) || data.CreditLimit < 0)) {
        errors.push("Credit limit must be a non-negative number");
    }

    if (data.GSTNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.GSTNumber)) {
        errors.push("Invalid GST number format");
    }

    return { valid: errors.length === 0, errors };
};

// Create Customer
const createCustomer = async (req, res) => {
    const {
        Name, Email, Phone, AlternatePhone, Address, City, State, Country,
        PostalCode, GSTNumber, PANNumber, CustomerType, CreditLimit, Notes
    } = req.body;

    const validation = validateCustomer(req.body, false);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    const query = `
        INSERT INTO "Customers" 
        ("Name", "Email", "Phone", "AlternatePhone", "Address", "City", "State", 
         "Country", "PostalCode", "GSTNumber", "PANNumber", "CustomerType", "CreditLimit", "Notes")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
    `;

    try {
        // Check for duplicate email
        if (Email) {
            const emailCheck = await appPool.query(
                `SELECT "Id" FROM "Customers" WHERE "Email" = $1 AND "IsDeleted" = false`,
                [Email]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ message: "Email already exists" });
            }
        }

        const { rows } = await appPool.query(query, [
            Name, Email || null, Phone || null, AlternatePhone || null,
            Address || null, City || null, State || null, Country || 'India',
            PostalCode || null, GSTNumber || null, PANNumber || null,
            CustomerType || 'Retail', CreditLimit || 0, Notes || null
        ]);

        res.status(201).json({
            message: "Customer created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error creating Customer:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Update Customer
const updateCustomer = async (req, res) => {
    const { id } = req.params;
    const {
        Name, Email, Phone, AlternatePhone, Address, City, State, Country,
        PostalCode, GSTNumber, PANNumber, CustomerType, CreditLimit, IsActive, Notes
    } = req.body;

    const validation = validateCustomer(req.body, true);
    if (!validation.valid) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validation.errors
        });
    }

    const query = `
        UPDATE "Customers"
        SET 
            "Name" = COALESCE($1, "Name"),
            "Email" = COALESCE($2, "Email"),
            "Phone" = COALESCE($3, "Phone"),
            "AlternatePhone" = $4,
            "Address" = $5,
            "City" = $6,
            "State" = $7,
            "Country" = COALESCE($8, "Country"),
            "PostalCode" = $9,
            "GSTNumber" = $10,
            "PANNumber" = $11,
            "CustomerType" = COALESCE($12, "CustomerType"),
            "CreditLimit" = COALESCE($13, "CreditLimit"),
            "IsActive" = COALESCE($14, "IsActive"),
            "Notes" = $15
        WHERE "Id" = $16 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        // Check email uniqueness if updating email
        if (Email) {
            const emailCheck = await appPool.query(
                `SELECT "Id" FROM "Customers" WHERE "Email" = $1 AND "Id" != $2 AND "IsDeleted" = false`,
                [Email, id]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ message: "Email already exists" });
            }
        }

        const { rows } = await appPool.query(query, [
            Name || null, Email || null, Phone || null, AlternatePhone || null,
            Address || null, City || null, State || null, Country || null,
            PostalCode || null, GSTNumber || null, PANNumber || null,
            CustomerType || null, CreditLimit !== undefined ? CreditLimit : null,
            IsActive !== undefined ? IsActive : null, Notes !== undefined ? Notes : null, id
        ]);

        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({
            message: "Customer updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating Customer:", error);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

// Soft Delete Customer
const softDeleteCustomer = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "Customers"
        SET "IsDeleted" = true, "DeletedAt" = CURRENT_TIMESTAMP, "IsActive" = false
        WHERE "Id" = $1 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({
            message: "Customer deleted successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error soft deleting Customer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Restore Customer
const restoreCustomer = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "Customers"
        SET "IsDeleted" = false, "DeletedAt" = NULL, "IsActive" = true
        WHERE "Id" = $1 AND "IsDeleted" = true
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found or not deleted" });
        }

        res.json({
            message: "Customer restored successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error restoring Customer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Hard Delete Customer
const hardDeleteCustomer = async (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM "Customers" WHERE "Id" = $1 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({
            message: "Customer permanently deleted",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error hard deleting Customer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Customer by Id
const getCustomerById = async (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM "Customers" WHERE "Id" = $1 LIMIT 1;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({ data: rows[0] });
    } catch (error) {
        console.error("Error fetching Customer by Id:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Customers with Advanced Filters
const getAllCustomers = async (req, res) => {
    const {
        limit = 10, offset = 0, search = '', isActive = '', customerType = '',
        sortBy = 'CreatedAt', sortOrder = 'DESC', includeDeleted = 'false'
    } = req.query;

    let query = `
        SELECT * FROM "Customers"
        WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
        query += ` AND (
            "Name" ILIKE $${paramIndex} OR 
            "Email" ILIKE $${paramIndex} OR 
            "Phone" ILIKE $${paramIndex} OR
            "CustomerCode" ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    // Active filter
    if (isActive !== '') {
        query += ` AND "IsActive" = $${paramIndex}`;
        params.push(isActive === 'true');
        paramIndex++;
    }

    // Customer Type filter
    if (customerType) {
        query += ` AND "CustomerType" = $${paramIndex}`;
        params.push(customerType);
        paramIndex++;
    }

    // Deleted filter
    if (includeDeleted !== 'true') {
        query += ` AND "IsDeleted" = false`;
    }

    // Sorting
    const validSortColumns = ['CreatedAt', 'Name', 'CustomerCode', 'OutstandingBalance'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'CreatedAt';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY "${sortColumn}" ${sortDirection}`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Count query
    let countQuery = `SELECT COUNT(*)::int as total FROM "Customers" WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
        countQuery += ` AND (
            "Name" ILIKE $${countParamIndex} OR 
            "Email" ILIKE $${countParamIndex} OR 
            "Phone" ILIKE $${countParamIndex} OR
            "CustomerCode" ILIKE $${countParamIndex}
        )`;
        countParams.push(`%${search}%`);
        countParamIndex++;
    }

    if (isActive !== '') {
        countQuery += ` AND "IsActive" = $${countParamIndex}`;
        countParams.push(isActive === 'true');
        countParamIndex++;
    }

    if (customerType) {
        countQuery += ` AND "CustomerType" = $${countParamIndex}`;
        countParams.push(customerType);
        countParamIndex++;
    }

    if (includeDeleted !== 'true') {
        countQuery += ` AND "IsDeleted" = false`;
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
        console.error("Error fetching all Customers:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Active Customers (for dropdowns)
const getActiveCustomers = async (req, res) => {
    const query = `
        SELECT "Id", "CustomerCode", "Name", "Phone", "Email", "CustomerType"
        FROM "Customers"
        WHERE "IsActive" = true AND "IsDeleted" = false
        ORDER BY "Name" ASC;
    `;

    try {
        const { rows } = await appPool.query(query);
        res.json({ data: rows });
    } catch (error) {
        console.error("Error fetching active customers:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Customer Statistics
const getCustomerStats = async (req, res) => {
    const query = `
        SELECT 
            COUNT(*)::int as total_customers,
            COUNT(CASE WHEN "IsActive" = true AND "IsDeleted" = false THEN 1 END)::int as active_customers,
            COUNT(CASE WHEN "CustomerType" = 'Retail' THEN 1 END)::int as retail_customers,
            COUNT(CASE WHEN "CustomerType" = 'Wholesale' THEN 1 END)::int as wholesale_customers,
            COUNT(CASE WHEN "CustomerType" = 'Corporate' THEN 1 END)::int as corporate_customers,
            COALESCE(SUM("OutstandingBalance"), 0)::decimal as total_outstanding
        FROM "Customers"
        WHERE "IsDeleted" = false;
    `;

    try {
        const { rows } = await appPool.query(query);
        res.json({ data: rows[0] });
    } catch (error) {
        console.error("Error fetching customer stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Outstanding Balance
const updateOutstandingBalance = async (req, res) => {
    const { id } = req.params;
    const { amount, operation } = req.body; // operation: 'add' or 'subtract'

    if (!amount || isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: "Valid amount is required" });
    }

    const query = operation === 'add'
        ? `UPDATE "Customers" SET "OutstandingBalance" = "OutstandingBalance" + $1 WHERE "Id" = $2 RETURNING *;`
        : `UPDATE "Customers" SET "OutstandingBalance" = "OutstandingBalance" - $1 WHERE "Id" = $2 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [amount, id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({
            message: "Outstanding balance updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating outstanding balance:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Toggle Active Status
const toggleActiveStatus = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "Customers"
        SET "IsActive" = NOT "IsActive"
        WHERE "Id" = $1 AND "IsDeleted" = false
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json({
            message: `Customer ${rows[0].IsActive ? 'activated' : 'deactivated'} successfully`,
            data: rows[0]
        });
    } catch (error) {
        console.error("Error toggling active status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createCustomer,
    updateCustomer,
    softDeleteCustomer,
    restoreCustomer,
    hardDeleteCustomer,
    getCustomerById,
    getAllCustomers,
    getActiveCustomers,
    getCustomerStats,
    updateOutstandingBalance,
    toggleActiveStatus
};

console.log("✅ Customers Controller Loaded Successfully");
