const { appPool } = require("../../config/db");

// @desc    Get detailed audit logs with before/after values
// @route   GET /api/audit-logs/detailed
// @access  Private
const getDetailedAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId, action, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u."FullName" as "ActionByName"
      FROM "AuditLogs" al
      LEFT JOIN "Users" u ON al."ActionBy" = u."UserId"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (entityType) { idx++; query += ` AND al."EntityType" = $${idx}`; params.push(entityType); }
    if (entityId) { idx++; query += ` AND al."EntityId" = $${idx}`; params.push(parseInt(entityId)); }
    if (action) { idx++; query += ` AND al."Action" = $${idx}`; params.push(action); }

    query += ` ORDER BY al."CreatedAt" DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);

    // For each log, try to fetch before/after details from AuditLogDetails if they exist
    const detailedLogs = [];
    for (const log of result.rows) {
      let details = null;
      try {
        const detailsResult = await appPool.query(
          `SELECT * FROM "AuditLogDetails" WHERE "AuditLogId" = $1`,
          [log.Id]
        );
        if (detailsResult.rows.length > 0) {
          details = detailsResult.rows[0];
        }
      } catch (e) {
        // AuditLogDetails table might not exist yet
      }
      detailedLogs.push({ ...log, details });
    }

    res.json({ data: detailedLogs, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching detailed audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs", error: error.message });
  }
};

// @desc    Export audit logs
// @route   GET /api/audit-logs/export
// @access  Private
const exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, entityType } = req.query;

    let query = `
      SELECT al."CreatedAt", al."EntityType", al."EntityId", al."Action", 
             al."ActionBy", u."FullName" as "ActionByName",
             al."IPAddress", al."UserAgent"
      FROM "AuditLogs" al
      LEFT JOIN "Users" u ON al."ActionBy" = u."UserId"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (startDate) { idx++; query += ` AND al."CreatedAt" >= $${idx}`; params.push(startDate); }
    if (endDate) { idx++; query += ` AND al."CreatedAt" <= $${idx}`; params.push(endDate); }
    if (entityType) { idx++; query += ` AND al."EntityType" = $${idx}`; params.push(entityType); }

    query += ` ORDER BY al."CreatedAt" DESC`;

    const result = await appPool.query(query, params);

    // Format as CSV
    const headers = ['Timestamp', 'EntityType', 'EntityId', 'Action', 'ActionBy', 'ActionByName', 'IPAddress', 'UserAgent'];
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      csvRows.push([
        row.CreatedAt,
        row.EntityType,
        row.EntityId,
        row.Action,
        row.ActionBy,
        `"${(row.ActionByName || '').replace(/"/g, '""')}"`,
        row.IPAddress || '',
        `"${(row.UserAgent || '').replace(/"/g, '""')}"`,
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({ message: "Failed to export audit logs", error: error.message });
  }
};

// @desc    Get compliance report
// @route   GET /api/audit-logs/compliance-report
// @access  Private
const getComplianceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await appPool.query(`
      SELECT 
        DATE("CreatedAt") as "Date",
        "EntityType",
        "Action",
        COUNT(*) as "Count",
        COUNT(DISTINCT "ActionBy") as "UniqueUsers"
      FROM "AuditLogs"
      WHERE ($1::timestamp IS NULL OR "CreatedAt" >= $1)
        AND ($2::timestamp IS NULL OR "CreatedAt" <= $2)
      GROUP BY DATE("CreatedAt"), "EntityType", "Action"
      ORDER BY "Date" DESC, "Count" DESC
    `, [startDate || null, endDate || null]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching compliance report:", error);
    res.status(500).json({ message: "Failed to fetch compliance report", error: error.message });
  }
};

// @desc    Create AuditLogDetails table if not exists
// @route   POST /api/audit-logs/setup-details
// @access  Private (Admin only)
const setupAuditLogDetails = async (req, res) => {
  try {
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS "AuditLogDetails" (
        "Id" SERIAL PRIMARY KEY,
        "AuditLogId" INT REFERENCES "AuditLogs"("Id") ON DELETE CASCADE,
        "BeforeValues" JSONB DEFAULT '{}',
        "AfterValues" JSONB DEFAULT '{}',
        "ChangedFields" TEXT[] DEFAULT '{}',
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("AuditLogId")
      )
    `);
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_details_log ON "AuditLogDetails"("AuditLogId")');
    res.json({ message: "AuditLogDetails table created successfully" });
  } catch (error) {
    console.error("Error setting up audit log details:", error);
    res.status(500).json({ message: "Failed to setup audit log details", error: error.message });
  }
};

module.exports = {
  getDetailedAuditLogs,
  exportAuditLogs,
  getComplianceReport,
  setupAuditLogDetails,
};