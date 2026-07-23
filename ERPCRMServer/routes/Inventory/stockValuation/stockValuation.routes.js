const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  getAllStockValuations,
  getStockValuationById,
  calculateStockValuation,
  getValuationReport,
  upsertCostingMethod,
  getCostingMethods,
} = require("../../../controllers/InventoryApis/stockValuationController");

router.use(verifyAccessToken);

// Stock Valuation CRUD
router.get("/", getAllStockValuations);
router.get("/:id", getStockValuationById);
router.post("/calculate", calculateStockValuation);
router.get("/report", getValuationReport);

// Costing Methods
router.post("/costing-methods", upsertCostingMethod);
router.get("/costing-methods", getCostingMethods);

module.exports = router;