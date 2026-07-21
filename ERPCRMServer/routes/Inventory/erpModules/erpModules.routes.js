const express = require('express');
const router = express.Router();

// Import controllers
const { createDepartment, getDepartments, updateDepartment, deleteDepartment, createDesignation, getDesignations, updateDesignation, deleteDesignation, createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee } = require('../../../controllers/InventoryApis/employees');
const { createRequisition, getRequisitions, getRequisitionById, updateRequisitionStatus, deleteRequisition } = require('../../../controllers/InventoryApis/purchaseRequisitions');
const { createPurchaseReturn, getPurchaseReturns, getPurchaseReturnById, updatePurchaseReturnStatus, deletePurchaseReturn } = require('../../../controllers/InventoryApis/purchaseReturns');
const { createQuotation, getQuotations, getQuotationById, updateQuotationStatus, convertToSalesOrder, deleteQuotation } = require('../../../controllers/InventoryApis/salesQuotations');
const { createChallan, getChallans, getChallanById, updateChallanStatus, deleteChallan } = require('../../../controllers/InventoryApis/deliveryChallans');
const { createSalesReturn, getSalesReturns, getSalesReturnById, updateSalesReturnStatus, deleteSalesReturn } = require('../../../controllers/InventoryApis/salesReturns');
const { createBOM, getBOMs, getBOMById, deleteBOM, createProductionOrder, getProductionOrders, getProductionOrderById, updateProductionOrderStatus, deleteProductionOrder } = require('../../../controllers/InventoryApis/production');
const { createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification, createApprovalRequest, getApprovals, processApproval, createExpense, getExpenses, getExpenseById, updateExpenseStatus, deleteExpense, createRack, getRacks, deleteRack, createBin, getBins, deleteBin } = require('../../../controllers/InventoryApis/notifications');
const { createInspection, getInspections, getInspectionById, updateInspectionStatus, deleteInspection } = require('../../../controllers/InventoryApis/qualityControl');

// ==================== DEPARTMENTS ====================
router.post('/departments', createDepartment);
router.get('/departments', getDepartments);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// ==================== DESIGNATIONS ====================
router.post('/designations', createDesignation);
router.get('/designations', getDesignations);
router.put('/designations/:id', updateDesignation);
router.delete('/designations/:id', deleteDesignation);

// ==================== EMPLOYEES ====================
router.post('/employees', createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// ==================== PURCHASE REQUISITIONS ====================
router.post('/purchase-requisitions', createRequisition);
router.get('/purchase-requisitions', getRequisitions);
router.get('/purchase-requisitions/:id', getRequisitionById);
router.put('/purchase-requisitions/:id/status', updateRequisitionStatus);
router.delete('/purchase-requisitions/:id', deleteRequisition);

// ==================== PURCHASE RETURNS ====================
router.post('/purchase-returns', createPurchaseReturn);
router.get('/purchase-returns', getPurchaseReturns);
router.get('/purchase-returns/:id', getPurchaseReturnById);
router.put('/purchase-returns/:id/status', updatePurchaseReturnStatus);
router.delete('/purchase-returns/:id', deletePurchaseReturn);

// ==================== SALES QUOTATIONS ====================
router.post('/sales-quotations', createQuotation);
router.get('/sales-quotations', getQuotations);
router.get('/sales-quotations/:id', getQuotationById);
router.put('/sales-quotations/:id/status', updateQuotationStatus);
router.post('/sales-quotations/:id/convert', convertToSalesOrder);
router.delete('/sales-quotations/:id', deleteQuotation);

// ==================== DELIVERY CHALLANS ====================
router.post('/delivery-challans', createChallan);
router.get('/delivery-challans', getChallans);
router.get('/delivery-challans/:id', getChallanById);
router.put('/delivery-challans/:id/status', updateChallanStatus);
router.delete('/delivery-challans/:id', deleteChallan);

// ==================== SALES RETURNS ====================
router.post('/sales-returns', createSalesReturn);
router.get('/sales-returns', getSalesReturns);
router.get('/sales-returns/:id', getSalesReturnById);
router.put('/sales-returns/:id/status', updateSalesReturnStatus);
router.delete('/sales-returns/:id', deleteSalesReturn);

// ==================== BOM ====================
router.post('/bom', createBOM);
router.get('/bom', getBOMs);
router.get('/bom/:id', getBOMById);
router.delete('/bom/:id', deleteBOM);

// ==================== PRODUCTION ORDERS ====================
router.post('/production-orders', createProductionOrder);
router.get('/production-orders', getProductionOrders);
router.get('/production-orders/:id', getProductionOrderById);
router.put('/production-orders/:id/status', updateProductionOrderStatus);
router.delete('/production-orders/:id', deleteProductionOrder);

// ==================== NOTIFICATIONS ====================
router.post('/notifications', createNotification);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markAsRead);
router.put('/notifications/user/:userId/read-all', markAllAsRead);
router.delete('/notifications/:id', deleteNotification);

// ==================== APPROVAL WORKFLOWS ====================
router.post('/approvals', createApprovalRequest);
router.get('/approvals', getApprovals);
router.put('/approvals/:id/process', processApproval);

// ==================== EXPENSES ====================
router.post('/expenses', createExpense);
router.get('/expenses', getExpenses);
router.get('/expenses/:id', getExpenseById);
router.put('/expenses/:id/status', updateExpenseStatus);
router.delete('/expenses/:id', deleteExpense);

// ==================== WAREHOUSE RACKS & BINS ====================
router.post('/racks', createRack);
router.get('/racks', getRacks);
router.delete('/racks/:id', deleteRack);
router.post('/bins', createBin);
router.get('/bins', getBins);
router.delete('/bins/:id', deleteBin);

// ==================== QUALITY CONTROL ====================
router.post('/quality-inspections', createInspection);
router.get('/quality-inspections', getInspections);
router.get('/quality-inspections/:id', getInspectionById);
router.put('/quality-inspections/:id/status', updateInspectionStatus);
router.delete('/quality-inspections/:id', deleteInspection);

module.exports = router;
