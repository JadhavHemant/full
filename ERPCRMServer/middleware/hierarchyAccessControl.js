/**
 * Hierarchy-Based Access Control Middleware
 * 
 * Rules:
 * - Super Admin can see ALL users
 * - Admin can see users they created (CreatedBy = their UserId)
 * - Managers can see their team members (ReportingManagerId = their UserId)
 * - Users can see only their own data
 */

const { appPool } = require('../config/db');

/**
 * Get user hierarchy information
 */
const getUserHierarchy = async (userId) => {
  try {
    const result = await appPool.query(`
      SELECT 
        u."UserId",
        u."RoleId",
        u."HierarchyLevel",
        u."HierarchyPath",
        u."CreatedBy",
        r."Name" as "RoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON u."RoleId" = r."Id"
      WHERE u."UserId" = $1 AND u."IsDeleted" = false
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Determine if user is super admin
    const isSuperAdmin = user.RoleName === 'Super Admin' || user.HierarchyLevel === 0;

    // Get all users created by this user (for admins/managers)
    const createdUsersResult = await appPool.query(`
      SELECT "UserId" 
      FROM "Users" 
      WHERE "CreatedBy" = $1 
      AND "IsDeleted" = false
    `, [userId]);
    const createdUsers = createdUsersResult.rows.map(row => row.UserId);

    // Get team members (users who report to this user)
    const teamResult = await appPool.query(`
      SELECT "UserId" 
      FROM "Users" 
      WHERE "ReportingManagerId" = $1 
      AND "IsDeleted" = false
    `, [userId]);
    const teamMembers = teamResult.rows.map(row => row.UserId);

    return {
      userId: user.UserId,
      roleId: user.RoleId,
      roleName: user.RoleName,
      hierarchyLevel: user.HierarchyLevel,
      hierarchyPath: user.HierarchyPath,
      createdBy: user.CreatedBy,
      isSuperAdmin,
      createdUsers,
      teamMembers
    };
  } catch (error) {
    console.error('Error getting user hierarchy:', error);
    return null;
  }
};

/**
 * Middleware to enforce hierarchy-based access
 * Adds userHierarchy to req object
 */
const hierarchyAccess = async (req, res, next) => {
  try {
    const userId = req.user?.UserId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hierarchy = await getUserHierarchy(userId);

    if (!hierarchy) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Attach hierarchy info to request
    req.userHierarchy = hierarchy;

    next();
  } catch (error) {
    console.error('Hierarchy access middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Apply hierarchy filter to SQL queries
 * Returns WHERE clause conditions for filtering data based on user hierarchy
 */
const getHierarchyFilter = (userHierarchy, tableAlias = 'u') => {
  // Super admin can see everything - no filter needed
  if (userHierarchy.isSuperAdmin) {
    return '';
  }

  // Admin can see:
  // 1. Users they created
  // 2. Users in their team (reporting to them)
  // 3. Themselves
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Users they created
  if (userHierarchy.createdUsers.length > 0) {
    conditions.push(`${tableAlias}."CreatedBy" = $${paramIndex++}`);
    params.push(userHierarchy.userId);
  }

  // Users in their team
  if (userHierarchy.teamMembers.length > 0) {
    conditions.push(`${tableAlias}."ReportingManagerId" = $${paramIndex++}`);
    params.push(userHierarchy.userId);
  }

  // Themselves
  conditions.push(`${tableAlias}."UserId" = $${paramIndex++}`);
  params.push(userHierarchy.userId);

  return {
    sql: conditions.length > 0 ? `(${conditions.join(' OR ')})` : '',
    params
  };
};

/**
 * Apply hierarchy filter for reports that aggregate data
 * Admin sees data from:
 * - Their team members
 * - Themselves
 * - Data they created
 */
const getReportHierarchyFilter = (userHierarchy, userIdColumn = 'CreatedBy') => {
  // Super admin can see everything
  if (userHierarchy.isSuperAdmin) {
    return '';
  }

  // Admin can see data from users they created + their team
  const accessibleUserIds = [
    userHierarchy.userId,
    ...userHierarchy.createdUsers,
    ...userHierarchy.teamMembers
  ].filter(id => id); // Remove undefined/null

  if (accessibleUserIds.length > 0) {
    return `${userIdColumn} = ANY(${JSON.stringify(accessibleUserIds)})`;
  }

  // Fallback to only their own data
  return `${userIdColumn} = ${userHierarchy.userId}`;
};

/**
 * Middleware to check if user can access a specific resource
 * Usage: canAccessResource('UserId', (resource, userHierarchy) => resource.CreatedBy === userHierarchy.userId)
 */
const canAccessResource = (resourceIdField, accessRule) => {
  return async (req, res, next) => {
    try {
      const userHierarchy = req.userHierarchy;

      // Super admin always has access
      if (userHierarchy.isSuperAdmin) {
        return next();
      }

      const resourceId = req.params[resourceIdField.replace('"', '').toLowerCase()] || req.body[resourceIdField];
      
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID required' });
      }

      const resourceResult = await appPool.query(`
        SELECT * FROM "Users" WHERE "UserId" = $1 AND "IsDeleted" = false
      `, [resourceId]);

      if (resourceResult.rows.length === 0) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const resource = resourceResult.rows[0];

      // Check if access rule is satisfied
      const hasAccess = accessRule(resource, userHierarchy);

      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'Access denied. You can only access users in your hierarchy.' 
        });
      }

      next();
    } catch (error) {
      console.error('Access check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Specific access rules

/**
 * User can access another user if:
 * - Super admin: Yes
 * - Same user: Yes
 * - Created the user: Yes
 * - User reports to them: Yes
 */
const userAccessRule = (resource, userHierarchy) => {
  if (resource.UserId === userHierarchy.userId) return true;
  if (resource.CreatedBy === userHierarchy.userId) return true;
  if (resource.ReportingManagerId === userHierarchy.userId) return true;
  
  // Check if resource is in user's team (from HierarchyPath)
  if (resource.HierarchyPath && resource.HierarchyPath.includes(`${userHierarchy.userId}`)) {
    return true;
  }

  return false;
};

module.exports = {
  getUserHierarchy,
  hierarchyAccess,
  getHierarchyFilter,
  getReportHierarchyFilter,
  canAccessResource,
  userAccessRule
};