// routes/Inventory/salesOrders/salesOrders.routes.js

const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");

const {
    createSalesOrder,
    updateSalesOrder,
    updateSalesOrderStatus,
    updatePayment,
    softDeleteSalesOrder,
    restoreSalesOrder,
    hardDeleteSalesOrder,
    getSalesOrderById,
    getAllSalesOrders,
    getSalesOrderStats,
    getSalesOrdersByCustomer
} = require("../../../controllers/InventoryApis/salesOrders");

router.use(verifyAccessToken);

// Statistics
router.get("/stats", getSalesOrderStats);

// Get by Customer
router.get("/customer/:customerId", getSalesOrdersByCustomer);

// Get All (with filters)
router.get("/", getAllSalesOrders);

// Get by ID
router.get("/:id", getSalesOrderById);

// Create
router.post("/", createSalesOrder);

// Update
router.put("/:id", updateSalesOrder);

// Update Status
router.patch("/:id/status", updateSalesOrderStatus);

// Update Payment
router.patch("/:id/payment", updatePayment);

// Restore
router.patch("/:id/restore", restoreSalesOrder);

// Soft Delete
router.patch("/:id/soft-delete", softDeleteSalesOrder);

// Hard Delete
router.delete("/:id", hardDeleteSalesOrder);

module.exports = router;
