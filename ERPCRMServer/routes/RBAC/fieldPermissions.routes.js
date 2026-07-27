const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const {
  getAllFieldPermissions,
  getFieldPermissionsByRoleAndEntity,
  createFieldPermission,
  bulkCreateFieldPermissions,
  updateFieldPermission,
  deleteFieldPermission,
  getFieldPermissionMatrix,
} = require("../../controllers/RBAC/fieldPermissionController");

router.use(verifyAccessToken);

// Get all field permissions
router.get("/", checkPermission('fieldPermissions', 'view'), getAllFieldPermissions);

// Get field permissions by role and entity
router.get("/:roleId/:entityName", getFieldPermissionsByRoleAndEntity);

// Get field permission matrix for a role
router.get("/matrix/:roleId", getFieldPermissionMatrix);

// Create field permission
router.post("/", checkPermission('fieldPermissions', 'create'), createFieldPermission);

// Bulk create field permissions
router.post("/bulk", checkPermission('fieldPermissions', 'create'), bulkCreateFieldPermissions);

// Update field permission
router.put("/:id", checkPermission('fieldPermissions', 'edit'), updateFieldPermission);

// Delete field permission
router.delete("/:id", checkPermission('fieldPermissions', 'delete'), deleteFieldPermission);

module.exports = router;
