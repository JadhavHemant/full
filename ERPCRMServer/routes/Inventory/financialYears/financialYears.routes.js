const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  getAllFinancialYears,
  getFinancialYearById,
  createFinancialYear,
  updateFinancialYear,
  closeFinancialYear,
  reopenFinancialYear,
  getAccountingPeriods,
  closeAccountingPeriod,
  reopenAccountingPeriod,
} = require("../../../controllers/InventoryApis/financialYearController");

router.use(verifyAccessToken);

router.get("/", getAllFinancialYears);
router.get("/:id", getFinancialYearById);
router.post("/", createFinancialYear);
router.put("/:id", updateFinancialYear);
router.post("/:id/close", closeFinancialYear);
router.post("/:id/reopen", reopenFinancialYear);
router.get("/:id/periods", getAccountingPeriods);
router.post("/periods/:id/close", closeAccountingPeriod);
router.post("/periods/:id/reopen", reopenAccountingPeriod);

module.exports = router;
