// src/services/salesOrderService.js
// Service layer for sales order-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import sales order API endpoints
import { SALES_ORDERS } from '../Components/Endpoint/Endpoint';

/**
 * Sales order service object containing all sales order-related API methods
 */
const salesOrderService = {
    /**
     * Get all sales orders with filters and pagination
     * @param {object} params - Query parameters for filtering and pagination
     * @returns {Promise<object>} Sales orders data with pagination info
     */
    getAllSalesOrders: async (params = {}) => {
        const response = await axiosInstance.get(SALES_ORDERS.GET_ALL(params));
        return response.data;
    },

    /**
     * Get a single sales order by ID
     * @param {number|string} id - Sales order ID
     * @returns {Promise<object>} Sales order data
     */
    getSalesOrderById: async (id) => {
        const response = await axiosInstance.get(SALES_ORDERS.GET_BY_ID(id));
        return response.data;
    },

    /**
     * Get sales order statistics
     * @returns {Promise<object>} Sales order statistics data
     */
    getSalesOrderStats: async () => {
        const response = await axiosInstance.get(SALES_ORDERS.STATS);
        return response.data;
    },

    /**
     * Get sales orders by customer
     * @param {number|string} customerId - Customer ID
     * @param {number} limit - Maximum number of orders to return (default: 10)
     * @param {number} offset - Number of orders to skip for pagination (default: 0)
     * @returns {Promise<object>} Sales orders data for the customer
     */
    getSalesOrdersByCustomer: async (customerId, limit = 10, offset = 0) => {
        const response = await axiosInstance.get(SALES_ORDERS.BY_CUSTOMER(customerId, limit, offset));
        return response.data;
    },

    /**
     * Create a new sales order
     * @param {object} orderData - Sales order data object
     * @returns {Promise<object>} Created sales order data
     */
    createSalesOrder: async (orderData) => {
        const response = await axiosInstance.post(SALES_ORDERS.CREATE, orderData);
        return response.data;
    },

    /**
     * Update an existing sales order
     * @param {number|string} id - Sales order ID
     * @param {object} orderData - Updated sales order data
     * @returns {Promise<object>} Updated sales order data
     */
    updateSalesOrder: async (id, orderData) => {
        const response = await axiosInstance.put(SALES_ORDERS.UPDATE(id), orderData);
        return response.data;
    },

    /**
     * Update the status of a sales order
     * @param {number|string} id - Sales order ID
     * @param {string} status - New status value
     * @returns {Promise<object>} Updated sales order with new status
     */
    updateStatus: async (id, status) => {
        const response = await axiosInstance.patch(SALES_ORDERS.UPDATE_STATUS(id), { Status: status });
        return response.data;
    },

    /**
     * Update payment information for a sales order
     * @param {number|string} id - Sales order ID
     * @param {object} paymentData - Payment data object
     * @returns {Promise<object>} Updated sales order with payment info
     */
    updatePayment: async (id, paymentData) => {
        const response = await axiosInstance.patch(SALES_ORDERS.UPDATE_PAYMENT(id), paymentData);
        return response.data;
    },

    /**
     * Soft delete a sales order (marks as deleted but keeps in database)
     * @param {number|string} id - Sales order ID
     * @returns {Promise<object>} Soft deletion confirmation
     */
    softDeleteSalesOrder: async (id) => {
        const response = await axiosInstance.patch(SALES_ORDERS.SOFT_DELETE(id));
        return response.data;
    },

    /**
     * Restore a soft-deleted sales order
     * @param {number|string} id - Sales order ID
     * @returns {Promise<object>} Restored sales order data
     */
    restoreSalesOrder: async (id) => {
        const response = await axiosInstance.patch(SALES_ORDERS.RESTORE(id));
        return response.data;
    },

    /**
     * Permanently delete a sales order from the database
     * @param {number|string} id - Sales order ID
     * @returns {Promise<object>} Hard deletion confirmation
     */
    hardDeleteSalesOrder: async (id) => {
        const response = await axiosInstance.delete(SALES_ORDERS.HARD_DELETE(id));
        return response.data;
    }
};

export default salesOrderService;
