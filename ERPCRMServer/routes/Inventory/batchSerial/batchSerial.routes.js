const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { createBatch, getAllBatches, getExpiringBatches, createSerialNumber, bulkCreateSerialNumbers, getAllSerialNumbers, updateSerialStatus } = require("../../../controllers/InventoryApis/batchSerialController");

router.post("/batches", authenticate, createBatch);
router.get("/batches", authenticate, getAllBatches);
router.get("/batches/expiring", authenticate, getExpiringBatches);
router.post("/serial-numbers", authenticate, createSerialNumber);
router.post("/serial-numbers/bulk", authenticate, bulkCreateSerialNumbers);
router.get("/serial-numbers", authenticate, getAllSerialNumbers);
router.put("/serial-numbers/:id/status", authenticate, updateSerialStatus);

module.exports = router;