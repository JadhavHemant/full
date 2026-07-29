const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  getAllStockValuations,
  getStockValuationById,
  calculateStockValuation,
  getValuationReport,
  getDetailedValuationReport,
  exportValuationReport,
  upsertCostingMethod,
  getCostingMethods,
} = require("../../../controllers/InventoryApis/stockValuationController");

// Try to load optional landed cost and cost adjustment controllers
let landedCostController = null;
let costAdjustmentController = null;

try {
  landedCostController = require("../../../controllers/InventoryApis/landedCostController");
} catch (e) {
  // Controller not available
}

try {
  costAdjustmentController = require("../../../controllers/InventoryApis/costAdjustmentController");
} catch (e) {
  // Controller not available
}

router.use(verifyAccessToken);

// Stock Valuation CRUD
router.get("/", getAllStockValuations);
router.get("/report", getValuationReport);
router.get("/report/detailed", getDetailedValuationReport);
router.get("/export", exportValuationReport);
router.post("/calculate", calculateStockValuation);
router.get("/:id", getStockValuationById);

// Costing Methods
router.post("/costing-methods", upsertCostingMethod);
router.get("/costing-methods", getCostingMethods);

// Landed Costs (if controller available)
if (landedCostController) {
  const { getAllLandedCosts, getLandedCostById, createLandedCost, updateLandedCost, allocateLandedCosts, deleteLandedCost } = landedCostController;
  router.get("/landed-costs", getAllLandedCosts);
  router.get("/landed-costs/:id", getLandedCostById);
  router.post("/landed-costs", createLandedCost);
  router.put("/landed-costs/:id", updateLandedCost);
  router.post("/landed-costs/allocate", allocateLandedCosts);
  router.delete("/landed-costs/:id", deleteLandedCost);
}

// Cost Adjustments (if controller available)
if (costAdjustmentController) {
  const { getAllCostAdjustments, getCostAdjustmentById, createCostAdjustment, updateCostAdjustment, approveCostAdjustment, deleteCostAdjustment } = costAdjustmentController;
  router.get("/adjustments", getAllCostAdjustments);
  router.get("/adjustments/:id", getCostAdjustmentById);
  router.post("/adjustments", createCostAdjustment);
  router.put("/adjustments/:id", updateCostAdjustment);
  router.post("/adjustments/:id/approve", approveCostAdjustment);
  router.delete("/adjustments/:id", deleteCostAdjustment);
}

module.exports = router;
