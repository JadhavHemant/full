// routes/InventoryApis/productStockRoutes.js
const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { checkPermission } = require("../../../middlewares/rbac");
const {
    createProductStock,
    updateProductStock,
    adjustStockQuantity,
    transferStock,
    getProductStockById,
    getAllProductStocks,
    getStockByProduct,
    getStockByWarehouse,
    getLowStockItems,
    softDeleteProductStock,
    hardDeleteProductStock
} = require("../../../controllers/InventoryApis/productStockcontroller");

router.use(verifyAccessToken);

// Get routes
router.get("/", checkPermission('productStock', 'view'), getAllProductStocks);
router.get("/low-stock", checkPermission('productStock', 'view'), getLowStockItems);
router.get("/product/:productId", checkPermission('productStock', 'view'), getStockByProduct);
router.get("/warehouse/:warehouseId", checkPermission('productStock', 'view'), getStockByWarehouse);
router.get("/:id", checkPermission('productStock', 'view'), getProductStockById);

// Create & Update routes
router.post("/", checkPermission('productStock', 'create'), createProductStock);
router.put("/:id", checkPermission('productStock', 'edit'), updateProductStock);
router.post("/:id/adjust", checkPermission('productStock', 'edit'), adjustStockQuantity);
router.post("/transfer", checkPermission('productStock', 'edit'), transferStock);

// Delete routes
router.patch("/:id/soft", checkPermission('productStock', 'delete'), softDeleteProductStock);
router.delete("/:id/hard", checkPermission('productStock', 'delete'), hardDeleteProductStock);

module.exports = router;
