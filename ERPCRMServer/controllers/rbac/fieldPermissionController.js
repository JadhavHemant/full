const { appPool } = require("../../config/db");

// @desc    Get all field permissions
// @route   GET /api/field-permissions
// @access  Private (Super Admin / Admin)
const getAllFieldPermissions = async (req, res) => {
  try {
    const { roleId, moduleKey, entityName, isActive } = req.query;

    let query = `
      SELECT fp.*, r."RoleName"
      FROM "FieldPermissions" fp
      LEFT JOIN "Roles" r ON fp."RoleId" = r."Id"
      WHERE 1=1
    `;
    const params = [];
    let idx = 0;

    if (roleId) { idx++; query += ` AND fp."RoleId" = $${idx}`; params.push(roleId); }
    if (moduleKey) { idx++; query += ` AND fp."ModuleKey" = $${idx}`; params.push(moduleKey); }
    if (entityName) { idx++; query += ` AND fp."EntityName" = $${idx}`; params.push(entityName); }
    if (isActive !== undefined) { idx++; query += ` AND fp."IsActive" = $${idx}`; params.push(isActive === 'true'); }

    query += ` ORDER BY r."RoleName" ASC, fp."ModuleKey" ASC, fp."EntityName" ASC, fp."FieldName" ASC`;

    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching field permissions:", error);
    res.status(500).json({ message: "Failed to fetch field permissions", error: error.message });
  }
};

// @desc    Get field permissions by role and entity
// @route   GET /api/field-permissions/:roleId/:entityName
// @access  Private
const getFieldPermissionsByRoleAndEntity = async (req, res) => {
  try {
    const { roleId, entityName } = req.params;

    const result = await appPool.query(
      `SELECT * FROM "FieldPermissions"
       WHERE "RoleId" = $1 AND "EntityName" = $2 AND "IsActive" = TRUE
       ORDER BY "FieldName" ASC`,
      [roleId, entityName]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching field permissions:", error);
    res.status(500).json({ message: "Failed to fetch field permissions", error: error.message });
  }
};

// @desc    Create field permission
// @route   POST /api/field-permissions
// @access  Private (Super Admin / Admin)
const createFieldPermission = async (req, res) => {
  try {
    const { roleId, moduleKey, entityName, fieldName, permissionLevel, isRequired, description } = req.body;
    const userId = req.user?.UserId;

    if (!roleId || !moduleKey || !entityName || !fieldName || !permissionLevel) {
      return res.status(400).json({
        message: "RoleId, moduleKey, entityName, fieldName, and permissionLevel are required"
      });
    }

    const validLevels = ['hidden', 'read', 'readwrite', 'required'];
    if (!validLevels.includes(permissionLevel)) {
      return res.status(400).json({
        message: `Invalid permission level. Must be one of: ${validLevels.join(', ')}`
      });
    }

    const result = await appPool.query(
      `INSERT INTO "FieldPermissions"
       ("RoleId", "ModuleKey", "EntityName", "FieldName", "PermissionLevel",
        "IsRequired", "Description", "CreatedBy", "UpdatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       ON CONFLICT ("RoleId", "ModuleKey", "EntityName", "FieldName")
       DO UPDATE SET
         "PermissionLevel" = $5,
         "IsRequired" = $6,
         "Description" = $7,
         "UpdatedBy" = $8,
         "UpdatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [roleId, moduleKey, entityName, fieldName, permissionLevel,
       isRequired || false, description || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating field permission:", error);
    res.status(500).json({ message: "Failed to create field permission", error: error.message });
  }
};

// @desc    Bulk create field permissions
// @route   POST /api/field-permissions/bulk
// @access  Private (Super Admin / Admin)
const bulkCreateFieldPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const userId = req.user?.UserId;

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ message: "permissions array is required" });
    }

    const created = [];
    const errors = [];

    for (const perm of permissions) {
      try {
        const result = await appPool.query(
          `INSERT INTO "FieldPermissions"
           ("RoleId", "ModuleKey", "EntityName", "FieldName", "PermissionLevel",
            "IsRequired", "Description", "CreatedBy", "UpdatedBy")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
           ON CONFLICT ("RoleId", "ModuleKey", "EntityName", "FieldName")
           DO UPDATE SET
             "PermissionLevel" = $5,
             "IsRequired" = $6,
             "Description" = $7,
             "UpdatedBy" = $8,
             "UpdatedAt" = CURRENT_TIMESTAMP
           RETURNING *`,
          [perm.roleId, perm.moduleKey, perm.entityName, perm.fieldName,
           perm.permissionLevel, perm.isRequired || false, perm.description || null, userId]
        );
        created.push(result.rows[0]);
      } catch (err) {
        errors.push({ field: perm.fieldName, error: err.message });
      }
    }

    res.json({ created: created.length, errors: errors.length, data: created, errorDetails: errors });
  } catch (error) {
    console.error("Error bulk creating field permissions:", error);
    res.status(500).json({ message: "Failed to bulk create field permissions", error: error.message });
  }
};

// @desc    Update field permission
// @route   PUT /api/field-permissions/:id
// @access  Private (Super Admin / Admin)
const updateFieldPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionLevel, isRequired, isActive, description } = req.body;
    const userId = req.user?.UserId;

    const result = await appPool.query(
      `UPDATE "FieldPermissions"
       SET "PermissionLevel" = COALESCE($1, "PermissionLevel"),
           "IsRequired" = COALESCE($2, "IsRequired"),
           "IsActive" = COALESCE($3, "IsActive"),
           "Description" = COALESCE($4, "Description"),
           "UpdatedBy" = $5,
           "UpdatedAt" = CURRENT_TIMESTAMP
       WHERE "Id" = $6
       RETURNING *`,
      [permissionLevel, isRequired, isActive, description, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Field permission not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating field permission:", error);
    res.status(500).json({ message: "Failed to update field permission", error: error.message });
  }
};

// @desc    Delete field permission
// @route   DELETE /api/field-permissions/:id
// @access  Private (Super Admin / Admin)
const deleteFieldPermission = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`DELETE FROM "FieldPermissions" WHERE "Id" = $1`, [id]);
    res.json({ message: "Field permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting field permission:", error);
    res.status(500).json({ message: "Failed to delete field permission", error: error.message });
  }
};

// @desc    Get field permission matrix for a role
// @route   GET /api/field-permissions/matrix/:roleId
// @access  Private
const getFieldPermissionMatrix = async (req, res) => {
  try {
    const { roleId } = req.params;

    const result = await appPool.query(
      `SELECT fp.*, r."RoleName"
       FROM "FieldPermissions" fp
       LEFT JOIN "Roles" r ON fp."RoleId" = r."Id"
       WHERE fp."RoleId" = $1
       ORDER BY fp."ModuleKey" ASC, fp."EntityName" ASC, fp."FieldName" ASC`,
      [roleId]
    );

    // Group by module and entity
    const matrix = {};
    for (const row of result.rows) {
      if (!matrix[row.ModuleKey]) matrix[row.ModuleKey] = {};
      if (!matrix[row.ModuleKey][row.EntityName]) matrix[row.ModuleKey][row.EntityName] = [];
      matrix[row.ModuleKey][row.EntityName].push({
        fieldName: row.FieldName,
        permissionLevel: row.PermissionLevel,
        isRequired: row.IsRequired,
        isActive: row.IsActive,
        id: row.Id,
      });
    }

    res.json({ roleId, roleName: result.rows[0]?.RoleName, matrix });
  } catch (error) {
    console.error("Error fetching field permission matrix:", error);
    res.status(500).json({ message: "Failed to fetch field permission matrix", error: error.message });
  }
};

module.exports = {
  getAllFieldPermissions,
  getFieldPermissionsByRoleAndEntity,
  createFieldPermission,
  bulkCreateFieldPermissions,
  updateFieldPermission,
  deleteFieldPermission,
  getFieldPermissionMatrix,
};
