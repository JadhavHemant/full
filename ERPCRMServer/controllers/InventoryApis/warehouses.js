const { appPool } = require("../../config/db");

// ✅ Generate Unique Warehouse Code
const generateWarehouseCode = async () => {
    const prefix = "WH";
    const query = `SELECT "WarehouseCode" FROM "Warehouses" WHERE "WarehouseCode" LIKE $1 ORDER BY "WarehouseCode" DESC LIMIT 1;`;
    
    try {
        const { rows } = await appPool.query(query, [`${prefix}%`]);
        
        if (rows.length === 0) {
            return `${prefix}0001`;
        }
        
        const lastCode = rows[0].WarehouseCode;
        const lastNumber = parseInt(lastCode.replace(prefix, ''));
        const newNumber = lastNumber + 1;
        
        return `${prefix}${String(newNumber).padStart(4, '0')}`;
    } catch (error) {
        throw error;
    }
};

// ✅ FIXED Create Warehouse - Removed ManagerId from INSERT
const createWarehouse = async (req, res) => {
    const {
        Name,
        Location,
        Address,
        City,
        State,
        Country = 'India',
        PinCode,
        ContactPerson,
        ContactPhone,
        ContactEmail,
        ManagerId,
        CompanyId,
        Capacity,
        CapacityUnit = 'sqft'
    } = req.body;

    // Validation
    if (!Name || !CompanyId) {
        return res.status(400).json({ 
            success: false,
            message: "Name and CompanyId are required" 
        });
    }

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        // Generate unique warehouse code
        const warehouseCode = await generateWarehouseCode();

        // Check if company exists
        const companyCheck = await client.query(
            `SELECT "Id" FROM "Companies" WHERE "Id" = $1 AND "IsActive" = true`,
            [CompanyId]
        );

        if (companyCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false,
                message: "Active company not found" 
            });
        }

        // ✅ Convert empty ManagerId to null
        const validManagerId = ManagerId && ManagerId !== '' ? parseInt(ManagerId) : null;

        // Check if manager exists (if provided)
        if (validManagerId) {
            const managerCheck = await client.query(
                `SELECT "UserId" FROM "Users" WHERE "UserId" = $1`,
                [validManagerId]
            );

            if (managerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    message: "Manager user not found" 
                });
            }
        }

        // ✅ FIXED: Added ManagerId back to query
        const query = `
            INSERT INTO "Warehouses"
            ("WarehouseCode", "Name", "Location", "Address", "City", "State", "Country", 
             "PinCode", "ContactPerson", "ContactPhone", "ContactEmail", "ManagerId", 
             "CompanyId", "Capacity", "CapacityUnit", "CreatedBy")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *;
        `;

        const values = [
            warehouseCode,
            Name,
            Location || null,
            Address || null,
            City || null,
            State || null,
            Country || 'India',
            PinCode || null,
            ContactPerson || null,
            ContactPhone || null,
            ContactEmail || null,
            validManagerId, // ✅ Now included
            CompanyId,
            Capacity && Capacity !== '' ? parseFloat(Capacity) : null,
            CapacityUnit || 'sqft',
            req.user?.userId || null
        ];

        const { rows } = await client.query(query, values);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Warehouse created successfully",
            data: rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating Warehouse:", error);

        if (error.code === '23505') {
            return res.status(409).json({ 
                success: false,
                message: "Warehouse with this code already exists" 
            });
        }

        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message
        });
    } finally {
        client.release();
    }
};

// ✅ FIXED Update Warehouse
const updateWarehouse = async (req, res) => {
    const { id } = req.params;
    const {
        Name,
        Location,
        Address,
        City,
        State,
        Country,
        PinCode,
        ContactPerson,
        ContactPhone,
        ContactEmail,
        ManagerId,
        CompanyId,
        Capacity,
        CapacityUnit,
        IsActive
    } = req.body;

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        const warehouseCheck = await client.query(
            `SELECT "Id" FROM "Warehouses" WHERE "Id" = $1`,
            [id]
        );

        if (warehouseCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false,
                message: "Warehouse not found" 
            });
        }

        // ✅ Convert empty values to null
        const validManagerId = ManagerId && ManagerId !== '' ? parseInt(ManagerId) : null;
        const validCapacity = Capacity && Capacity !== '' ? parseFloat(Capacity) : null;

        if (CompanyId) {
            const companyCheck = await client.query(
                `SELECT "Id" FROM "Companies" WHERE "Id" = $1 AND "IsActive" = true`,
                [CompanyId]
            );

            if (companyCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    message: "Active company not found" 
                });
            }
        }

        if (validManagerId) {
            const managerCheck = await client.query(
                `SELECT "UserId" FROM "Users" WHERE "UserId" = $1`,
                [validManagerId]
            );

            if (managerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    message: "Manager user not found" 
                });
            }
        }

        const query = `
            UPDATE "Warehouses"
            SET "Name" = COALESCE($1, "Name"),
                "Location" = COALESCE($2, "Location"),
                "Address" = COALESCE($3, "Address"),
                "City" = COALESCE($4, "City"),
                "State" = COALESCE($5, "State"),
                "Country" = COALESCE($6, "Country"),
                "PinCode" = COALESCE($7, "PinCode"),
                "ContactPerson" = COALESCE($8, "ContactPerson"),
                "ContactPhone" = COALESCE($9, "ContactPhone"),
                "ContactEmail" = COALESCE($10, "ContactEmail"),
                "ManagerId" = COALESCE($11, "ManagerId"),
                "CompanyId" = COALESCE($12, "CompanyId"),
                "Capacity" = COALESCE($13, "Capacity"),
                "CapacityUnit" = COALESCE($14, "CapacityUnit"),
                "IsActive" = COALESCE($15, "IsActive"),
                "UpdatedAt" = CURRENT_TIMESTAMP,
                "UpdatedBy" = $16
            WHERE "Id" = $17
            RETURNING *;
        `;

        const values = [
            Name || null,
            Location || null,
            Address || null,
            City || null,
            State || null,
            Country || null,
            PinCode || null,
            ContactPerson || null,
            ContactPhone || null,
            ContactEmail || null,
            validManagerId,
            CompanyId || null,
            validCapacity,
            CapacityUnit || null,
            IsActive !== undefined ? IsActive : null,
            req.user?.userId || null,
            id
        ];

        const { rows } = await client.query(query, values);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Warehouse updated successfully",
            data: rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating Warehouse:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message
        });
    } finally {
        client.release();
    }
};

// ✅ Soft Delete Warehouse
const softDeleteWarehouse = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "Warehouses"
        SET "IsActive" = false,
            "UpdatedAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = $1
        WHERE "Id" = $2
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [req.user?.userId || null, id]);

        if (!rows.length) {
            return res.status(404).json({ 
                success: false,
                message: "Warehouse not found" 
            });
        }

        res.json({
            success: true,
            message: "Warehouse deactivated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("Error soft deleting Warehouse:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Hard Delete Warehouse
const hardDeleteWarehouse = async (req, res) => {
    const { id } = req.params;

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        // Check if warehouse has associated stock/inventory
        const stockCheck = await client.query(
            `SELECT COUNT(*) as count FROM "Stock" WHERE "WarehouseId" = $1`,
            [id]
        );

        if (parseInt(stockCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false,
                message: "Cannot delete warehouse with existing stock. Please transfer or remove stock first." 
            });
        }

        const query = `DELETE FROM "Warehouses" WHERE "Id" = $1 RETURNING *;`;
        const { rows } = await client.query(query, [id]);

        if (!rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false,
                message: "Warehouse not found" 
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Warehouse deleted permanently",
            data: rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error hard deleting Warehouse:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
};

// ✅ Toggle Active Status
const toggleWarehouseStatus = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "Warehouses"
        SET "IsActive" = NOT "IsActive",
            "UpdatedAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = $1
        WHERE "Id" = $2
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [req.user?.userId || null, id]);

        if (!rows.length) {
            return res.status(404).json({ 
                success: false,
                message: "Warehouse not found" 
            });
        }

        res.json({
            success: true,
            message: `Warehouse ${rows[0].IsActive ? 'activated' : 'deactivated'} successfully`,
            data: rows[0]
        });

    } catch (error) {
        console.error("Error toggling Warehouse status:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get Warehouse by Id
const getWarehouseById = async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            w.*,
            c."CompanyName",
            u."Name" as "ManagerName",
            u."Email" as "ManagerEmail",
            creator."Name" as "CreatedByName",
            updater."Name" as "UpdatedByName"
        FROM "Warehouses" w
        LEFT JOIN "Companies" c ON w."CompanyId" = c."Id"
        LEFT JOIN "Users" u ON w."ManagerId" = u."UserId"
        LEFT JOIN "Users" creator ON w."CreatedBy" = creator."UserId"
        LEFT JOIN "Users" updater ON w."UpdatedBy" = updater."UserId"
        WHERE w."Id" = $1
        LIMIT 1;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) {
            return res.status(404).json({ 
                success: false,
                message: "Warehouse not found" 
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("Error fetching Warehouse by Id:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get All Warehouses
const getAllWarehouses = async (req, res) => {
    const {
        limit = 10,
        offset = 0,
        search = '',
        companyId,
        managerId,
        isActive,
        city,
        state,
        sortBy = 'CreatedAt',
        sortOrder = 'DESC'
    } = req.query;

    const allowedSortFields = ['CreatedAt', 'Name', 'WarehouseCode', 'City', 'State'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'CreatedAt';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (search) {
        whereConditions.push(`(
            w."Name" ILIKE $${paramCount} OR 
            w."WarehouseCode" ILIKE $${paramCount} OR 
            w."Location" ILIKE $${paramCount} OR
            w."City" ILIKE $${paramCount} OR
            w."ContactPerson" ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
        paramCount++;
    }

    if (companyId) {
        whereConditions.push(`w."CompanyId" = $${paramCount}`);
        queryParams.push(companyId);
        paramCount++;
    }

    if (managerId) {
        whereConditions.push(`w."ManagerId" = $${paramCount}`);
        queryParams.push(managerId);
        paramCount++;
    }

    if (isActive !== undefined && isActive !== '') {
        whereConditions.push(`w."IsActive" = $${paramCount}`);
        queryParams.push(isActive === 'true');
        paramCount++;
    }

    if (city) {
        whereConditions.push(`w."City" ILIKE $${paramCount}`);
        queryParams.push(`%${city}%`);
        paramCount++;
    }

    if (state) {
        whereConditions.push(`w."State" ILIKE $${paramCount}`);
        queryParams.push(`%${state}%`);
        paramCount++;
    }

    const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const countQuery = `
        SELECT COUNT(*) as total
        FROM "Warehouses" w
        ${whereClause};
    `;

    const dataQuery = `
        SELECT 
            w.*,
            c."CompanyName",
            u."Name" as "ManagerName",
            u."Email" as "ManagerEmail"
        FROM "Warehouses" w
        LEFT JOIN "Companies" c ON w."CompanyId" = c."Id"
        LEFT JOIN "Users" u ON w."ManagerId" = u."UserId"
        ${whereClause}
        ORDER BY w."${validSortBy}" ${validSortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1};
    `;

    try {
        const countResult = await appPool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        const dataResult = await appPool.query(dataQuery, [
            ...queryParams,
            parseInt(limit),
            parseInt(offset)
        ]);

        const totalPages = Math.ceil(total / limit);
        const currentPage = Math.floor(offset / limit) + 1;

        res.json({
            success: true,
            data: dataResult.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalPages,
                currentPage,
                hasNext: currentPage < totalPages,
                hasPrevious: currentPage > 1
            }
        });

    } catch (error) {
        console.error("Error fetching all Warehouses:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get Active Warehouses
const getActiveWarehouses = async (req, res) => {
    const { companyId } = req.query;

    let query = `
        SELECT 
            "Id",
            "WarehouseCode",
            "Name",
            "Location",
            "City",
            "State"
        FROM "Warehouses"
        WHERE "IsActive" = true
    `;

    const params = [];

    if (companyId) {
        query += ` AND "CompanyId" = $1`;
        params.push(companyId);
    }

    query += ` ORDER BY "Name" ASC;`;

    try {
        const { rows } = await appPool.query(query, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching active Warehouses:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ FIXED Get Warehouses by Company - Removed Stock count
const getWarehousesByCompany = async (req, res) => {
    const { companyId } = req.params;
    const { includeInactive = false } = req.query;

    let query = `
        SELECT 
            w.*,
            u."Name" as "ManagerName"
        FROM "Warehouses" w
        LEFT JOIN "Users" u ON w."ManagerId" = u."UserId"
        WHERE w."CompanyId" = $1
    `;

    if (!includeInactive || includeInactive === 'false') {
        query += ` AND w."IsActive" = true`;
    }

    query += ` ORDER BY w."Name" ASC;`;

    try {
        const { rows } = await appPool.query(query, [companyId]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching Warehouses by Company:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ FIXED Bulk Import Warehouses
const bulkImportWarehouses = async (req, res) => {
    const { warehouses } = req.body;

    if (!Array.isArray(warehouses) || warehouses.length === 0) {
        return res.status(400).json({ 
            success: false,
            message: "Invalid input. Provide an array of warehouses." 
        });
    }

    const client = await appPool.connect();
    const results = {
        success: [],
        failed: []
    };

    try {
        await client.query('BEGIN');

        for (const warehouse of warehouses) {
            try {
                const warehouseCode = await generateWarehouseCode();

                const query = `
                    INSERT INTO "Warehouses"
                    ("WarehouseCode", "Name", "Location", "CompanyId", "CreatedBy")
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;

                const { rows } = await client.query(query, [
                    warehouseCode,
                    warehouse.Name,
                    warehouse.Location || null,
                    warehouse.CompanyId,
                    req.user?.userId || null
                ]);

                results.success.push(rows[0]);

            } catch (err) {
                results.failed.push({
                    warehouse,
                    error: err.message
                });
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Imported ${results.success.length} warehouses, ${results.failed.length} failed`,
            results
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error bulk importing Warehouses:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
};

module.exports = {
    createWarehouse,
    updateWarehouse,
    softDeleteWarehouse,
    hardDeleteWarehouse,
    toggleWarehouseStatus,
    getWarehouseById,
    getAllWarehouses,
    getActiveWarehouses,
    getWarehousesByCompany,
    bulkImportWarehouses
};
