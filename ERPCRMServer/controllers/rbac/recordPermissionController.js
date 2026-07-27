const { appPool } = require("../../config/db");
const { ROLE_IDS } = require("../../config/roleConfig");

// @desc    Get all record permissions
// @route   GET /api/record-permissions
// @access  Private (Super Admin / Admin)
const getAllRecordPermissions = async (req, res) => {
  try {
    const { roleId, entityName, scopeType, isActive } = req.query;

    let query = `
      SELECT rp.*, r."RoleName"
      FROM "RecordPermissions" rp
      LEFT JOIN "Roles" r ON rp."RoleId" = r."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (roleId) { idx++; query += ` AND rp."RoleId" = $${idx}`; params.push(roleId); }
    if (entityName) { idx++; query += ` AND rp."EntityName" = $${idx}`; params.push(entityName); }
    if (scopeType) { idx++; query += ` AND rp."ScopeType" = $${idx}`; params.push(scopeType); }
    if (isActive !== undefined) { idx++; query += ` AND rp."IsActive" = $${idx}`; params.push(isActive === 'true'); }

    query += ` ORDER BY r."RoleName" ASC, rp."EntityName" ASC, rp."ScopeType" ASC`;

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching record permissions:", error);
    res.status(500).json({ message: "Failed to fetch record permissions", error: error.message });
  }
};

// @desc    Get record permissions for a role and entity
// @route   GET /api/record-permissions/:roleId/:entityName
// @access  Private
const getRecordPermissionsByRoleAndEntity = async (req, res) => {
  try {
    const { roleId, entityName } = req.params;

    const result = await appPool.query(
      `SELECT * FROM "RecordPermissions"
       WHERE "RoleId" = $1 AND "EntityName" = $2 AND "IsActive" = TRUE
       ORDER BY "ScopeType" ASC, "ScopeId" ASC`,
      [roleId, entityName]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching record permissions:", error);
    res.status(500).json({ message: "Failed to fetch record permissions", error: error.message });
  }
};

// @desc    Create record permission
// @route   POST /api/record-permissions
// @access  Private (Super Admin / Admin)
const createRecordPermission = async (req, res) => {
  try {
    const { roleId, entityName, scopeType, scopeId, recordId, permissionLevel, description } = req.body;
    const userId = req.user?.UserId;

    if (!roleId || !entityName || !scopeType || !permissionLevel) {
      return res.status(400).json({
        message: "RoleId, entityName, scopeType, and permissionLevel are required"
      });
    }

    const validScopes = ['company', 'department', 'user', 'record'];
    if (!validScopes.includes(scopeType)) {
      return res.status(400).json({
        message: `Invalid scope type. Must be one of: ${validScopes.join(', ')}`
      });
    }

    const validLevels = ['view', 'edit', 'delete', 'own'];
    if (!validLevels.includes(permissionLevel)) {
      return res.status(400).json({
        message: `Invalid permission level. Must be one of: ${validLevels.join(', ')}`
      });
    }

    const result = await appPool.query(
      `INSERT INTO "RecordPermissions"
       ("RoleId", "EntityName", "ScopeType", "ScopeId", "RecordId", "PermissionLevel",
        "Description", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       ON CONFLICT ("RoleId", "EntityName", "ScopeType", "ScopeId", "RecordId")
       DO UPDATE SET
         "PermissionLevel" = $6,
         "Description" = $7,
         "UpdatedBy" = $8,
         "UpdatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [roleId, entityName, scopeType, scopeId || null, recordId || null,
       permissionLevel, description || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating record permission:", error);
    res.status(500).json({ message: "Failed to create record permission", error: error.message });
  }
};

// @desc    Update record permission
// @route   PUT /api/record-permissions/:id
// @access  Private (Super Admin / Admin)
const updateRecordPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionLevel, isActive, description } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "RecordPermissions"
       SET "PermissionLevel" = COALESCE($1, "PermissionLevel"),
           "IsActive" = COALESCE($2, "IsActive"),
           "Description" = COALESCE($3, "Description"),
           "UpdatedBy" = $4,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $5
       RETURNING *`,
      [permissionLevel, isActive, description, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record permission not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating record permission:", error);
    res.status(500).json({ message: "Failed to update record permission", error: error.message });
  }
};

// @desc    Delete record permission
// @route   DELETE /api/record-permissions/:id
// @access  Private (Super Admin / Admin)
const deleteRecordPermission = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`DELETE FROM "RecordPermissions" WHERE "Id" = $1`, [id]);
    res.json({ message: "Record permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting record permission:", error);
    res.status(500).json({ message: "Failed to delete record permission", error: error.message });
  }
};

// @desc    Check if user has record-level access
// @route   POST /api/record-permissions/check
// @access  Private
const checkRecordAccess = async (req, res) => {
  try {
    const { roleId, entityName, recordId, action } = req.body;

    if (!roleId || !entityName || !action) {
      return res.status(400).json({
        message: "roleId, entityName, and action are required"
      });
    }

    const userId = req.user?.UserId;
    const companyId = req.user?.CompanyId;

    // Super admin always has access
    if (Number(roleId) === ROLE_IDS.SUPERADMIN) {
      return res.json({ hasAccess: true, reason: "Super admin" });
    }

    // Check record-level permissions
    let query = `
      SELECT * FROM "RecordPermissions"
      WHERE "RoleId" = $1 AND "EntityName" = $2 AND "IsActive" = TRUE
    `;
    const params = [roleId, entityName];

    if (recordId) {
      query += ` AND ("RecordId" = $${params.length + 1} OR "RecordId" IS NULL)`;
      params.push(recordId);
    }

    const result = await appPool.query(query, params);

    // Check if any permission grants the requested action
    const hasAccess = result.rows.some(perm => {
      const level = perm.PermissionLevel;
      if (level === 'own' && perm.ScopeType === 'user' && perm.ScopeId === userId) return true;
      if (level === 'own' && perm.ScopeType === 'company' && perm.ScopeId === companyId) return true;
      if (level === action) return true;
      if (level === 'edit' && action === 'view') return true;
      if (level === 'delete' && (action === 'view' || action === 'edit')) return true;
      return false;
    });

    res.json({ hasAccess, permissions: result.rows });
  } catch (error) {
    console.error("Error checking record access:", error);
    res.status(500).json({ message: "Failed to check record access", error: error.message });
  }
};

module.exports = {
  getAllRecordPermissions,
  getRecordPermissionsByRoleAndEntity,
  createRecordPermission,
  updateRecordPermission,
  deleteRecordPermission,
  checkRecordAccess,
};
