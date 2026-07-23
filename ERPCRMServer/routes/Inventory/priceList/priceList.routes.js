const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { createPriceList, getPriceLists, getPriceListById, getEffectivePrice, updatePriceList, deletePriceList } = require("../../../controllers/InventoryApis/priceListController");

router.use(verifyAccessToken);

router.post("/", createPriceList);
router.get("/", getPriceLists);
router.get("/effective/:productId", getEffectivePrice);
router.get("/:id", getPriceListById);
router.put("/:id", updatePriceList);
router.delete("/:id", deletePriceList);

module.exports = router;