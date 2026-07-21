// routes/InventoryApis/productStockRoutes.js
const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
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
router.get("/", getAllProductStocks);
router.get("/low-stock", getLowStockItems);
router.get("/product/:productId", getStockByProduct);
router.get("/warehouse/:warehouseId", getStockByWarehouse);
router.get("/:id", getProductStockById);

// Create & Update routes
router.post("/", createProductStock);
router.put("/:id", updateProductStock);
router.post("/:id/adjust", adjustStockQuantity);
router.post("/transfer", transferStock);

// Delete routes
router.patch("/:id/soft", softDeleteProductStock);
router.delete("/:id/hard", hardDeleteProductStock);

module.exports = router;
