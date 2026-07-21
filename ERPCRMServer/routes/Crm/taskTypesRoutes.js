const express = require("express");
const router = express.Router();
const {
    createTaskType,
    updateTaskType,
    softDeleteTaskType,
    hardDeleteTaskType,
    getTaskTypeById,
    getAllTaskTypes
} = require("../../controllers/CrmApi/taskTypesController");
router.post("/", createTaskType);
router.put("/:id", updateTaskType);
router.patch("/soft-delete/:id", softDeleteTaskType);
router.delete("/:id", hardDeleteTaskType);
router.get("/:id", getTaskTypeById);
router.get("/", getAllTaskTypes);
module.exports = router;
