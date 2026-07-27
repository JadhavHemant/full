const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const {
  getAllRecordPermissions,
  getRecordPermissionsByRoleAndEntity,
  createRecordPermission,
  updateRecordPermission,
  deleteRecordPermission,
  checkRecordAccess,
} = require("../../controllers/RBAC/recordPermissionController");

router.use(verifyAccessToken);

// Get all record permissions
router.get("/", checkPermission('recordPermissions', 'view'), getAllRecordPermissions);

// Get record permissions by role and entity
router.get("/:roleId/:entityName", getRecordPermissionsByRoleAndEntity);

// Check record access
router.post("/check", checkRecordAccess);

// Create record permission
router.post("/", checkPermission('recordPermissions', 'create'), createRecordPermission);

// Update record permission
router.put("/:id", checkPermission('recordPermissions', 'edit'), updateRecordPermission);

// Delete record permission
router.delete("/:id", checkPermission('recordPermissions', 'delete'), deleteRecordPermission);

module.exports = router;
