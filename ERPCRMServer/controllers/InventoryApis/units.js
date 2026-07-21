const { appPool } = require("../../config/db");

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate required fields
 */
const validateUnit = (Name, Symbol) => {
    const errors = [];
    
    if (!Name || Name.trim() === '') {
        errors.push('Unit name is required');
    }
    
    if (Name && Name.length > 50) {
        errors.push('Unit name must not exceed 50 characters');
    }

    if (Symbol && Symbol.length > 10) {
        errors.push('Symbol must not exceed 10 characters');
    }
    
    return errors;
};

/**
 * Check if unit name already exists
 */
const checkDuplicateUnitName = async (Name, excludeId = null) => {
    let query = `SELECT "Id" FROM "Units" WHERE LOWER("Name") = LOWER($1)`;
    const params = [Name];
    
    if (excludeId) {
        query += ` AND "Id" != $2`;
        params.push(excludeId);
    }
    
    const { rows } = await appPool.query(query, params);
    return rows.length > 0;
};

/**
 * Check if symbol already exists
 */
const checkDuplicateSymbol = async (Symbol, excludeId = null) => {
    if (!Symbol) return false;
    
    let query = `SELECT "Id" FROM "Units" WHERE LOWER("Symbol") = LOWER($1)`;
    const params = [Symbol];
    
    if (excludeId) {
        query += ` AND "Id" != $2`;
        params.push(excludeId);
    }
    
    const { rows } = await appPool.query(query, params);
    return rows.length > 0;
};

// ============================================
// API CONTROLLERS
// ============================================

/**
 * Create a new Unit
 * POST /api/units/create
 */
const createUnit = async (req, res) => {
    const { Name, Symbol } = req.body;

    // Validate input
    const validationErrors = validateUnit(Name, Symbol);
    if (validationErrors.length > 0) {
        return res.status(400).json({ 
            message: "Validation failed", 
            errors: validationErrors 
        });
    }

    const query = `
        INSERT INTO "Units" ("Name", "Symbol")
        VALUES ($1, $2)
        RETURNING *;
    `;

    try {
        // Check for duplicate name
        const isDuplicateName = await checkDuplicateUnitName(Name);
        if (isDuplicateName) {
            return res.status(409).json({ 
                message: "Unit with this name already exists" 
            });
        }

        // Check for duplicate symbol
        if (Symbol) {
            const isDuplicateSymbol = await checkDuplicateSymbol(Symbol);
            if (isDuplicateSymbol) {
                return res.status(409).json({ 
                    message: "Unit with this symbol already exists" 
                });
            }
        }

        const { rows } = await appPool.query(query, [
            Name.trim(), 
            Symbol ? Symbol.trim() : null
        ]);
        
        res.status(201).json({
            message: "Unit created successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error creating Unit:", error);
        
        if (error.code === '23505') {
            return res.status(409).json({ 
                message: "Unit with this name or symbol already exists" 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update Unit by Id
 * PUT /api/units/:id
 */
const updateUnit = async (req, res) => {
    const { id } = req.params;
    const { Name, Symbol } = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid unit ID" });
    }

    // Validate input
    const validationErrors = validateUnit(Name, Symbol);
    if (validationErrors.length > 0) {
        return res.status(400).json({ 
            message: "Validation failed", 
            errors: validationErrors 
        });
    }

    const query = `
        UPDATE "Units"
        SET "Name" = $1, "Symbol" = $2
        WHERE "Id" = $3
        RETURNING *;
    `;

    try {
        // Check for duplicate name (excluding current record)
        const isDuplicateName = await checkDuplicateUnitName(Name, id);
        if (isDuplicateName) {
            return res.status(409).json({ 
                message: "Another unit with this name already exists" 
            });
        }

        // Check for duplicate symbol (excluding current record)
        if (Symbol) {
            const isDuplicateSymbol = await checkDuplicateSymbol(Symbol, id);
            if (isDuplicateSymbol) {
                return res.status(409).json({ 
                    message: "Another unit with this symbol already exists" 
                });
            }
        }

        const { rows } = await appPool.query(query, [
            Name.trim(), 
            Symbol ? Symbol.trim() : null, 
            id
        ]);
        
        if (!rows.length) {
            return res.status(404).json({ message: "Unit not found" });
        }

        res.json({
            message: "Unit updated successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error updating Unit:", error);
        
        if (error.code === '23505') {
            return res.status(409).json({ 
                message: "Unit with this name or symbol already exists" 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



const softDeleteUnit = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid unit ID" });
    }

    try {
        const checkQuery = `SELECT * FROM "Units" WHERE "Id" = $1`;
        const { rows: existingRows } = await appPool.query(checkQuery, [id]);
        
        if (!existingRows.length) {
            return res.status(404).json({ message: "Unit not found" });
        }

        const existingUnit = existingRows[0];
        if (existingUnit.Name && existingUnit.Name.startsWith('DELETED_')) {
            return res.status(400).json({ message: "Unit is already deleted" });
        }
        const newName = `DELETED_${id}_${existingUnit.Name}`;
        const newSymbol = existingUnit.Symbol ? `[DEL]${existingUnit.Symbol}` : null;
        const deleteQuery = `
            UPDATE "Units"
            SET "Name" = $1,
                "Symbol" = $2
            WHERE "Id" = $3
            RETURNING *;
        `;

        const { rows } = await appPool.query(deleteQuery, [newName, newSymbol, id]);

        res.json({ 
            message: "Unit soft deleted successfully", 
            data: rows[0] 
        });
    } catch (error) {
        console.error("Error soft deleting Unit:", error);
        console.error("Error details:", error.stack);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const hardDeleteUnit = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid unit ID" });
    }
    const query = `DELETE FROM "Units" WHERE "Id" = $1 RETURNING *;`;
    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Unit not found" });
        }
        res.json({ 
            message: "Unit deleted permanently", 
            data: rows[0] 
        });
    } catch (error) {
        console.error("Error hard deleting Unit:", error);
        
        if (error.code === '23503') {
            return res.status(409).json({ 
                message: "Cannot delete unit. It is being used by other records." 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const getUnitById = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid unit ID" });
    }
    const query = `SELECT * FROM "Units" WHERE "Id" = $1;`;
    try {
        const { rows } = await appPool.query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ message: "Unit not found" });
        }
        res.json({
            message: "Unit retrieved successfully",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error fetching Unit by Id:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getAllUnits = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const hasSymbol = req.query.hasSymbol || '';
    const sortBy = req.query.sortBy || 'Id';
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
        SELECT * FROM "Units"
        WHERE "Name" NOT LIKE 'DELETED_%'
    `;
    let countQuery = `
        SELECT COUNT(*) as total FROM "Units"
        WHERE "Name" NOT LIKE 'DELETED_%'
    `;
    const params = [];

    if (search) {
        const queryParamIndex = params.length + 1;
        dataQuery += ` AND ("Name" ILIKE $${queryParamIndex} OR "Symbol" ILIKE $${queryParamIndex})`;
        countQuery += ` AND ("Name" ILIKE $${queryParamIndex} OR "Symbol" ILIKE $${queryParamIndex})`;
        params.push(`%${search}%`);
    }

    if (hasSymbol === 'true') {
        dataQuery += ` AND COALESCE("Symbol", '') <> ''`;
        countQuery += ` AND COALESCE("Symbol", '') <> ''`;
    } else if (hasSymbol === 'false') {
        dataQuery += ` AND COALESCE("Symbol", '') = ''`;
        countQuery += ` AND COALESCE("Symbol", '') = ''`;
    }

    const allowedSortColumns = ['Id', 'Name', 'Symbol', 'CreatedAt', 'UpdatedAt'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'Id';
    dataQuery += ` ORDER BY "${validSortBy}" ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    try {
        const countParams = [...params].slice(0, params.length - 2);
        const { rows: countRows } = await appPool.query(countQuery, countParams);
        const total = parseInt(countRows[0].total);
        const { rows } = await appPool.query(dataQuery, params);
        res.json({
            message: "Units retrieved successfully",
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
        console.error("Error fetching all Units:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const getActiveUnits = async (req, res) => {
    const query = `
        SELECT * FROM "Units"
        WHERE "Name" NOT LIKE 'DELETED_%'
        ORDER BY "Name" ASC;
    `;
    try {
        const { rows } = await appPool.query(query);
        res.json({
            message: "Active units retrieved successfully",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching active Units:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const bulkCreateUnits = async (req, res) => {
    const { units } = req.body;

    if (!Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ 
            message: "Units array is required and must not be empty" 
        });
    }

    if (units.length > 50) {
        return res.status(400).json({ 
            message: "Cannot create more than 50 units at once" 
        });
    }

    const client = await appPool.connect();

    try {
        await client.query('BEGIN');

        const createdUnits = [];
        const errors = [];

        for (let i = 0; i < units.length; i++) {
            const { Name, Symbol } = units[i];

            const validationErrors = validateUnit(Name, Symbol);
            if (validationErrors.length > 0) {
                errors.push({ index: i, unit: units[i], errors: validationErrors });
                continue;
            }

            try {
                const { rows } = await client.query(
                    `INSERT INTO "Units" ("Name", "Symbol") VALUES ($1, $2) RETURNING *`,
                    [Name.trim(), Symbol ? Symbol.trim() : null]
                );
                createdUnits.push(rows[0]);
            } catch (error) {
                if (error.code === '23505') {
                    errors.push({ 
                        index: i, 
                        unit: units[i], 
                        errors: ['Duplicate name or symbol'] 
                    });
                } else {
                    throw error;
                }
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: "Bulk creation completed",
            created: createdUnits.length,
            failed: errors.length,
            data: createdUnits,
            errors: errors
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in bulk create:", error);
        res.status(500).json({ 
            message: "Bulk creation failed",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
};

/**
 * Search Units
 * GET /api/units/search?q=kilogram
 */
const searchUnits = async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === '') {
        return res.status(400).json({ message: "Search query is required" });
    }

    const query = `
        SELECT * FROM "Units"
        WHERE "Name" NOT LIKE 'DELETED_%'
        AND ("Name" ILIKE $1 OR "Symbol" ILIKE $1)
        ORDER BY "Name" ASC
        LIMIT 20;
    `;

    try {
        const { rows } = await appPool.query(query, [`%${q}%`]);
        
        res.json({
            message: "Search completed successfully",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error searching units:", error);
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createUnit,
    updateUnit,
    softDeleteUnit,
    hardDeleteUnit,
    getUnitById,
    getAllUnits,
    getActiveUnits,
    bulkCreateUnits,
    searchUnits
};
