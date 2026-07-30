const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const {
    createTaskType,
    updateTaskType,
    softDeleteTaskType,
    hardDeleteTaskType,
    getTaskTypeById,
    getAllTaskTypes
} = require("../../controllers/CrmApi/taskTypesController");

router.use(verifyAccessToken);

router.post("/", checkPermission("settings", "create"), createTaskType);
router.put("/:id", checkPermission("settings", "edit"), updateTaskType);
router.patch("/soft-delete/:id", checkPermission("settings", "delete"), softDeleteTaskType);
router.delete("/:id", checkPermission("settings", "delete"), hardDeleteTaskType);
router.get("/:id", checkPermission("settings", "view"), getTaskTypeById);
router.get("/", checkPermission("settings", "view"), getAllTaskTypes);
module.exports = router;
