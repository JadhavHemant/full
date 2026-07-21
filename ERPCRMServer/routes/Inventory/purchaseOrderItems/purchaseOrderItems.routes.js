// // routes/Inventory/purchaseOrderItems/purchaseOrderItems.routes.js
// const express = require("express");
// const router = express.Router();

// const {
//     createPurchaseOrderItem,
//     updatePurchaseOrderItem,
//     bulkUpdateReceivedQuantities,
//     deletePurchaseOrderItem,
//     getPurchaseOrderItemById,
//     getItemsByPurchaseOrderId,
//     getAllPurchaseOrderItems,
//     getPurchaseOrderSummary
// } = require("../../../controllers/InventoryApis/purchaseOrderItems");

// console.log("✅ PO Items Route handlers loaded:", {
//     createPurchaseOrderItem: typeof createPurchaseOrderItem,
//     updatePurchaseOrderItem: typeof updatePurchaseOrderItem,
//     bulkUpdateReceivedQuantities: typeof bulkUpdateReceivedQuantities,
//     deletePurchaseOrderItem: typeof deletePurchaseOrderItem,
//     getPurchaseOrderItemById: typeof getPurchaseOrderItemById,
//     getItemsByPurchaseOrderId: typeof getItemsByPurchaseOrderId,
//     getAllPurchaseOrderItems: typeof getAllPurchaseOrderItems,
//     getPurchaseOrderSummary: typeof getPurchaseOrderSummary
// });

// // Routes (specific before generic)
// router.get("/summary/:purchaseOrderId", getPurchaseOrderSummary);
// router.get("/purchase-order/:purchaseOrderId", getItemsByPurchaseOrderId);
// router.patch("/bulk-receive", bulkUpdateReceivedQuantities);
// router.get("/:id", getPurchaseOrderItemById);
// router.get("/", getAllPurchaseOrderItems);
// router.post("/", createPurchaseOrderItem);
// router.put("/:id", updatePurchaseOrderItem);
// router.delete("/:id", deletePurchaseOrderItem);

// module.exports = router;


// routes/Inventory/purchaseOrderItems/purchaseOrderItems.routes.js
const express = require("express");
const router = express.Router();

const {
    createPurchaseOrderItem,
    updatePurchaseOrderItem,
    bulkUpdateReceivedQuantities,
    deletePurchaseOrderItem,
    getItemsByPurchaseOrderId,
    getAllPurchaseOrderItems,
    getPurchaseOrderSummary
} = require("../../../controllers/InventoryApis/purchaseOrderItems");

// Routes (specific before generic)
router.get("/summary/:purchaseOrderId", getPurchaseOrderSummary);
router.get("/purchase-order/:purchaseOrderId", getItemsByPurchaseOrderId);
router.patch("/bulk-receive", bulkUpdateReceivedQuantities);
router.get("/", getAllPurchaseOrderItems);
router.post("/", createPurchaseOrderItem);
router.put("/:id", updatePurchaseOrderItem);
router.delete("/:id", deletePurchaseOrderItem);

module.exports = router;
