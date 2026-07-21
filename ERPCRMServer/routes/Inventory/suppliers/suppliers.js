// routes/InventoryApis/suppliers/index.js
const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");

const {
  createSupplier,
  updateSupplier,
  softDeleteSupplier,
  hardDeleteSupplier,
  getSupplierById,
  getAllSuppliers,
} = require("../../../controllers/InventoryApis/suppliers");

router.use(verifyAccessToken);

// Create Supplier
router.post("/", createSupplier);

// Update Supplier by Id
router.put("/:id", updateSupplier);

// Soft Delete Supplier by Id
router.patch("/soft-delete/:id", softDeleteSupplier);

// Hard Delete Supplier by Id
router.delete("/hard-delete/:id", hardDeleteSupplier);

// Get Supplier by Id
router.get("/:id", getSupplierById);

// Get All Suppliers (with pagination, filters, search, sort)
router.get("/", getAllSuppliers);

module.exports = router;
