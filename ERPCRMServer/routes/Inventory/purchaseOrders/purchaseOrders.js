// routes/InventoryApis/purchaseOrders/index.js
const express = require("express");
const router = express.Router();
const {
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    softDeletePurchaseOrder,
    hardDeletePurchaseOrder,
    getPurchaseOrderById,
    getAllPurchaseOrders,
    getPurchaseOrdersBySupplier,
    getPurchaseOrderStats
} = require("../../../controllers/InventoryApis/purchaseOrders");
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");

// Get Purchase Order Statistics
router.get("/stats", verifyAccessToken, getPurchaseOrderStats);

// Get Purchase Orders by Supplier
router.get("/supplier/:supplierId", verifyAccessToken, getPurchaseOrdersBySupplier);

// Get All Purchase Orders (with pagination & filters)
router.get("/", verifyAccessToken, getAllPurchaseOrders);

// Get Purchase Order by Id
router.get("/:id", verifyAccessToken, getPurchaseOrderById);

// Create Purchase Order
router.post("/", verifyAccessToken, createPurchaseOrder);

// Update Purchase Order by Id
router.put("/:id", verifyAccessToken, updatePurchaseOrder);

// Update Purchase Order Status
router.patch("/:id/status", verifyAccessToken, updatePurchaseOrderStatus);

// Soft Delete Purchase Order by Id (Cancel)
router.patch("/soft-delete/:id", verifyAccessToken, softDeletePurchaseOrder);

// Hard Delete Purchase Order by Id
router.delete("/hard-delete/:id", verifyAccessToken, hardDeletePurchaseOrder);

module.exports = router;
