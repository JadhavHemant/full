const express = require("express");
const router = express.Router();
const {
    createAuditLog,
    updateAuditLog,
    softDeleteAuditLog,
    hardDeleteAuditLog,
    getAuditLogsByUserId,
    getAllAuditLogs
} = require("../../../controllers/InventoryApis/AuditLog");
router.post("/", createAuditLog);
router.put("/:id", updateAuditLog);
router.patch("/soft-delete/:id", softDeleteAuditLog);
router.delete("/hard-delete/:id", hardDeleteAuditLog);
router.get("/user/:userId", getAuditLogsByUserId);
router.get("/", getAllAuditLogs);
module.exports = router;

 
