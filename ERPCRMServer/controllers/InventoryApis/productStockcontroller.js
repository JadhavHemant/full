// controllers/InventoryApis/productStockController.js
const { appPool } = require("../../config/db");

// ✅ Create Product Stock Entry
const createProductStock = async (req, res) => {
    const {
        ProductId,
        WarehouseId,
        Quantity = 0,
        ReservedQuantity = 0,
        MinimumStock = 0,
        MaximumStock,
        ReorderLevel = 0
    } = req.body;

    // Validation
    if (!ProductId || !WarehouseId) {
        return res.status(400).json({
            success: false,
            message: "ProductId and WarehouseId are required"
        });
    }

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        // Check if product exists
        const productCheck = await client.query(
            `SELECT "Id", "ProductName" FROM "Products" WHERE "Id" = $1 AND "IsActive" = true`,
            [ProductId]
        );

        if (productCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Active product not found"
            });
        }

        // Check if warehouse exists
        const warehouseCheck = await client.query(
            `SELECT "Id", "Name" FROM "Warehouses" WHERE "Id" = $1 AND "IsActive" = true`,
            [WarehouseId]
        );

        if (warehouseCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Active warehouse not found"
            });
        }

        // Check for duplicate entry
        const duplicateCheck = await client.query(
            `SELECT "Id" FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
            [ProductId, WarehouseId]
        );

        if (duplicateCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: "Stock entry already exists for this product in this warehouse"
            });
        }

        const query = `
            INSERT INTO "ProductStockPerWarehouse"
            ("ProductId", "WarehouseId", "Quantity", "ReservedQuantity", "MinimumStock", 
             "MaximumStock", "ReorderLevel", "LastRestocked", "CreatedBy")
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
            RETURNING *;
        `;

        const { rows } = await client.query(query, [
            ProductId,
            WarehouseId,
            Quantity || 0,
            ReservedQuantity || 0,
            MinimumStock || 0,
            MaximumStock || null,
            ReorderLevel || 0,
            req.user?.userId || null
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Product stock created successfully",
            data: rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating ProductStock:", error);

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: "Duplicate entry for product in warehouse"
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

// ✅ Update Product Stock
const updateProductStock = async (req, res) => {
    const { id } = req.params;
    const {
        Quantity,
        ReservedQuantity,
        MinimumStock,
        MaximumStock,
        ReorderLevel,
        IsActive
    } = req.body;

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        const stockCheck = await client.query(
            `SELECT "Id" FROM "ProductStockPerWarehouse" WHERE "Id" = $1`,
            [id]
        );

        if (stockCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Product stock not found"
            });
        }

        const query = `
            UPDATE "ProductStockPerWarehouse"
            SET "Quantity" = COALESCE($1, "Quantity"),
                "ReservedQuantity" = COALESCE($2, "ReservedQuantity"),
                "MinimumStock" = COALESCE($3, "MinimumStock"),
                "MaximumStock" = COALESCE($4, "MaximumStock"),
                "ReorderLevel" = COALESCE($5, "ReorderLevel"),
                "IsActive" = COALESCE($6, "IsActive"),
                "LastRestocked" = CASE WHEN $1 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE "LastRestocked" END,
                "UpdatedBy" = $7
            WHERE "Id" = $8
            RETURNING *;
        `;

        const { rows } = await client.query(query, [
            Quantity !== undefined ? parseInt(Quantity) : null,
            ReservedQuantity !== undefined ? parseInt(ReservedQuantity) : null,
            MinimumStock !== undefined ? parseInt(MinimumStock) : null,
            MaximumStock !== undefined ? parseInt(MaximumStock) : null,
            ReorderLevel !== undefined ? parseInt(ReorderLevel) : null,
            IsActive !== undefined ? IsActive : null,
            req.user?.userId || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Product stock updated successfully",
            data: rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating ProductStock:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    } finally {
        client.release();
    }
};

// ✅ Adjust Stock Quantity (Add/Remove)
const adjustStockQuantity = async (req, res) => {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (!adjustment || isNaN(adjustment)) {
        return res.status(400).json({
            success: false,
            message: "Valid adjustment value is required"
        });
    }

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        const stockCheck = await client.query(
            `SELECT * FROM "ProductStockPerWarehouse" WHERE "Id" = $1`,
            [id]
        );

        if (stockCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Product stock not found"
            });
        }

        const currentStock = stockCheck.rows[0];
        const newQuantity = currentStock.Quantity + parseInt(adjustment);

        if (newQuantity < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Insufficient stock. Cannot reduce below zero."
            });
        }

        const query = `
            UPDATE "ProductStockPerWarehouse"
            SET "Quantity" = $1,
                "LastRestocked" = CASE WHEN $2 > 0 THEN CURRENT_TIMESTAMP ELSE "LastRestocked" END,
                "UpdatedBy" = $3
            WHERE "Id" = $4
            RETURNING *;
        `;

        const { rows } = await client.query(query, [
            newQuantity,
            adjustment,
            req.user?.userId || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Stock ${adjustment > 0 ? 'increased' : 'decreased'} successfully`,
            data: rows[0],
            adjustment: adjustment,
            reason: reason || 'No reason provided'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error adjusting stock:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
};

// ✅ Transfer Stock Between Warehouses
const transferStock = async (req, res) => {
    const { ProductId, FromWarehouseId, ToWarehouseId, Quantity } = req.body;

    if (!ProductId || !FromWarehouseId || !ToWarehouseId || !Quantity) {
        return res.status(400).json({
            success: false,
            message: "ProductId, FromWarehouseId, ToWarehouseId, and Quantity are required"
        });
    }

    if (FromWarehouseId === ToWarehouseId) {
        return res.status(400).json({
            success: false,
            message: "Source and destination warehouses cannot be the same"
        });
    }

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        // Check source warehouse stock
        const sourceStock = await client.query(
            `SELECT * FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
            [ProductId, FromWarehouseId]
        );

        if (sourceStock.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Source warehouse stock not found"
            });
        }

        if (sourceStock.rows[0].Quantity < Quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Insufficient stock in source warehouse"
            });
        }

        // Reduce from source
        await client.query(
            `UPDATE "ProductStockPerWarehouse" SET "Quantity" = "Quantity" - $1, "UpdatedBy" = $2 WHERE "ProductId" = $3 AND "WarehouseId" = $4`,
            [Quantity, req.user?.userId || null, ProductId, FromWarehouseId]
        );

        // Add to destination (create if not exists)
        const destStock = await client.query(
            `SELECT * FROM "ProductStockPerWarehouse" WHERE "ProductId" = $1 AND "WarehouseId" = $2`,
            [ProductId, ToWarehouseId]
        );

        if (destStock.rows.length === 0) {
            await client.query(
                `INSERT INTO "ProductStockPerWarehouse" ("ProductId", "WarehouseId", "Quantity", "CreatedBy") VALUES ($1, $2, $3, $4)`,
                [ProductId, ToWarehouseId, Quantity, req.user?.userId || null]
            );
        } else {
            await client.query(
                `UPDATE "ProductStockPerWarehouse" SET "Quantity" = "Quantity" + $1, "UpdatedBy" = $2 WHERE "ProductId" = $3 AND "WarehouseId" = $4`,
                [Quantity, req.user?.userId || null, ProductId, ToWarehouseId]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Stock transferred successfully",
            transfer: {
                ProductId,
                FromWarehouseId,
                ToWarehouseId,
                Quantity
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error transferring stock:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
};

// ✅ Get Product Stock by Id with Details
const getProductStockById = async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            ps.*,
            p."ProductName",
            p."ProductCode",
            p."SKU",
            w."Name" as "WarehouseName",
            w."WarehouseCode",
            w."Location",
            creator."Name" as "CreatedByName",
            updater."Name" as "UpdatedByName"
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
        LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
        LEFT JOIN "Users" creator ON ps."CreatedBy" = creator."UserId"
        LEFT JOIN "Users" updater ON ps."UpdatedBy" = updater."UserId"
        WHERE ps."Id" = $1
        LIMIT 1;
    `;

    try {
        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Product stock not found"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("Error fetching ProductStock by Id:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get All Product Stocks with Advanced Filters
const getAllProductStocks = async (req, res) => {
    const {
        limit = 10,
        offset = 0,
        search = '',
        productId,
        warehouseId,
        isActive,
        lowStock = false,
        sortBy = 'CreatedAt',
        sortOrder = 'DESC'
    } = req.query;

    const allowedSortFields = ['CreatedAt', 'Quantity', 'ProductName', 'WarehouseName'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'CreatedAt';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (search) {
        whereConditions.push(`(
            p."ProductName" ILIKE $${paramCount} OR 
            p."ProductCode" ILIKE $${paramCount} OR
            w."Name" ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
        paramCount++;
    }

    if (productId) {
        whereConditions.push(`ps."ProductId" = $${paramCount}`);
        queryParams.push(productId);
        paramCount++;
    }

    if (warehouseId) {
        whereConditions.push(`ps."WarehouseId" = $${paramCount}`);
        queryParams.push(warehouseId);
        paramCount++;
    }

    if (isActive !== undefined && isActive !== '') {
        whereConditions.push(`ps."IsActive" = $${paramCount}`);
        queryParams.push(isActive === 'true');
        paramCount++;
    }

    if (lowStock === 'true') {
        whereConditions.push(`ps."Quantity" <= ps."ReorderLevel"`);
    }

    const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const countQuery = `
        SELECT COUNT(*) as total
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
        LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
        ${whereClause};
    `;

    const dataQuery = `
        SELECT 
            ps.*,
            p."ProductName",
            p."ProductCode",
            p."SKU",
            w."Name" as "WarehouseName",
            w."WarehouseCode",
            w."Location"
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
        LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
        ${whereClause}
        ORDER BY ps."${validSortBy === 'ProductName' ? 'ProductId' : validSortBy === 'WarehouseName' ? 'WarehouseId' : validSortBy}" ${validSortOrder}
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
        console.error("Error fetching all ProductStocks:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get Stock by Product
const getStockByProduct = async (req, res) => {
    const { productId } = req.params;

    const query = `
        SELECT 
            ps.*,
            w."Name" as "WarehouseName",
            w."WarehouseCode",
            w."Location",
            w."City",
            w."State"
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
        WHERE ps."ProductId" = $1 AND ps."IsActive" = true
        ORDER BY ps."Quantity" DESC;
    `;

    try {
        const { rows } = await appPool.query(query, [productId]);

        const totalQuantity = rows.reduce((sum, row) => sum + (row.Quantity || 0), 0);

        res.json({
            success: true,
            data: rows,
            summary: {
                totalQuantity,
                warehouseCount: rows.length
            }
        });

    } catch (error) {
        console.error("Error fetching stock by product:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get Stock by Warehouse
const getStockByWarehouse = async (req, res) => {
    const { warehouseId } = req.params;

    const query = `
        SELECT 
            ps.*,
            p."ProductName",
            p."ProductCode",
            p."SKU",
            p."Price"
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
        WHERE ps."WarehouseId" = $1 AND ps."IsActive" = true
        ORDER BY ps."Quantity" DESC;
    `;

    try {
        const { rows } = await appPool.query(query, [warehouseId]);

        const totalValue = rows.reduce((sum, row) => sum + ((row.Quantity || 0) * (row.Price || 0)), 0);

        res.json({
            success: true,
            data: rows,
            summary: {
                totalProducts: rows.length,
                totalValue: parseFloat(totalValue.toFixed(2))
            }
        });

    } catch (error) {
        console.error("Error fetching stock by warehouse:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Get Low Stock Items
const getLowStockItems = async (req, res) => {
    const query = `
        SELECT 
            ps.*,
            p."ProductName",
            p."ProductCode",
            w."Name" as "WarehouseName",
            w."WarehouseCode"
        FROM "ProductStockPerWarehouse" ps
        LEFT JOIN "Products" p ON ps."ProductId" = p."Id"
        LEFT JOIN "Warehouses" w ON ps."WarehouseId" = w."Id"
        WHERE ps."Quantity" <= ps."ReorderLevel" 
        AND ps."IsActive" = true
        ORDER BY ps."Quantity" ASC;
    `;

    try {
        const { rows } = await appPool.query(query);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });

    } catch (error) {
        console.error("Error fetching low stock items:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Soft Delete (Deactivate)
const softDeleteProductStock = async (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE "ProductStockPerWarehouse"
        SET "IsActive" = false,
            "UpdatedBy" = $1
        WHERE "Id" = $2
        RETURNING *;
    `;

    try {
        const { rows } = await appPool.query(query, [req.user?.userId || null, id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Product stock not found"
            });
        }

        res.json({
            success: true,
            message: "Product stock deactivated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("Error soft deleting ProductStock:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ✅ Hard Delete
const hardDeleteProductStock = async (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM "ProductStockPerWarehouse" WHERE "Id" = $1 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Product stock not found"
            });
        }

        res.json({
            success: true,
            message: "Product stock deleted permanently",
            data: rows[0]
        });

    } catch (error) {
        console.error("Error hard deleting ProductStock:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createProductStock,
    updateProductStock,
    adjustStockQuantity,
    transferStock,
    getProductStockById,
    getAllProductStocks,
    getStockByProduct,
    getStockByWarehouse,
    getLowStockItems,
    softDeleteProductStock,
    hardDeleteProductStock
};
