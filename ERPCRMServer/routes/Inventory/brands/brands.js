const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { checkPermission } = require("../../../middlewares/rbac");
const { createBrand, getAllBrands, getBrandById, updateBrand, softDeleteBrand } = require("../../../controllers/InventoryApis/brands");

// Mounted at /api/brands — use root paths
router.post("/", authenticate, checkPermission('brands', 'create'), createBrand);
router.get("/", authenticate, checkPermission('brands', 'view'), getAllBrands);
router.get("/:id", authenticate, checkPermission('brands', 'view'), getBrandById);
router.put("/:id", authenticate, checkPermission('brands', 'edit'), updateBrand);
router.delete("/:id", authenticate, checkPermission('brands', 'delete'), softDeleteBrand);

module.exports = router;