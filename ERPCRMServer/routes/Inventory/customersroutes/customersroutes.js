// routes/Inventory/customers/customers.routes.js

const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");

const {
    createCustomer,
    updateCustomer,
    softDeleteCustomer,
    restoreCustomer,
    hardDeleteCustomer,
    getCustomerById,
    getAllCustomers,
    getActiveCustomers,
    getCustomerStats,
    updateOutstandingBalance,
    toggleActiveStatus
} = require("../../../controllers/InventoryApis/customers");

router.use(verifyAccessToken);

// Statistics (place before /:id)
router.get("/stats", getCustomerStats);

// Active Customers (for dropdowns)
router.get("/active", getActiveCustomers);

// Get All Customers (with filters & pagination)
router.get("/", getAllCustomers);

// Get Customer by Id
router.get("/:id", getCustomerById);

// Create Customer
router.post("/", createCustomer);

// Update Customer
router.put("/:id", updateCustomer);

// Toggle Active Status
router.patch("/:id/toggle-active", toggleActiveStatus);

// Update Outstanding Balance
router.patch("/:id/outstanding", updateOutstandingBalance);

// Restore Customer
router.patch("/:id/restore", restoreCustomer);

// Soft Delete Customer
router.patch("/:id/soft-delete", softDeleteCustomer);

// Hard Delete Customer (permanent)
router.delete("/:id", hardDeleteCustomer);

module.exports = router;
