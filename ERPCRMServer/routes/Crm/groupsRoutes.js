const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { listGroups, createGroup, updateGroup, deleteGroup } = require("../../controllers/CrmApi/groupsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", checkPermission("groups", "view"), listGroups);
router.post("/", checkPermission("groups", "create"), createGroup);
router.put("/:id", checkPermission("groups", "edit"), updateGroup);
router.delete("/:id", checkPermission("groups", "delete"), deleteGroup);

module.exports = router;