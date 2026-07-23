const { appPool } = require("../../config/db");

// @desc    Create a new financial year
// @route   POST /api/financial-years
// @access  Private
const createFinancialYear = async (req, res) => {
  try {
    const { companyId, name, startDate, endDate, notes } = req.body;
    const userId = req.user?.UserId;

    if (!companyId || !name || !startDate || !endDate) {
      return res.status(400).json({ message: "CompanyId, Name, StartDate, and EndDate are required" });
    }

    // Check for overlapping dates
    const overlapCheck = await appPool.query(
      `SELECT "Id" FROM "FinancialYear" 
       WHERE "CompanyId" = $1 AND "IsDeleted" != true
       AND ($2::DATE, $3::DATE) OVERLAPS ("StartDate", "EndDate")`,
      [companyId, startDate, endDate]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({ message: "Financial year overlaps with an existing one" });
    }

    const result = await appPool.query(
      `INSERT INTO "FinancialYear" ("CompanyId", "Name", "StartDate", "EndDate", "IsActive", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [companyId, name, startDate, endDate, false, notes || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating financial year:", error);
    res.status(500).json({ message: "Failed to create financial year", error: error.message });
  }
};

// @desc    Get all financial years
// @route   GET /api/financial-years
// @access  Private
const getFinancialYears = async (req, res) => {
  try {
    const { companyId, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM "FinancialYear" WHERE "IsDeleted" != true`;
    const params = [];

    if (companyId) {
      query += ` AND "CompanyId" = $${params.length + 1}`;
      params.push(companyId);
    }
    if (isActive !== undefined) {
      query += ` AND "IsActive" = $${params.length + 1}`;
      params.push(isActive === 'true');
    }

    query += ` ORDER BY "StartDate" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching financial years:", error);
    res.status(500).json({ message: "Failed to fetch financial years", error: error.message });
  }
};

// @desc    Get financial year by ID
// @route   GET /api/financial-years/:id
// @access  Private
const getFinancialYearById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT fy.*, 
        (SELECT json_agg(json_build_object(
          'Id', ap."Id", 'Name', ap."Name", 'StartDate', ap."StartDate",
          'EndDate', ap."EndDate", 'IsActive', ap."IsActive", 'IsClosed', ap."IsClosed"
        )) FROM "AccountingPeriod" ap WHERE ap."FinancialYearId" = fy."Id") as "AccountingPeriods"
       FROM "FinancialYear" fy WHERE fy."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Financial year not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching financial year:", error);
    res.status(500).json({ message: "Failed to fetch financial year", error: error.message });
  }
};

// @desc    Update financial year
// @route   PUT /api/financial-years/:id
// @access  Private
const updateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, notes } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "FinancialYear" SET 
        "Name" = COALESCE($1, "Name"),
        "StartDate" = COALESCE($2, "StartDate"),
        "EndDate" = COALESCE($3, "EndDate"),
        "Notes" = COALESCE($4, "Notes"),
        "UpdatedBy" = $5,
        "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $6 AND "IsDeleted" != true RETURNING *`,
      [name || null, startDate || null, endDate || null, notes || null, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Financial year not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating financial year:", error);
    res.status(500).json({ message: "Failed to update financial year", error: error.message });
  }
};

// @desc    Delete financial year (soft delete)
// @route   DELETE /api/financial-years/:id
// @access  Private
const deleteFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(
      `UPDATE "FinancialYear" SET "IsDeleted" = true, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $1`,
      [id]
    );
    res.json({ message: "Financial year deleted successfully" });
  } catch (error) {
    console.error("Error deleting financial year:", error);
    res.status(500).json({ message: "Failed to delete financial year", error: error.message });
  }
};

// @desc    Activate financial year
// @route   POST /api/financial-years/:id/activate
// @access  Private
const activateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    // Deactivate all others
    await appPool.query(`UPDATE "FinancialYear" SET "IsActive" = false`);

    // Activate the selected one
    const result = await appPool.query(
      `UPDATE "FinancialYear" SET "IsActive" = true, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2 RETURNING *`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Financial year not found" });
    }

    // Auto-create monthly accounting periods
    const fy = result.rows[0];
    const startDate = new Date(fy.StartDate);
    const endDate = new Date(fy.EndDate);
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      if (monthStart < startDate) monthStart.setTime(startDate.getTime());
      if (monthEnd > endDate) monthEnd.setTime(endDate.getTime());

      await appPool.query(
        `INSERT INTO "AccountingPeriod" ("FinancialYearId", "Name", "StartDate", "EndDate", "IsActive", "CreatedBy", "UpdatedBy")
         VALUES ($1, $2, $3, $4, true, $5, $5)
         ON CONFLICT ("FinancialYearId", "Name") DO NOTHING`,
        [id, monthName, monthStart, monthEnd, userId]
      );

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error activating financial year:", error);
    res.status(500).json({ message: "Failed to activate financial year", error: error.message });
  }
};

// @desc    Close financial year
// @route   POST /api/financial-years/:id/close
// @access  Private
const closeFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "FinancialYear" SET 
        "IsActive" = false, "IsClosed" = true, "ClosedAt" = CURRENT_TIMESTAMP, 
        "ClosedBy" = $1, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $2 AND "IsDeleted" != true RETURNING *`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Financial year not found" });
    }

    // Close all accounting periods
    await appPool.query(
      `UPDATE "AccountingPeriod" SET "IsActive" = false, "IsClosed" = true, 
       "ClosedAt" = CURRENT_TIMESTAMP, "ClosedBy" = $1 WHERE "FinancialYearId" = $2`,
      [userId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error closing financial year:", error);
    res.status(500).json({ message: "Failed to close financial year", error: error.message });
  }
};

// Accounting Period Controllers

// @desc    Create accounting period
// @route   POST /api/financial-years/:fyId/periods
// @access  Private
const createAccountingPeriod = async (req, res) => {
  try {
    const { fyId } = req.params;
    const { name, startDate, endDate } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `INSERT INTO "AccountingPeriod" ("FinancialYearId", "Name", "StartDate", "EndDate", "IsActive", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, true, $5, $5) RETURNING *`,
      [fyId, name, startDate, endDate, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating accounting period:", error);
    res.status(500).json({ message: "Failed to create accounting period", error: error.message });
  }
};

// @desc    Get accounting periods for a financial year
// @route   GET /api/financial-years/:fyId/periods
// @access  Private
const getAccountingPeriods = async (req, res) => {
  try {
    const { fyId } = req.params;
    const result = await appPool.query(
      `SELECT * FROM "AccountingPeriod" WHERE "FinancialYearId" = $1 ORDER BY "StartDate" ASC`,
      [fyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching accounting periods:", error);
    res.status(500).json({ message: "Failed to fetch accounting periods", error: error.message });
  }
};

// @desc    Close accounting period
// @route   POST /api/accounting-periods/:id/close
// @access  Private
const closeAccountingPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "AccountingPeriod" SET 
        "IsActive" = false, "IsClosed" = true, "ClosedAt" = CURRENT_TIMESTAMP,
        "ClosedBy" = $1, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $2 RETURNING *`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Accounting period not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error closing accounting period:", error);
    res.status(500).json({ message: "Failed to close accounting period", error: error.message });
  }
};

module.exports = {
  createFinancialYear,
  getFinancialYears,
  getFinancialYearById,
  updateFinancialYear,
  deleteFinancialYear,
  activateFinancialYear,
  closeFinancialYear,
  createAccountingPeriod,
  getAccountingPeriods,
  closeAccountingPeriod,
};