const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
    createStockMovement,
    updateStockMovement,
    hardDeleteStockMovement,
    getStockMovementById,
    getAllStockMovements,
    getStockMovementStats,
    getRecentStockMovements
} = require("../../../controllers/InventoryApis/stockMovements");

router.use(verifyAccessToken);
// /api/stock-movements/stats
router.get("/stats", getStockMovementStats);

// /api/stock-movements/recent
router.get("/recent", getRecentStockMovements);

// /api/stock-movements?limit=&offset=&...
router.get("/", getAllStockMovements);

// /api/stock-movements/:id
router.get("/:id", getStockMovementById);

// POST /api/stock-movements
router.post("/", createStockMovement);

// PUT /api/stock-movements/:id
router.put("/:id", updateStockMovement);

// DELETE /api/stock-movements/:id
router.delete("/:id", hardDeleteStockMovement);

module.exports = router;
