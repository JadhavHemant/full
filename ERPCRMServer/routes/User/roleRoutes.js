const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { 
  checkAssignPermission 
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

router.get("/config", verifyAccessToken, getRoleConfig);
router.get("/", verifyAccessToken, getRoles);
router.get("/:roleId/permissions", verifyAccessToken, getRolePermissions);
router.post("/:roleId/permissions", verifyAccessToken, checkAssignPermission, saveRolePermissions);
router.post("/create", verifyAccessToken, checkAssignPermission, createRole);
router.put("/:id", verifyAccessToken, checkAssignPermission, updateRole);
router.delete("/:id", verifyAccessToken, checkAssignPermission, deleteRole);

module.exports = router;
