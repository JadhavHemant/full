const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  createFinancialYear,
  getFinancialYears,
  getFinancialYearById,
  updateFinancialYear,
  deleteFinancialYear,
  activateFinancialYear,
  closeFinancialYear,
  createAccountingPeriod,
  getAccountingPeriods,
  closeAccountingPeriod,
} = require("../../../controllers/InventoryApis/financialYearController");

router.use(verifyAccessToken);

// Financial Year Routes
router.post("/", createFinancialYear);
router.get("/", getFinancialYears);
router.get("/:id", getFinancialYearById);
router.put("/:id", updateFinancialYear);
router.delete("/:id", deleteFinancialYear);
router.post("/:id/activate", activateFinancialYear);
router.post("/:id/close", closeFinancialYear);

// Accounting Period Routes
router.post("/:fyId/periods", createAccountingPeriod);
router.get("/:fyId/periods", getAccountingPeriods);
router.post("/periods/:id/close", closeAccountingPeriod);

module.exports = router;