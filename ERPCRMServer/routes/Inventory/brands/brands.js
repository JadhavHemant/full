const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { createBrand, getAllBrands, getBrandById, updateBrand, softDeleteBrand } = require("../../../controllers/InventoryApis/brands");

// Mounted at /api/brands — use root paths
router.post("/", authenticate, createBrand);
router.get("/", authenticate, getAllBrands);
router.get("/:id", authenticate, getBrandById);
router.put("/:id", authenticate, updateBrand);
router.delete("/:id", authenticate, softDeleteBrand);

module.exports = router;