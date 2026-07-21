const { appPool } = require("../../config/db");


const validateProductCategory = (CategoryName) => {
    const errors = [];
    
    if (!CategoryName || CategoryName.trim() === '') {
        errors.push('CategoryName is required');
    }
    
    if (CategoryName && CategoryName.length > 100) {
        errors.push('CategoryName must not exceed 100 characters');
    }
    
    return errors;
};

const checkDuplicateCategoryName = async (CategoryName, excludeId = null) => {
    let query = `SELECT "Id" FROM "ProductCategories" WHERE LOWER("CategoryName") = LOWER($1)`;
    const params = [CategoryName];
    
    if (excludeId) {
        query += ` AND "Id" != $2`;
        params.push(excludeId);
    }
    
    const { rows } = await appPool.query(query, params);
    return rows.length > 0;
};


const createProductCategory = async (req, res) => {
    const { CategoryName, Description } = req.body;
    const validationErrors = validateProductCategory(CategoryName);
    if (validationErrors.length > 0) {
        return res.status(400).json({ 
            message: "Validation failed", 
            errors: validationErrors 
        });
    }

    const query = `
        INSERT INTO "ProductCategories" ("CategoryName", "Description") 
        VALUES ($1, $2) 
        RETURNING *;
    `;

    try {
        const isDuplicate = await checkDuplicateCategoryName(CategoryName);
        if (isDuplicate) {
            return res.status(409).json({ 
                message: "Category with this name already exists" 
            });
        }

        const { rows } = await appPool.query(query, [
            CategoryName.trim(), 
            Description ? Description.trim() : null
        ]);
        
        res.status(201).json({
            message: "Product category created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error creating ProductCategory:", error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ 
                message: "Category with this name already exists" 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const updateProductCategory = async (req, res) => {
    const { id } = req.params;
    const { CategoryName, Description } = req.body;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid category ID" });
    }
    const validationErrors = validateProductCategory(CategoryName);
    if (validationErrors.length > 0) {
        return res.status(400).json({ 
            message: "Validation failed", 
            errors: validationErrors 
        });
    }

    const query = `
        UPDATE "ProductCategories"
        SET "CategoryName" = $1, "Description" = $2
        WHERE "Id" = $3
        RETURNING *;
    `;

    try {
        const isDuplicate = await checkDuplicateCategoryName(CategoryName, id);
        if (isDuplicate) {
            return res.status(409).json({ 
                message: "Another category with this name already exists" 
            });
        }

        const { rows } = await appPool.query(query, [
            CategoryName.trim(), 
            Description ? Description.trim() : null, 
            id
        ]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Product category not found" });
        }

        res.json({
            message: "Product category updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating ProductCategory:", error);
        
        if (error.code === '23505') {
            return res.status(409).json({ 
                message: "Category with this name already exists" 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const softDeleteProductCategory = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid category ID" });
    }
    const checkQuery = `SELECT * FROM "ProductCategories" WHERE "Id" = $1`;
    const query = `
        UPDATE "ProductCategories"
        SET "CategoryName" = CONCAT('DELETED_', "Id", '_', "CategoryName"),
            "Description" = CONCAT('[DELETED] ', COALESCE("Description", ''))
        WHERE "Id" = $1
        RETURNING *;
    `;

    try {
        const { rows: existingRows } = await appPool.query(checkQuery, [id]);
        
        if (!existingRows.length) {
            return res.status(404).json({ message: "Product category not found" });
        }
        if (existingRows[0].CategoryName.startsWith('DELETED_')) {
            return res.status(400).json({ message: "Category is already deleted" });
        }

        const { rows } = await appPool.query(query, [id]);

        res.json({ 
            message: "Product category soft deleted successfully", 
            data: rows[0] 
        });
    } catch (error) {
        console.error("Error soft deleting ProductCategory:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const hardDeleteProductCategory = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid category ID" });
    }

    const query = `DELETE FROM "ProductCategories" WHERE "Id" = $1 RETURNING *;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Product category not found" });
        }

        res.json({ 
            message: "Product category deleted permanently", 
            data: rows[0] 
        });
    } catch (error) {
        console.error("Error hard deleting ProductCategory:", error);
        if (error.code === '23503') {
            return res.status(409).json({ 
                message: "Cannot delete category. It is being used by other records." 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getProductCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid category ID" });
    }

    const query = `SELECT * FROM "ProductCategories" WHERE "Id" = $1;`;

    try {
        const { rows } = await appPool.query(query, [id]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Product category not found" });
        }

        res.json({
            message: "Product category retrieved successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error fetching ProductCategory by Id:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getAllProductCategories = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const descriptionStatus = req.query.descriptionStatus || '';
    const sortBy = req.query.sortBy || 'CreatedAt';
    const sortOrder = (req.query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (limit < 1 || limit > 100) {
        return res.status(400).json({ 
            message: "Limit must be between 1 and 100" 
        });
    }

    if (offset < 0) {
        return res.status(400).json({ 
            message: "Offset must be 0 or greater" 
        });
    }
    let dataQuery = `
        SELECT * FROM "ProductCategories"
        WHERE "CategoryName" NOT LIKE 'DELETED_%'
    `;
    
    let countQuery = `
        SELECT COUNT(*) as total FROM "ProductCategories"
        WHERE "CategoryName" NOT LIKE 'DELETED_%'
    `;

    const params = [];
    
    if (search) {
        const queryParamIndex = params.length + 1;
        dataQuery += ` AND ("CategoryName" ILIKE $${queryParamIndex} OR "Description" ILIKE $${queryParamIndex})`;
        countQuery += ` AND ("CategoryName" ILIKE $${queryParamIndex} OR "Description" ILIKE $${queryParamIndex})`;
        params.push(`%${search}%`);
    }

    if (descriptionStatus === 'with') {
        dataQuery += ` AND COALESCE(TRIM("Description"), '') <> ''`;
        countQuery += ` AND COALESCE(TRIM("Description"), '') <> ''`;
    } else if (descriptionStatus === 'without') {
        dataQuery += ` AND COALESCE(TRIM("Description"), '') = ''`;
        countQuery += ` AND COALESCE(TRIM("Description"), '') = ''`;
    }

    const allowedSortColumns = ['Id', 'CategoryName', 'CreatedAt', 'UpdatedAt'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'CreatedAt';

    dataQuery += ` ORDER BY "${validSortBy}" ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    try {
        const countParams = [...params].slice(0, params.length - 2);
        const { rows: countRows } = await appPool.query(countQuery, countParams);
        const total = parseInt(countRows[0].total);
        const { rows } = await appPool.query(dataQuery, params);

        res.json({
            message: "Product categories retrieved successfully",
            data: rows,
            pagination: {
                total,
                limit,
                offset,
                totalPages: Math.ceil(total / limit),
                currentPage: Math.floor(offset / limit) + 1,
                hasNext: offset + limit < total,
                hasPrevious: offset > 0
            }
        });
    } catch (error) {
        console.error("Error fetching all ProductCategories:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const getActiveProductCategories = async (req, res) => {
    const query = `
        SELECT * FROM "ProductCategories"
        WHERE "CategoryName" NOT LIKE 'DELETED_%'
        ORDER BY "CategoryName" ASC;
    `;

    try {
        const { rows } = await appPool.query(query);
        
        res.json({
            message: "Active product categories retrieved successfully",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching active ProductCategories:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createProductCategory,
    updateProductCategory,
    softDeleteProductCategory,
    hardDeleteProductCategory,
    getProductCategoryById,
    getAllProductCategories,
    getActiveProductCategories
};
