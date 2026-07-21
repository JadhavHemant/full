const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { 
  checkAssignPermission 
} = require("../../middlewares/rbac");
const { 
  getRoles, 
  getRolePermissions, 
  saveRolePermissions,
  createRole,
  updateRole,
  deleteRole
} = require("../../controllers/UserApis/roleController");

const router = express.Router();

router.get("/", verifyAccessToken, getRoles);
router.get("/:roleId/permissions", verifyAccessToken, getRolePermissions);
router.post("/:roleId/permissions", verifyAccessToken, saveRolePermissions);
router.post("/create", verifyAccessToken, createRole);
router.put("/:id", verifyAccessToken, checkAssignPermission, updateRole);
router.delete("/:id", verifyAccessToken, deleteRole);

module.exports = router;
