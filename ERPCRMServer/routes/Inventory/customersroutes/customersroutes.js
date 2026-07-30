// routes/Inventory/customers/customers.routes.js

const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { checkPermission } = require("../../../middlewares/rbac");

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
router.get("/stats", checkPermission('customers', 'view'), getCustomerStats);

// Active Customers (for dropdowns)
router.get("/active", checkPermission('customers', 'view'), getActiveCustomers);

// Get All Customers (with filters & pagination)
router.get("/", checkPermission('customers', 'view'), getAllCustomers);

// Get Customer by Id
router.get("/:id", checkPermission('customers', 'view'), getCustomerById);

// Create Customer
router.post("/", checkPermission('customers', 'create'), createCustomer);

// Update Customer
router.put("/:id", checkPermission('customers', 'edit'), updateCustomer);

// Toggle Active Status
router.patch("/:id/toggle-active", checkPermission('customers', 'edit'), toggleActiveStatus);

// Update Outstanding Balance
router.patch("/:id/outstanding", checkPermission('customers', 'edit'), updateOutstandingBalance);

// Restore Customer
router.patch("/:id/restore", checkPermission('customers', 'edit'), restoreCustomer);

// Soft Delete Customer
router.patch("/:id/soft-delete", checkPermission('customers', 'delete'), softDeleteCustomer);

// Hard Delete Customer (permanent)
router.delete("/:id", checkPermission('customers', 'delete'), hardDeleteCustomer);

module.exports = router;
