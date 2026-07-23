const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  getAllReorderLevels,
  getReorderLevelById,
  upsertReorderLevel,
  deleteReorderLevel,
  getReorderAlerts,
  autoReplenish,
  getReorderHistory,
} = require("../../../controllers/InventoryApis/reorderLevelController");

router.use(verifyAccessToken);

// Reorder Levels CRUD
router.get("/", getAllReorderLevels);
router.get("/:id", getReorderLevelById);
router.post("/", upsertReorderLevel);
router.delete("/:id", deleteReorderLevel);

// Alerts & Auto-replenishment
router.get("/alerts", getReorderAlerts);
router.post("/auto-replenish", autoReplenish);

// History
router.get("/history", getReorderHistory);

module.exports = router;