const { appPool } = require("../../config/db");
const path = require('path');
const fs = require('fs').promises;

// Validation Regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const PINCODE_REGEX = /^\d{6}$/;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate company data
 */
const validateCompanyData = (data, isUpdate = false) => {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
        if (!data.CompanyName || !data.CompanyName.trim()) {
            errors.push({ field: 'CompanyName', message: 'Company name is required' });
        }
        if (!data.Email || !data.Email.trim()) {
            errors.push({ field: 'Email', message: 'Email is required' });
        }
    }

    // Email validation
    if (data.Email && !EMAIL_REGEX.test(data.Email.trim())) {
        errors.push({ field: 'Email', message: 'Invalid email format' });
    }

    // GST validation (if provided)
    if (data.GstNumber && data.GstNumber.trim()) {
        const gst = data.GstNumber.trim().toUpperCase().replace(/\s/g, '');
        if (!GST_REGEX.test(gst)) {
            errors.push({ field: 'GstNumber', message: 'Invalid GST number format (e.g., 22AAAAA0000A1Z5)' });
        }
    }

    // Phone validation (if provided)
    if (data.Phone && data.Phone.trim() && !PHONE_REGEX.test(data.Phone.trim())) {
        errors.push({ field: 'Phone', message: 'Invalid phone number (must be 10 digits starting with 6-9)' });
    }

    // Website URL validation (if provided)
    if (data.Website && data.Website.trim() && !URL_REGEX.test(data.Website.trim())) {
        errors.push({ field: 'Website', message: 'Invalid website URL format' });
    }

    // Postal code validation (if provided)
    if (data.PostalCode && data.PostalCode.trim() && !PINCODE_REGEX.test(data.PostalCode.trim())) {
        errors.push({ field: 'PostalCode', message: 'Invalid postal code (must be 6 digits)' });
    }

    return errors;
};

/**
 * Check for duplicate email
 */
const checkDuplicateEmail = async (email, excludeId = null) => {
    let query = `SELECT "Id" FROM "Companies" WHERE LOWER("Email") = LOWER($1) AND "IsDelete" = FALSE`;
    const params = [email];
    
    if (excludeId) {
        query += ` AND "Id" != $2`;
        params.push(excludeId);
    }
    
    const { rows } = await appPool.query(query, params);
    return rows.length > 0;
};

/**
 * Check for duplicate GST number
 */
const checkDuplicateGST = async (gstNumber, excludeId = null) => {
    if (!gstNumber) return false;
    
    let query = `SELECT "Id" FROM "Companies" WHERE UPPER("GstNumber") = UPPER($1) AND "IsDelete" = FALSE`;
    const params = [gstNumber];
    
    if (excludeId) {
        query += ` AND "Id" != $2`;
        params.push(excludeId);
    }
    
    const { rows } = await appPool.query(query, params);
    return rows.length > 0;
};

/**
 * Delete old logo file
 */
const deleteOldLogo = async (logoUrl) => {
    if (!logoUrl) return;
    
    try {
        const filePath = path.join(__dirname, '../../', logoUrl);
        await fs.unlink(filePath);
        console.log('Old logo deleted:', filePath);
    } catch (error) {
        console.error('Error deleting old logo:', error.message);
    }
};

// ============================================
// API CONTROLLERS
// ============================================

/**
 * Create a new company
 * POST /api/companies/create
 */
const createCompany = async (req, res) => {
    try {
        let {
            CompanyName,
            BusinessType,
            GstNumber,
            Address,
            City,
            State,
            Country,
            PostalCode,
            Website,
            OwnerName,
            Email,
            Phone,
            IsActive = true,
            Flag = true
        } = req.body;

        // Validate required fields
        if (!CompanyName || !Email) {
            // Clean up uploaded file if validation fails
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(400).json({
                success: false,
                message: "Company name and email are required"
            });
        }

        // Normalize values
        Email = Email?.trim().toLowerCase();
        GstNumber = GstNumber?.trim().toUpperCase().replace(/\s/g, '') || null;
        Phone = Phone?.trim() || null;
        Website = Website?.trim() || null;

        // Validate data
        const validationErrors = validateCompanyData({
            CompanyName,
            Email,
            GstNumber,
            Phone,
            Website,
            PostalCode
        });

        if (validationErrors.length > 0) {
            // Clean up uploaded file
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Check for duplicate email
        const emailExists = await checkDuplicateEmail(Email);
        if (emailExists) {
            // Clean up uploaded file
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(409).json({
                success: false,
                field: 'Email',
                message: 'Email already exists'
            });
        }

        // Check for duplicate GST
        if (GstNumber) {
            const gstExists = await checkDuplicateGST(GstNumber);
            if (gstExists) {
                // Clean up uploaded file
                if (req.file) {
                    await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
                }
                return res.status(409).json({
                    success: false,
                    field: 'GstNumber',
                    message: 'GST number already exists'
                });
            }
        }

        // Handle logo upload
        let logoUrl = null;
        if (req.file) {
            logoUrl = `/uploads/companies/${req.file.filename}`;
        }

        const query = `
            INSERT INTO "Companies"
            ("CompanyName", "BusinessType", "GstNumber", "Address", "City", "State", "Country",
             "PostalCode", "Website", "OwnerName", "Email", "Phone", "LogoUrl", "IsActive", "Flag", "IsDelete")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE)
            RETURNING *;
        `;

        const values = [
            CompanyName?.trim(),
            BusinessType?.trim() || null,
            GstNumber,
            Address?.trim() || null,
            City?.trim() || null,
            State?.trim() || null,
            Country?.trim() || 'India',
            PostalCode?.trim() || null,
            Website,
            OwnerName?.trim() || null,
            Email,
            Phone,
            logoUrl,
            IsActive,
            Flag
        ];

        const result = await appPool.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: result.rows[0]
        });

    } catch (err) {
        console.error('Error creating company:', err);
        
        // Clean up uploaded file on error
        if (req.file) {
            await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error creating company', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Get all companies with pagination, search, and filters
 * GET /api/companies/list?search=&page=1&limit=20&isActive=&state=&city=
 */
const getCompanies = async (req, res) => {
    try {
        const { 
            search = '', 
            page = 1, 
            limit = 20,
            isActive,
            state,
            city,
            country,
            sortBy = 'Id',
            sortOrder = 'DESC'
        } = req.query;

        const pageNum = parseInt(page, 10);
        const pageSize = Math.min(parseInt(limit, 10), 100); // Max 100 items per page
        const offset = (pageNum - 1) * pageSize;

        // Build dynamic WHERE clause
        const conditions = [`"IsDelete" = FALSE`];
        const params = [];
        let paramIndex = 1;

        // Search across multiple columns
        if (search) {
            const searchQuery = `%${search}%`;
            params.push(searchQuery);
            conditions.push(`(
                "CompanyName"::text ILIKE $${paramIndex} OR
                "BusinessType"::text ILIKE $${paramIndex} OR
                "GstNumber"::text ILIKE $${paramIndex} OR
                "City"::text ILIKE $${paramIndex} OR
                "State"::text ILIKE $${paramIndex} OR
                "Email"::text ILIKE $${paramIndex} OR
                "OwnerName"::text ILIKE $${paramIndex} OR
                "Phone"::text ILIKE $${paramIndex}
            )`);
            paramIndex++;
        }

        // Filter by active status
        if (isActive !== undefined) {
            params.push(isActive === 'true');
            conditions.push(`"IsActive" = $${paramIndex}`);
            paramIndex++;
        }

        // Filter by state
        if (state) {
            params.push(state);
            conditions.push(`"State" = $${paramIndex}`);
            paramIndex++;
        }

        // Filter by city
        if (city) {
            params.push(city);
            conditions.push(`"City" = $${paramIndex}`);
            paramIndex++;
        }

        // Filter by country
        if (country) {
            params.push(country);
            conditions.push(`"Country" = $${paramIndex}`);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Validate sort column
        const allowedSortColumns = ['Id', 'CompanyName', 'CreatedAt', 'UpdatedAt', 'City', 'State', 'Email'];
        const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'Id';
        const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Fetch paginated records
        const dataQuery = `
            SELECT * FROM "Companies"
            WHERE ${whereClause}
            ORDER BY "${validSortBy}" ${validSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;
        params.push(pageSize, offset);

        const result = await appPool.query(dataQuery, params);

        // Fetch total matching records count
        const countQuery = `SELECT COUNT(*) FROM "Companies" WHERE ${whereClause};`;
        const countParams = params.slice(0, paramIndex - 1);
        const countResult = await appPool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            success: true,
            message: 'Companies retrieved successfully',
            data: result.rows,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize),
                hasNext: offset + pageSize < total,
                hasPrevious: pageNum > 1
            }
        });

    } catch (err) {
        console.error('Error fetching companies:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching companies', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Get active companies only
 * GET /api/companies/active
 */
const getActiveCompanies = async (req, res) => {
    try {
        const query = `
            SELECT "Id", "CompanyName", "Email", "City", "State", "Phone", "LogoUrl"
            FROM "Companies"
            WHERE "IsActive" = TRUE AND "IsDelete" = FALSE
            ORDER BY "CompanyName" ASC;
        `;

        const { rows } = await appPool.query(query);

        res.json({
            success: true,
            message: 'Active companies retrieved successfully',
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error fetching active companies:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching active companies',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Get company by ID
 * GET /api/companies/:id
 */
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        const result = await appPool.query(
            `SELECT * FROM "Companies" WHERE "Id" = $1 AND "IsDelete" = FALSE;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found' 
            });
        }

        res.json({ 
            success: true,
            message: 'Company retrieved successfully',
            data: result.rows[0] 
        });
    } catch (err) {
        console.error('Error fetching company:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching company', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Update company
 * PUT /api/companies/:id
 */
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            // Clean up uploaded file
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        // Get existing company
        const existingCompany = await appPool.query(
            `SELECT * FROM "Companies" WHERE "Id" = $1 AND "IsDelete" = FALSE;`,
            [id]
        );

        if (existingCompany.rows.length === 0) {
            // Clean up uploaded file
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found' 
            });
        }

        const fields = { ...req.body };

        // Normalize values
        if (fields.Email) fields.Email = fields.Email.trim().toLowerCase();
        if (fields.GstNumber) fields.GstNumber = fields.GstNumber.trim().toUpperCase().replace(/\s/g, '') || null;
        if (fields.Phone) fields.Phone = fields.Phone.trim() || null;
        if (fields.Website) fields.Website = fields.Website.trim() || null;

        // Validate data
        const validationErrors = validateCompanyData(fields, true);
        if (validationErrors.length > 0) {
            // Clean up uploaded file
            if (req.file) {
                await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
            }
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Check for duplicate email
        if (fields.Email) {
            const emailExists = await checkDuplicateEmail(fields.Email, id);
            if (emailExists) {
                // Clean up uploaded file
                if (req.file) {
                    await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
                }
                return res.status(409).json({
                    success: false,
                    field: 'Email',
                    message: 'Email already exists'
                });
            }
        }

        // Check for duplicate GST
        if (fields.GstNumber) {
            const gstExists = await checkDuplicateGST(fields.GstNumber, id);
            if (gstExists) {
                // Clean up uploaded file
                if (req.file) {
                    await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
                }
                return res.status(409).json({
                    success: false,
                    field: 'GstNumber',
                    message: 'GST number already exists'
                });
            }
        }

        // Handle logo upload
        if (req.file) {
            fields.LogoUrl = `/uploads/companies/${req.file.filename}`;
            
            // Delete old logo
            if (existingCompany.rows[0].LogoUrl) {
                await deleteOldLogo(existingCompany.rows[0].LogoUrl);
            }
        }

        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No fields to update' 
            });
        }

        // Build dynamic SET clause
        const keys = Object.keys(fields);
        const setClause = keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(', ');
        const values = Object.values(fields);

        const query = `
            UPDATE "Companies"
            SET ${setClause}, "UpdatedAt" = CURRENT_TIMESTAMP
            WHERE "Id" = $${values.length + 1}
            RETURNING *;
        `;

        const result = await appPool.query(query, [...values, id]);

        res.json({
            success: true,
            message: 'Company updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating company:', err);
        
        // Clean up uploaded file on error
        if (req.file) {
            await deleteOldLogo(`/uploads/companies/${req.file.filename}`);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error updating company', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Soft delete company
 * DELETE /api/companies/delete/:id
 */
const softDeleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        const result = await appPool.query(
            `UPDATE "Companies"
             SET "IsDelete" = TRUE, "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "Id" = $1 AND "IsDelete" = FALSE
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found or already deleted' 
            });
        }

        res.json({
            success: true,
            message: 'Company deleted successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error deleting company:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting company', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Restore deleted company
 * PATCH /api/companies/:id/restore
 */
const restoreCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        const result = await appPool.query(
            `UPDATE "Companies"
             SET "IsDelete" = FALSE, "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "Id" = $1 AND "IsDelete" = TRUE
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found or not deleted' 
            });
        }

        res.json({
            success: true,
            message: 'Company restored successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error restoring company:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error restoring company', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Toggle active status
 * PATCH /api/companies/:id/toggle-active
 */
const toggleActiveCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        const result = await appPool.query(
            `UPDATE "Companies"
             SET "IsActive" = NOT "IsActive", "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "Id" = $1 AND "IsDelete" = FALSE
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found' 
            });
        }

        res.json({
            success: true,
            message: `Company ${result.rows[0].IsActive ? 'activated' : 'deactivated'} successfully`,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error toggling active status:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error toggling active status', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Toggle flag status
 * PATCH /api/companies/:id/toggle-flag
 */
const toggleFlagCompany = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid company ID' 
            });
        }

        const result = await appPool.query(
            `UPDATE "Companies"
             SET "Flag" = NOT "Flag", "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "Id" = $1 AND "IsDelete" = FALSE
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company not found' 
            });
        }

        res.json({
            success: true,
            message: 'Company flag toggled successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error toggling flag:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error toggling flag', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Get company statistics
 * GET /api/companies/stats
 */
const getCompanyStats = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE "IsActive" = TRUE) as active,
                COUNT(*) FILTER (WHERE "IsActive" = FALSE) as inactive,
                COUNT(DISTINCT "State") as total_states,
                COUNT(DISTINCT "City") as total_cities,
                COUNT(*) FILTER (WHERE "GstNumber" IS NOT NULL) as with_gst,
                COUNT(*) FILTER (WHERE "LogoUrl" IS NOT NULL) as with_logo
            FROM "Companies"
            WHERE "IsDelete" = FALSE;
        `;

        const { rows } = await appPool.query(query);

        res.json({
            success: true,
            message: 'Company statistics retrieved successfully',
            data: {
                ...rows[0],
                total: parseInt(rows[0].total),
                active: parseInt(rows[0].active),
                inactive: parseInt(rows[0].inactive),
                total_states: parseInt(rows[0].total_states),
                total_cities: parseInt(rows[0].total_cities),
                with_gst: parseInt(rows[0].with_gst),
                with_logo: parseInt(rows[0].with_logo)
            }
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching statistics',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Bulk delete companies
 * DELETE /api/companies/bulk-delete
 */
const bulkDeleteCompanies = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'IDs array is required and must not be empty'
            });
        }

        if (ids.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete more than 100 companies at once'
            });
        }

        const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
        const query = `
            UPDATE "Companies"
            SET "IsDelete" = TRUE, "UpdatedAt" = CURRENT_TIMESTAMP
            WHERE "Id" IN (${placeholders}) AND "IsDelete" = FALSE
            RETURNING "Id", "CompanyName";
        `;

        const result = await appPool.query(query, ids);

        res.json({
            success: true,
            message: `${result.rows.length} companies deleted successfully`,
            data: result.rows
        });
    } catch (err) {
        console.error('Error bulk deleting companies:', err);
        res.status(500).json({
            success: false,
            message: 'Error deleting companies',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Get deleted companies
 * GET /api/companies/deleted
 */
const getDeletedCompanies = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const pageNum = parseInt(page, 10);
        const pageSize = Math.min(parseInt(limit, 10), 100);
        const offset = (pageNum - 1) * pageSize;

        const dataQuery = `
            SELECT * FROM "Companies"
            WHERE "IsDelete" = TRUE
            ORDER BY "UpdatedAt" DESC
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `SELECT COUNT(*) FROM "Companies" WHERE "IsDelete" = TRUE;`;

        const result = await appPool.query(dataQuery, [pageSize, offset]);
        const countResult = await appPool.query(countQuery);
        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            success: true,
            message: 'Deleted companies retrieved successfully',
            data: result.rows,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize),
                hasNext: offset + pageSize < total,
                hasPrevious: pageNum > 1
            }
        });
    } catch (err) {
        console.error('Error fetching deleted companies:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching deleted companies',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Export companies to CSV
 * GET /api/companies/export
 */
const exportCompanies = async (req, res) => {
    try {
        const query = `
            SELECT 
                "Id", "CompanyName", "BusinessType", "GstNumber", "Email", 
                "Phone", "City", "State", "Country", "PostalCode", 
                "Website", "OwnerName", "IsActive", "CreatedAt"
            FROM "Companies"
            WHERE "IsDelete" = FALSE
            ORDER BY "Id" ASC;
        `;

        const { rows } = await appPool.query(query);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No companies found to export'
            });
        }

        // Build CSV
        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => 
            Object.values(row).map(val => 
                `"${String(val || '').replace(/"/g, '""')}"`
            ).join(',')
        );
        const csv = [headers, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=companies-${Date.now()}.csv`);
        res.send(csv);

    } catch (err) {
        console.error('Error exporting companies:', err);
        res.status(500).json({
            success: false,
            message: 'Error exporting companies',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

module.exports = {
    createCompany,
    getCompanies,
    getActiveCompanies,
    getCompanyById,
    updateCompany,
    softDeleteCompany,
    restoreCompany,
    toggleActiveCompany,
    toggleFlagCompany,
    getCompanyStats,
    bulkDeleteCompanies,
    getDeletedCompanies,
    exportCompanies
};
