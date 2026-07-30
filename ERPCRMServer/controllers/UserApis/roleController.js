const { appPool } = require("../../config/db");

// Make audit logging optional - if it fails, don't break the main flow
let createAuditLog;
try {
  const auditLogController = require("./auditLogController");
  createAuditLog = auditLogController.createAuditLog;
} catch (err) {
  console.warn('⚠️ Audit log controller not available, audit logging disabled');
  createAuditLog = null;
}

// Invalidate RBAC cache helper
let invalidateRoleCache;
try {
  const rbac = require("../../middlewares/rbac");
  invalidateRoleCache = rbac.invalidateRoleCache;
} catch (err) {
  console.warn('⚠️ RBAC middleware not available, cache invalidation disabled');
  invalidateRoleCache = null;
}

const getRoles = async (_req, res) => {
  try {
    const result = await appPool.query(`
      SELECT "Id", "RoleName", "IsActive"
      FROM "Roles"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
      ORDER BY "Id" ASC;
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getRolePermissions = async (req, res) => {
  const roleId = req.params.roleId;
  try {
    const result = await appPool.query(
      `SELECT "Permissions" FROM "Roles" WHERE "Id" = $1`,
      [roleId]
    );
    
    if (result.rows.length === 0) {
      return res.status(200).json({ roleId, permissions: {} });
    }
    
    res.status(200).json({ 
      roleId, 
      permissions: result.rows[0].Permissions || {} 
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    res.status(200).json({ roleId, permissions: {} });
  }
};

const saveRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  const { permissions } = req.body;
  
  try {
    // Validate input
    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }
    
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ message: "Valid permissions object is required" });
    }

    // Auto-create Permissions column if it doesn't exist
    try {
      await appPool.query(`
        ALTER TABLE "Roles" 
        ADD COLUMN IF NOT EXISTS "Permissions" JSONB DEFAULT '{}'
      `);
      console.log('✅ Permissions column ensured to exist');
    } catch (alterError) {
      console.error('⚠️  Could not create Permissions column:', alterError.message);
      // Continue anyway - column might already exist
    }

    // Get old permissions for audit log
    const oldResult = await appPool.query(
      `SELECT "Permissions", "RoleName" FROM "Roles" WHERE "Id" = $1`,
      [roleId]
    );
    
    const oldPermissions = oldResult.rows[0]?.Permissions || {};
    const roleName = oldResult.rows[0]?.RoleName || 'Unknown Role';

    // Update permissions - ensure it's properly stringified
    const permissionsJson = JSON.stringify(permissions || {});
    
    await appPool.query(
      `UPDATE "Roles" SET "Permissions" = $1, "UpdatedAt" = NOW() WHERE "Id" = $2`,
      [permissionsJson, roleId]
    );
    
    // Invalidate the RBAC cache for this role so the next request picks up the new permissions
    if (invalidateRoleCache) {
      invalidateRoleCache(roleId);
    }

    // Create audit log (optional - don't fail if audit logging fails)
    if (req.user && createAuditLog) {
      try {
        await createAuditLog({
          userId: req.user.userId,
          roleId: req.user.roleId,
          action: 'UPDATE',
          entityType: 'RolePermissions',
          entityId: parseInt(roleId),
          oldValue: oldPermissions,
          newValue: permissions,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      } catch (auditErr) {
        console.error('Audit log error (non-critical):', auditErr.message);
        // Don't throw - audit logging failure shouldn't break permission saving
      }
    }

    res.status(200).json({ 
      message: "Permissions saved successfully", 
      roleId, 
      roleName,
      permissions 
    });
  } catch (error) {
    console.error("Error saving role permissions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Server error while saving permissions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createRole = async (req, res) => {
  const { roleName, isActive = true, permissions = {} } = req.body;
  if (!roleName) {
    return res.status(400).json({ message: "Role name is required" });
  }
  try {
    const result = await appPool.query(
      `INSERT INTO "Roles" ("RoleName", "IsActive", "Permissions") VALUES ($1, $2, $3) RETURNING *`,
      [roleName, isActive, JSON.stringify(permissions)]
    );
    
    // Create audit log (optional)
    if (req.user && createAuditLog) {
      try {
        await createAuditLog({
          userId: req.user.userId,
          roleId: req.user.roleId,
          action: 'CREATE',
          entityType: 'Role',
          entityId: result.rows[0].Id,
          newValue: result.rows[0],
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      } catch (auditErr) {
        console.error('Audit log error (non-critical):', auditErr.message);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateRole = async (req, res) => {
  const { id } = req.params;
  const { roleName, isActive } = req.body;
  try {
    // Get old role data for audit
    const oldResult = await appPool.query(
      `SELECT * FROM "Roles" WHERE "Id" = $1`,
      [id]
    );
    const oldRole = oldResult.rows[0];

    const result = await appPool.query(
      `UPDATE "Roles" SET "RoleName" = COALESCE($1, "RoleName"), "IsActive" = COALESCE($2, "IsActive") WHERE "Id" = $3 RETURNING *`,
      [roleName, isActive, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Create audit log (optional)
    if (req.user && createAuditLog) {
      try {
        await createAuditLog({
          userId: req.user.userId,
          roleId: req.user.roleId,
          action: 'UPDATE',
          entityType: 'Role',
          entityId: parseInt(id),
          oldValue: oldRole,
          newValue: result.rows[0],
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      } catch (auditErr) {
        console.error('Audit log error (non-critical):', auditErr.message);
      }
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    // Get role data before deletion for audit
    const oldResult = await appPool.query(
      `SELECT * FROM "Roles" WHERE "Id" = $1`,
      [id]
    );
    const oldRole = oldResult.rows[0];

    await appPool.query(`UPDATE "Roles" SET "IsDeleted" = TRUE WHERE "Id" = $1`, [id]);

    // Create audit log (optional)
    if (req.user && createAuditLog) {
      try {
        await createAuditLog({
          userId: req.user.userId,
          roleId: req.user.roleId,
          action: 'DELETE',
          entityType: 'Role',
          entityId: parseInt(id),
          oldValue: oldRole,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      } catch (auditErr) {
        console.error('Audit log error (non-critical):', auditErr.message);
      }
    }

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getRoleConfig = async (_req, res) => {
  try {
    const result = await appPool.query(`
      SELECT "Id", "RoleName"
      FROM "Roles"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
        AND "IsActive" = TRUE
    `);

    const config = {
      SUPERADMIN: 1,
      ADMIN: 2,
      MANAGER: 3,
      EMPLOYEE: 4,
      CUSTOMER: 5,
    };

    result.rows.forEach((row) => {
      const normalized = String(row.RoleName || "").trim().toLowerCase().replace(/\s+/g, "");
      if (normalized === "superadmin") config.SUPERADMIN = row.Id;
      if (normalized === "admin") config.ADMIN = row.Id;
      if (normalized === "manager") config.MANAGER = row.Id;
      if (normalized === "employee") config.EMPLOYEE = row.Id;
      if (normalized === "customer") config.CUSTOMER = row.Id;
    });

    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching role config:", error);
    res.status(200).json({
      SUPERADMIN: 1,
      ADMIN: 2,
      MANAGER: 3,
      EMPLOYEE: 4,
      CUSTOMER: 5,
    });
  }
};

module.exports = { getRoles, getRoleConfig, getRolePermissions, saveRolePermissions, createRole, updateRole, deleteRole };