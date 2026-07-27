const { appPool } = require("../../config/db");

// @desc    Get all financial years
// @route   GET /api/financial-years
// @access  Private
const getAllFinancialYears = async (req, res) => {
  try {
    const { companyId, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

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
      `SELECT fy.*, u."FullName" as "ClosedByName"
       FROM "FinancialYears" fy
       LEFT JOIN "Users" u ON fy."ClosedBy" = u."UserId"
       WHERE fy."Id" = $1`, [id]
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

// @desc    Update financial year
// @route   PUT /api/financial-years/:id
// @access  Private
const updateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
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

// @desc    Close a financial year
// @route   POST /api/financial-years/:id/close
// @access  Private
const closeFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

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
  } catch (error) {
    console.error("Error closing financial year:", error);
    res.status(500).json({ message: "Failed to close financial year", error: error.message });
  }
};

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
  }
};

// @desc    Get accounting periods for a financial year
// @route   GET /api/financial-years/:id/periods
// @access  Private
const getAccountingPeriods = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(
      `SELECT ap.* FROM "AccountingPeriods" ap WHERE ap."FinancialYearId" = $1 ORDER BY ap."StartDate" ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching accounting periods:", error);
    res.status(500).json({ message: "Failed to fetch accounting periods", error: error.message });
  }
};

// @desc    Close an accounting period
// @route   POST /api/financial-years/periods/:id/close
// @access  Private
const closeAccountingPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;

    const period = await appPool.query(`SELECT * FROM "AccountingPeriods" WHERE "Id" = $1`, [id]);
    if (period.rows.length === 0) return res.status(404).json({ message: "Accounting period not found" });
    if (period.rows[0].IsClosed) return res.status(400).json({ message: "Period is already closed" });

    await appPool.query(
      `UPDATE "AccountingPeriods" SET "IsOpen" = FALSE, "IsClosed" = TRUE, "ClosedAt" = CURRENT_TIMESTAMP, "ClosedBy" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "Id" = $2`,
      [userId, id]
    );

    res.json({ message: "Accounting period closed successfully" });
  } catch (error) {
    console.error("Error closing accounting period:", error);
    res.status(500).json({ message: "Failed to close accounting period", error: error.message });
  }
};

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
