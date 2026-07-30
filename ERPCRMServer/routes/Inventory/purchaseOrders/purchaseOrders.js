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
const { checkPermission } = require("../../../middlewares/rbac");

// Get Purchase Order Statistics
router.get("/stats", verifyAccessToken, checkPermission('purchaseOrders', 'view'), getPurchaseOrderStats);

// Get Purchase Orders by Supplier
router.get("/supplier/:supplierId", verifyAccessToken, checkPermission('purchaseOrders', 'view'), getPurchaseOrdersBySupplier);

// Get All Purchase Orders (with pagination & filters)
router.get("/", verifyAccessToken, checkPermission('purchaseOrders', 'view'), getAllPurchaseOrders);

// Get Purchase Order by Id
router.get("/:id", verifyAccessToken, checkPermission('purchaseOrders', 'view'), getPurchaseOrderById);

// Create Purchase Order
router.post("/", verifyAccessToken, checkPermission('purchaseOrders', 'create'), createPurchaseOrder);

// Update Purchase Order by Id
router.put("/:id", verifyAccessToken, checkPermission('purchaseOrders', 'edit'), updatePurchaseOrder);

// Update Purchase Order Status
router.patch("/:id/status", verifyAccessToken, checkPermission('purchaseOrders', 'approve'), updatePurchaseOrderStatus);

// Soft Delete Purchase Order by Id (Cancel)
router.patch("/soft-delete/:id", verifyAccessToken, checkPermission('purchaseOrders', 'delete'), softDeletePurchaseOrder);

// Hard Delete Purchase Order by Id
router.delete("/hard-delete/:id", verifyAccessToken, checkPermission('purchaseOrders', 'delete'), hardDeletePurchaseOrder);

module.exports = router;
