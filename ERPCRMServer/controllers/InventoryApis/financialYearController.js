const { appPool } = require("../../config/db");

<<<<<<< HEAD
// @desc    Get all financial years
// @route   GET /api/financial-years
// @access  Private
const getAllFinancialYears = async (req, res) => {
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  try {
    const { companyId, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

<<<<<<< HEAD
    let query = `SELECT fy.*, u."FullName" as "ClosedByName"
      FROM "FinancialYears" fy
      LEFT JOIN "Users" u ON fy."ClosedBy" = u."UserId"
      WHERE fy."CompanyId" = $1`;
    const params = [companyId || req.user?.CompanyId];
    let idx = 1;

    if (isActive !== undefined) {
      idx++; query += ` AND fy."IsActive" = $${idx}`; params.push(isActive === 'true');
    }

    query += ` ORDER BY fy."StartDate" DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
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
<<<<<<< HEAD
      `SELECT fy.*, u."FullName" as "ClosedByName"
       FROM "FinancialYears" fy
       LEFT JOIN "Users" u ON fy."ClosedBy" = u."UserId"
       WHERE fy."Id" = $1`, [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Financial year not found" });
    }
=======
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

>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching financial year:", error);
    res.status(500).json({ message: "Failed to fetch financial year", error: error.message });
  }
};

<<<<<<< HEAD
// @desc    Create financial year
// @route   POST /api/financial-years
// @access  Private
const createFinancialYear = async (req, res) => {
  try {
    const { fiscalYearName, startDate, endDate, notes, periodType = 'Monthly' } = req.body;
    const companyId = req.user?.CompanyId;
    const userId = req.user?.UserId;

    // Validate dates
    if (!fiscalYearName || !startDate || !endDate) {
      return res.status(400).json({ message: "Fiscal year name, start date, and end date are required" });
    }

    // Check for overlapping financial years
    const overlapCheck = await appPool.query(
      `SELECT "Id" FROM "FinancialYears"
       WHERE "CompanyId" = $1
       AND "StartDate" <= $2 AND "EndDate" >= $3
       AND "IsClosed" = FALSE`,
      [companyId, endDate, startDate]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({ message: "Financial year overlaps with an existing active financial year" });
    }

    const result = await appPool.query(
      `INSERT INTO "FinancialYears" ("CompanyId", "FiscalYearName", "StartDate", "EndDate", "IsActive", "Notes", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $6) RETURNING *`,
      [companyId, fiscalYearName, startDate, endDate, notes || null, userId]
    );

    // Auto-create accounting periods based on period type
    const financialYearId = result.rows[0].Id;
    const fyStart = new Date(startDate);
    const fyEnd = new Date(endDate);

    let currentStart = new Date(fyStart);
    let periodIndex = 1;

    while (currentStart < fyEnd) {
      let periodEnd = new Date(currentStart);

      if (periodType === 'Quarterly') {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
      } else if (periodType === 'Weekly') {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else {
        // Monthly (default)
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      if (periodEnd > fyEnd) periodEnd.setTime(fyEnd.getTime());

      const periodName = `Period ${String(periodIndex).padStart(2, '0')}`;
      await appPool.query(
        `INSERT INTO "AccountingPeriods" ("FinancialYearId", "PeriodName", "PeriodType", "StartDate", "EndDate")
         VALUES ($1, $2, $3, $4, $5)`,
        [financialYearId, periodName, periodType,
         currentStart.toISOString().split('T')[0],
         periodEnd.toISOString().split('T')[0]]
      );

      currentStart = new Date(periodEnd);
      periodIndex++;
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating financial year:", error);
    res.status(500).json({ message: "Failed to create financial year", error: error.message });
  }
};

=======
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
// @desc    Update financial year
// @route   PUT /api/financial-years/:id
// @access  Private
const updateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD
    const { fiscalYearName, startDate, endDate, notes, isActive } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "FinancialYears"
       SET "FiscalYearName" = COALESCE($1, "FiscalYearName"),
           "StartDate" = COALESCE($2, "StartDate"),
           "EndDate" = COALESCE($3, "EndDate"),
           "Notes" = COALESCE($4, "Notes"),
           "IsActive" = COALESCE($5, "IsActive"),
           "UpdatedBy" = $6,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $7
       RETURNING *`,
      [fiscalYearName, startDate, endDate, notes, isActive, userId, id]
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
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

<<<<<<< HEAD
// @desc    Close a financial year
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
// @route   POST /api/financial-years/:id/close
// @access  Private
const closeFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

<<<<<<< HEAD
    const fy = await appPool.query(`SELECT * FROM "FinancialYears" WHERE "Id" = $1`, [id]);
    if (fy.rows.length === 0) return res.status(404).json({ message: "Financial year not found" });
    if (fy.rows[0].IsClosed) return res.status(400).json({ message: "Financial year is already closed" });

    // Check for open accounting periods
    const openPeriods = await appPool.query(
      `SELECT COUNT(*) as count FROM "AccountingPeriods" WHERE "FinancialYearId" = $1 AND "IsClosed" = FALSE`,
      [id]
    );

    if (parseInt(openPeriods.rows[0].count) > 0) {
      return res.status(400).json({
        message: `Cannot close financial year. ${openPeriods.rows[0].count} accounting period(s) are still open. Close all periods first.`
      });
    }

    await appPool.query(
      `UPDATE "FinancialYears" SET "IsActive" = FALSE, "IsClosed" = TRUE, "ClosedAt" = CURRENT_TIMESTAMP, "ClosedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Financial year closed successfully" });
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  } catch (error) {
    console.error("Error closing financial year:", error);
    res.status(500).json({ message: "Failed to close financial year", error: error.message });
  }
};

<<<<<<< HEAD
// @desc    Re-open a closed financial year
// @route   POST /api/financial-years/:id/reopen
// @access  Private
const reopenFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const fy = await appPool.query(`SELECT * FROM "FinancialYears" WHERE "Id" = $1`, [id]);
    if (fy.rows.length === 0) return res.status(404).json({ message: "Financial year not found" });
    if (!fy.rows[0].IsClosed) return res.status(400).json({ message: "Financial year is not closed" });

    await appPool.query(
      `UPDATE "FinancialYears" SET "IsActive" = TRUE, "IsClosed" = FALSE, "ClosedAt" = NULL, "ClosedBy" = NULL, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Financial year re-opened successfully" });
  } catch (error) {
    console.error("Error re-opening financial year:", error);
    res.status(500).json({ message: "Failed to re-open financial year", error: error.message });
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  }
};

// @desc    Get accounting periods for a financial year
<<<<<<< HEAD
// @route   GET /api/financial-years/:id/periods
// @access  Private
const getAccountingPeriods = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT ap.* FROM "AccountingPeriods" ap WHERE ap."FinancialYearId" = $1 ORDER BY ap."StartDate" ASC`,
      [id]
=======
// @route   GET /api/financial-years/:fyId/periods
// @access  Private
const getAccountingPeriods = async (req, res) => {
  try {
    const { fyId } = req.params;
    const result = await appPool.query(
      `SELECT * FROM "AccountingPeriod" WHERE "FinancialYearId" = $1 ORDER BY "StartDate" ASC`,
      [fyId]
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching accounting periods:", error);
    res.status(500).json({ message: "Failed to fetch accounting periods", error: error.message });
  }
};

<<<<<<< HEAD
// @desc    Close an accounting period
// @route   POST /api/financial-years/periods/:id/close
=======
// @desc    Close accounting period
// @route   POST /api/accounting-periods/:id/close
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
// @access  Private
const closeAccountingPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

<<<<<<< HEAD
    const period = await appPool.query(`SELECT * FROM "AccountingPeriods" WHERE "Id" = $1`, [id]);
    if (period.rows.length === 0) return res.status(404).json({ message: "Accounting period not found" });
    if (period.rows[0].IsClosed) return res.status(400).json({ message: "Period is already closed" });

    await appPool.query(
      `UPDATE "AccountingPeriods" SET "IsOpen" = FALSE, "IsClosed" = TRUE, "ClosedAt" = CURRENT_TIMESTAMP, "ClosedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Accounting period closed successfully" });
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
  } catch (error) {
    console.error("Error closing accounting period:", error);
    res.status(500).json({ message: "Failed to close accounting period", error: error.message });
  }
};

<<<<<<< HEAD
// @desc    Re-open a closed accounting period
// @route   POST /api/financial-years/periods/:id/reopen
// @access  Private
const reopenAccountingPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const period = await appPool.query(`SELECT * FROM "AccountingPeriods" WHERE "Id" = $1`, [id]);
    if (period.rows.length === 0) return res.status(404).json({ message: "Accounting period not found" });
    if (!period.rows[0].IsClosed) return res.status(400).json({ message: "Period is not closed" });

    await appPool.query(
      `UPDATE "AccountingPeriods" SET "IsOpen" = TRUE, "IsClosed" = FALSE, "ClosedAt" = NULL, "ClosedBy" = NULL, "UpdatedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Accounting period re-opened successfully" });
  } catch (error) {
    console.error("Error re-opening accounting period:", error);
    res.status(500).json({ message: "Failed to re-open accounting period", error: error.message });
  }
};

module.exports = {
  getAllFinancialYears,
  getFinancialYearById,
  createFinancialYear,
  updateFinancialYear,
  closeFinancialYear,
  reopenFinancialYear,
  getAccountingPeriods,
  closeAccountingPeriod,
  reopenAccountingPeriod,
};
=======
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
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
