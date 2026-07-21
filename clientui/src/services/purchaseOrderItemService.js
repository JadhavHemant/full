// src/services/purchaseOrderItemService.js
// Service layer for purchase order item-related API operations

// Import purchase order item API endpoints
import { PURCHASE_ORDER_ITEMS } from '../Components/Endpoint/Endpoint';
// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';

/**
 * Purchase order item service object containing all purchase order item-related API methods
 */
export const purchaseOrderItemService = {
    /**
     * Get items by purchase order ID
     * @param {number|string} purchaseOrderId - Purchase order ID
     * @param {number} limit - Maximum number of items to return (default: 50)
     * @param {number} offset - Number of items to skip for pagination (default: 0)
     * @returns {Promise<object>} Purchase order items data
     */
    getItemsByPurchaseOrderId: async (purchaseOrderId, limit = 50, offset = 0) => {
        try {
            const response = await axiosInstance.get(
                PURCHASE_ORDER_ITEMS.BY_PURCHASE_ORDER(purchaseOrderId, limit, offset)
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get purchase order summary
     * @param {number|string} purchaseOrderId - Purchase order ID
     * @returns {Promise<object>} Purchase order summary data
     */
    getPurchaseOrderSummary: async (purchaseOrderId) => {
        try {
            const response = await axiosInstance.get(PURCHASE_ORDER_ITEMS.SUMMARY(purchaseOrderId));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Create a new purchase order item
     * @param {object} itemData - Purchase order item data object
     * @returns {Promise<object>} Created purchase order item data
     */
    createPurchaseOrderItem: async (itemData) => {
        try {
            const response = await axiosInstance.post(PURCHASE_ORDER_ITEMS.CREATE, itemData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Update an existing purchase order item
     * @param {number|string} id - Purchase order item ID
     * @param {object} itemData - Updated purchase order item data
     * @returns {Promise<object>} Updated purchase order item data
     */
    updatePurchaseOrderItem: async (id, itemData) => {
        try {
            const response = await axiosInstance.put(PURCHASE_ORDER_ITEMS.UPDATE(id), itemData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Delete a purchase order item
     * @param {number|string} id - Purchase order item ID
     * @returns {Promise<object>} Deletion confirmation
     */
    deletePurchaseOrderItem: async (id) => {
        try {
            const response = await axiosInstance.delete(PURCHASE_ORDER_ITEMS.DELETE(id));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get all purchase order items with pagination
     * @param {number} limit - Maximum number of items to return (default: 10)
     * @param {number} offset - Number of items to skip for pagination (default: 0)
     * @returns {Promise<object>} Purchase order items data with pagination info
     */
    getAllPurchaseOrderItems: async (limit = 10, offset = 0) => {
        try {
            const response = await axiosInstance.get(PURCHASE_ORDER_ITEMS.GET_ALL({ limit, offset }));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Bulk update received quantities for multiple items
     * @param {array} items - Array of items with updated received quantities
     * @returns {Promise<object>} Bulk update confirmation
     */
    bulkUpdateReceivedQuantities: async (items) => {
        try {
            const response = await axiosInstance.patch(PURCHASE_ORDER_ITEMS.BULK_RECEIVE, { items });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};
