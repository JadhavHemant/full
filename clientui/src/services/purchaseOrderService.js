// src/services/purchaseOrderService.js
// Service layer for purchase order-related API operations

// Import purchase order API endpoints
import { PURCHASE_ORDERS } from '../Components/Endpoint/Endpoint';
// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';

/**
 * Purchase order service object containing all purchase order-related API methods
 */
export const purchaseOrderService = {
    /**
     * Get all purchase orders with filters and pagination
     * @param {object} params - Query parameters for filtering and pagination
     * @returns {Promise<object>} Purchase orders data with pagination info
     */
    getAllPurchaseOrders: async (params = {}) => {
        try {
            const url = PURCHASE_ORDERS.GET_ALL(params);
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get a single purchase order by ID
     * @param {number|string} id - Purchase order ID
     * @returns {Promise<object>} Purchase order data
     */
    getPurchaseOrderById: async (id) => {
        try {
            const response = await axiosInstance.get(PURCHASE_ORDERS.GET_BY_ID(id));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Create a new purchase order
     * @param {object} orderData - Purchase order data object
     * @returns {Promise<object>} Created purchase order data
     */
    createPurchaseOrder: async (orderData) => {
        try {
            const response = await axiosInstance.post(PURCHASE_ORDERS.CREATE, orderData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Update an existing purchase order
     * @param {number|string} id - Purchase order ID
     * @param {object} orderData - Updated purchase order data
     * @returns {Promise<object>} Updated purchase order data
     */
    updatePurchaseOrder: async (id, orderData) => {
        try {
            const response = await axiosInstance.put(PURCHASE_ORDERS.UPDATE(id), orderData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Update the status of a purchase order
     * @param {number|string} id - Purchase order ID
     * @param {string} status - New status value
     * @returns {Promise<object>} Updated purchase order with new status
     */
    updatePurchaseOrderStatus: async (id, status) => {
        try {
            const response = await axiosInstance.patch(PURCHASE_ORDERS.UPDATE_STATUS(id), { Status: status });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Soft delete (cancel) a purchase order
     * @param {number|string} id - Purchase order ID
     * @returns {Promise<object>} Soft deletion confirmation
     */
    softDeletePurchaseOrder: async (id) => {
        try {
            const response = await axiosInstance.patch(PURCHASE_ORDERS.SOFT_DELETE(id), {});
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Permanently delete a purchase order from the database
     * @param {number|string} id - Purchase order ID
     * @returns {Promise<object>} Hard deletion confirmation
     */
    hardDeletePurchaseOrder: async (id) => {
        try {
            const response = await axiosInstance.delete(PURCHASE_ORDERS.HARD_DELETE(id));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get purchase orders by supplier
     * @param {number|string} supplierId - Supplier ID
     * @param {number} limit - Maximum number of orders to return (default: 10)
     * @param {number} offset - Number of orders to skip for pagination (default: 0)
     * @returns {Promise<object>} Purchase orders data for the supplier
     */
    getPurchaseOrdersBySupplier: async (supplierId, limit = 10, offset = 0) => {
        try {
            const response = await axiosInstance.get(PURCHASE_ORDERS.BY_SUPPLIER(supplierId, limit, offset));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get purchase order statistics
     * @param {string} companyId - Optional company ID to filter stats
     * @returns {Promise<object>} Purchase order statistics data
     */
    getPurchaseOrderStats: async (companyId = '') => {
        try {
            const response = await axiosInstance.get(PURCHASE_ORDERS.STATS(companyId));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Named exports for convenience and to support `import * as purchaseOrderService` usage patterns.
// Some components access `purchaseOrderService.getAllPurchaseOrders` directly from the module namespace.
export const getAllPurchaseOrders = purchaseOrderService.getAllPurchaseOrders;
export const getPurchaseOrderById = purchaseOrderService.getPurchaseOrderById;
export const createPurchaseOrder = purchaseOrderService.createPurchaseOrder;
export const updatePurchaseOrder = purchaseOrderService.updatePurchaseOrder;
export const updatePurchaseOrderStatus = purchaseOrderService.updatePurchaseOrderStatus;
export const softDeletePurchaseOrder = purchaseOrderService.softDeletePurchaseOrder;
export const hardDeletePurchaseOrder = purchaseOrderService.hardDeletePurchaseOrder;
export const getPurchaseOrdersBySupplier = purchaseOrderService.getPurchaseOrdersBySupplier;
export const getPurchaseOrderStats = purchaseOrderService.getPurchaseOrderStats;