const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { createStockTransfer, getAllStockTransfers, getStockTransferById, updateTransferStatus } = require("../../../controllers/InventoryApis/stockTransfers");

router.post("/stock-transfers", authenticate, createStockTransfer);
router.get("/stock-transfers", authenticate, getAllStockTransfers);
router.get("/stock-transfers/:id", authenticate, getStockTransferById);
router.put("/stock-transfers/:id/status", authenticate, updateTransferStatus);

module.exports = router;