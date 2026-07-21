const { appPool } = require('../config/db');

/**
 * Audit Log Service
 * 
 * Comprehensive audit logging for authentication events, data changes,
 * and permission modifications integrated with existing AuditLogs table.
 */

/**
 * Log authentication event
 */
const logAuthEvent = async (eventData) => {
  const {
    userId,
    action,
    entityType = 'Authentication',
    entityId = null,
    oldValue = null,
    newValue = null,
    ipAddress,
    userAgent,
    success = true,
    errorMessage = null
  } = eventData;

  try {
    await appPool.query(
      `INSERT INTO "AuditLogs" (
        "UserId", "Action", "EntityType", "EntityId", 
        "OldValue", "NewValue", "IpAddress", "UserAgent", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
    // Don't throw - audit logging should not break main flow
  }
};

/**
 * Log data modification
 */
const logDataChange = async (changeData) => {
  const {
    userId,
    action, // 'INSERT', 'UPDATE', 'DELETE'
    entityType, // Table name or entity type
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress,
    userAgent
  } = changeData;

  try {
    await appPool.query(
      `INSERT INTO "AuditLogs" (
        "UserId", "Action", "EntityType", "EntityId",
        "OldValue", "NewValue", "IpAddress", "UserAgent", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

/**
 * Log permission change
 */
const logPermissionChange = async (permissionData) => {
  const {
    userId,
    roleId,
    action, // 'GRANT_PERMISSION', 'REVOKE_PERMISSION'
    permissionId,
    permissionKey,
    ipAddress,
    userAgent
  } = permissionData;

  try {
    await appPool.query(
      `INSERT INTO "AuditLogs" (
        "UserId", "RoleId", "Action", "EntityType", "EntityId",
        "NewValue", "IpAddress", "UserAgent", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        roleId,
        action,
        'Permission',
        permissionId,
        JSON.stringify({ permissionKey }),
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

/**
 * Log role assignment
 */
const logRoleAssignment = async (assignmentData) => {
  const {
    assignedBy,
    targetUserId,
    roleId,
    action, // 'ASSIGN_ROLE', 'REVOKE_ROLE'
    ipAddress,
    userAgent
  } = assignmentData;

  try {
    await appPool.query(
      `INSERT INTO "AuditLogs" (
        "UserId", "RoleId", "Action", "EntityType", "EntityId",
        "NewValue", "IpAddress", "UserAgent", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        assignedBy,
        roleId,
        action,
        'UserRole',
        targetUserId,
        JSON.stringify({ targetUserId, roleId }),
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}) => {
  const {
    userId,
    action,
    entityType,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = filters;

  let query = `
    SELECT 
      al."Id",
      al."UserId",
      u."Name" as "UserName",
      u."Email" as "UserEmail",
      al."RoleId",
      r."RoleName",
      al."Action",
      al."EntityType",
      al."EntityId",
      al."OldValue",
      al."NewValue",
      al."IpAddress",
      al."UserAgent",
      al."CreatedAt"
    FROM "AuditLogs" al
    LEFT JOIN "Users" u ON al."UserId" = u."UserId"
    LEFT JOIN "Roles" r ON al."RoleId" = r."Id"
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (userId) {
    query += ` AND al."UserId" = $${paramCount++}`;
    params.push(userId);
  }

  if (action) {
    query += ` AND al."Action" = $${paramCount++}`;
    params.push(action);
  }

  if (entityType) {
    query += ` AND al."EntityType" = $${paramCount++}`;
    params.push(entityType);
  }

  if (startDate) {
    query += ` AND al."CreatedAt" >= $${paramCount++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND al."CreatedAt" <= $${paramCount++}`;
    params.push(endDate);
  }

  query += ` ORDER BY al."CreatedAt" DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await appPool.query(query, params);
  return result.rows;
};

/**
 * Get audit log statistics
 */
const getAuditStats = async (startDate, endDate) => {
  const result = await appPool.query(
    `SELECT 
       al."Action",
       al."EntityType",
       COUNT(*) as "Count"
     FROM "AuditLogs" al
     WHERE al."CreatedAt" BETWEEN $1 AND $2
     GROUP BY al."Action", al."EntityType"
     ORDER BY "Count" DESC`,
    [startDate, endDate]
  );

  return result.rows;
};

/**
 * Cleanup old audit logs (optional retention policy)
 */
const cleanupOldAuditLogs = async (retentionDays = 365) => {
  const result = await appPool.query(
    `DELETE FROM "AuditLogs"
     WHERE "CreatedAt" < NOW() - INTERVAL '${retentionDays} days'
     RETURNING "Id"
    `
  );

  return {
    deletedCount: result.rowCount,
    message: `Cleaned up ${result.rowCount} audit logs older than ${retentionDays} days`
  };
};

module.exports = {
  logAuthEvent,
  logDataChange,
  logPermissionChange,
  logRoleAssignment,
  getAuditLogs,
  getAuditStats,
  cleanupOldAuditLogs,
};
