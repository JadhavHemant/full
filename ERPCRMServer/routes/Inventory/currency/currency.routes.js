const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { createCurrency, getCurrencies, updateExchangeRate, convertCurrency } = require("../../../controllers/InventoryApis/currencyController");

router.use(verifyAccessToken);

router.post("/", createCurrency);
router.get("/", getCurrencies);
router.post("/exchange-rates", updateExchangeRate);
router.get("/convert", convertCurrency);

module.exports = router;