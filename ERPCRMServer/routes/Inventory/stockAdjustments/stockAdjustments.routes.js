const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { createStockAdjustment, getAllStockAdjustments, getStockAdjustmentById, updateAdjustmentStatus } = require("../../../controllers/InventoryApis/stockAdjustments");

router.post("/stock-adjustments", authenticate, createStockAdjustment);
router.get("/stock-adjustments", authenticate, getAllStockAdjustments);
router.get("/stock-adjustments/:id", authenticate, getStockAdjustmentById);
router.put("/stock-adjustments/:id/status", authenticate, updateAdjustmentStatus);

module.exports = router;