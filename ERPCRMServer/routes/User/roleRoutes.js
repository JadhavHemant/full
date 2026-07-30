const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { 
  checkAssignPermission,
  checkPermission 
} = require("../../middlewares/rbac");
const { 
  getRoles, 
  getRoleConfig,
  getRolePermissions, 
  saveRolePermissions,
  createRole,
  updateRole,
  deleteRole
} = require("../../controllers/UserApis/roleController");

const router = express.Router();

router.get("/config", verifyAccessToken, checkPermission("roles", "view"), getRoleConfig);
router.get("/", verifyAccessToken, checkPermission("roles", "view"), getRoles);
router.get("/:roleId/permissions", verifyAccessToken, checkPermission("roles", "view"), getRolePermissions);
router.post("/:roleId/permissions", verifyAccessToken, checkAssignPermission, saveRolePermissions);
router.post("/create", verifyAccessToken, checkAssignPermission, createRole);
router.put("/:id", verifyAccessToken, checkAssignPermission, updateRole);
router.delete("/:id", verifyAccessToken, checkAssignPermission, deleteRole);

module.exports = router;
