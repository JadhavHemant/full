const { appPool } = require("../../config/db");
const { ROLE_IDS } = require("../../config/roleConfig");

/**
 * Get audit logs with optional filtering
 * Query params:
 * - userId: Filter by user ID
 * - roleId: Filter by role ID
 * - entityType: Filter by entity type (e.g., 'Role', 'Permission')
 * - limit: Number of records to return (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      roleId,
      entityType,
      action,
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = req.query;

    let query = `
      SELECT 
        al."Id",
        al."UserId",
        al."RoleId",
        al."Action",
        al."EntityType",
        al."EntityId",
        al."OldValue",
        al."NewValue",
        al."IpAddress",
        al."UserAgent",
        al."CreatedAt",
        u."Name" as "UserName",
        r."RoleName"
      FROM "AuditLogs" al
      LEFT JOIN "Users" u ON al."UserId" = u."UserId"
      LEFT JOIN "Roles" r ON al."RoleId" = r."Id"
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND al."UserId" = $${paramCount}`;
      params.push(userId);
    }

    if (roleId) {
      paramCount++;
      query += ` AND al."RoleId" = $${paramCount}`;
      params.push(roleId);
    }

    if (entityType) {
      paramCount++;
      query += ` AND al."EntityType" = $${paramCount}`;
      params.push(entityType);
    }

    if (action) {
      paramCount++;
      query += ` AND al."Action" = $${paramCount}`;
      params.push(action);
    }

    if (startDate) {
      paramCount++;
      query += ` AND al."CreatedAt" >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND al."CreatedAt" <= $${paramCount}`;
      params.push(endDate);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT al."Id", al."UserId", al."RoleId", al."Action", al."EntityType", al."EntityId", al."OldValue", al."NewValue", al."IpAddress", al."UserAgent", al."CreatedAt", u."Name" as "UserName", r."RoleName"',
      'SELECT COUNT(*) as total'
    );
    
    const countResult = await appPool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add ordering and pagination
    paramCount++;
    query += ` ORDER BY al."CreatedAt" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await appPool.query(query, params);

    res.status(200).json({
      logs: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Server error while fetching audit logs" });
  }
};

/**
 * Get a single audit log by ID
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await appPool.query(
      `SELECT 
        al.*,
        u."Name" as "UserName",
        r."RoleName"
      FROM "AuditLogs" al
      LEFT JOIN "Users" u ON al."UserId" = u."UserId"
      LEFT JOIN "Roles" r ON al."RoleId" = r."Id"
      WHERE al."Id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ message: "Server error while fetching audit log" });
  }
};

/**
 * Create an audit log entry
 * This is typically called internally by other controllers
 */
const createAuditLog = async (auditData) => {
  try {
    const {
      userId,
      roleId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent
    } = auditData;

    const result = await appPool.query(
      `INSERT INTO "AuditLogs" 
        ("UserId", "RoleId", "Action", "EntityType", "EntityId", "OldValue", "NewValue", "IpAddress", "UserAgent", "CreatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING "Id"`,
      [
        userId,
        roleId,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent
      ]
    );

    return result.rows[0].Id;

  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
};

/**
 * Delete old audit logs (cleanup utility)
 * Query params:
 * - days: Delete logs older than this many days (default: 90)
 */
const cleanupAuditLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    // Only allow Super Admin to cleanup logs
    if (!req.user || Number(req.user.roleId) !== ROLE_IDS.SUPERADMIN) {
      return res.status(403).json({ message: "Forbidden: Only Super Admin can cleanup audit logs" });
    }

    const result = await appPool.query(
      `DELETE FROM "AuditLogs" 
       WHERE "CreatedAt" < NOW() - INTERVAL '1 day' * $1
       RETURNING COUNT(*) as deleted`,
      [days]
    );

    const deleted = result.rows[0]?.deleted || 0;

    res.status(200).json({
      message: `Cleanup completed`,
      deletedCount: deleted,
      olderThanDays: parseInt(days)
    });

  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
    res.status(500).json({ message: "Server error while cleaning up audit logs" });
  }
};

/**
 * Get audit log statistics
 */
const getAuditLogStats = async (req, res) => {
  try {
    // Get total logs
    const totalResult = await appPool.query(`SELECT COUNT(*) as total FROM "AuditLogs"`);
    const total = parseInt(totalResult.rows[0].total);

    // Get logs by action type
    const actionStats = await appPool.query(
      `SELECT "Action", COUNT(*) as count 
       FROM "AuditLogs" 
       GROUP BY "Action" 
       ORDER BY count DESC`
    );

    // Get logs by entity type
    const entityStats = await appPool.query(
      `SELECT "EntityType", COUNT(*) as count 
       FROM "AuditLogs" 
       GROUP BY "EntityType" 
       ORDER BY count DESC`
    );

    // Get recent activity (last 7 days)
    const recentActivity = await appPool.query(
      `SELECT DATE("CreatedAt") as date, COUNT(*) as count
       FROM "AuditLogs"
       WHERE "CreatedAt" >= NOW() - INTERVAL '7 days'
       GROUP BY DATE("CreatedAt")
       ORDER BY date DESC`
    );

    // Get most active users
    const activeUsers = await appPool.query(
      `SELECT 
        al."UserId",
        u."Name" as "UserName",
        r."RoleName",
        COUNT(*) as actionCount
      FROM "AuditLogs" al
      LEFT JOIN "Users" u ON al."UserId" = u."UserId"
      LEFT JOIN "Roles" r ON al."RoleId" = r."Id"
      GROUP BY al."UserId", u."Name", r."RoleName"
      ORDER BY actionCount DESC
      LIMIT 10`
    );

    res.status(200).json({
      total,
      actionStats: actionStats.rows,
      entityStats: entityStats.rows,
      recentActivity: recentActivity.rows,
      mostActiveUsers: activeUsers.rows
    });

  } catch (error) {
    console.error("Error fetching audit log stats:", error);
    res.status(500).json({ message: "Server error while fetching audit log statistics" });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  cleanupAuditLogs,
  getAuditLogStats
};