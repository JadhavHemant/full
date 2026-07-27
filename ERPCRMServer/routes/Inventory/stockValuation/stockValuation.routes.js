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
const {
  getAllLandedCosts,
  getLandedCostById,
  createLandedCost,
  updateLandedCost,
  allocateLandedCosts,
  deleteLandedCost,
} = require("../../../controllers/InventoryApis/landedCostController");
const {
  getAllCostAdjustments,
  getCostAdjustmentById,
  createCostAdjustment,
  updateCostAdjustment,
  approveCostAdjustment,
  deleteCostAdjustment,
} = require("../../../controllers/InventoryApis/costAdjustmentController");

router.use(verifyAccessToken);

// Stock Valuation CRUD
router.get("/", getAllStockValuations);
router.get("/:id", getStockValuationById);
router.post("/calculate", calculateStockValuation);

// Valuation Reports
router.get("/report", getValuationReport);
router.get("/report/detailed", getDetailedValuationReport);
router.get("/export", exportValuationReport);

// Costing Methods
router.post("/costing-methods", upsertCostingMethod);
router.get("/costing-methods", getCostingMethods);

// Landed Costs
router.get("/landed-costs", getAllLandedCosts);
router.get("/landed-costs/:id", getLandedCostById);
router.post("/landed-costs", createLandedCost);
router.put("/landed-costs/:id", updateLandedCost);
router.post("/landed-costs/allocate", allocateLandedCosts);
router.delete("/landed-costs/:id", deleteLandedCost);

// Cost Adjustments
router.get("/adjustments", getAllCostAdjustments);
router.get("/adjustments/:id", getCostAdjustmentById);
router.post("/adjustments", createCostAdjustment);
router.put("/adjustments/:id", updateCostAdjustment);
router.post("/adjustments/:id/approve", approveCostAdjustment);
router.delete("/adjustments/:id", deleteCostAdjustment);

module.exports = router;
