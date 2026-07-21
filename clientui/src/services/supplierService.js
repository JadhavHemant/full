// src/services/supplierService.js
// Service layer for supplier-related API operations

// Import supplier API endpoints
import { SUPPLIERS } from '../Components/Endpoint/Endpoint';
// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';

/**
 * Supplier service object containing all supplier-related API methods
 */
export const supplierService = {
    /**
     * Get all suppliers with filters and pagination
     * @param {object} params - Query parameters (limit, offset, search, isActive, sortBy, sortOrder)
     * @returns {Promise<object>} Suppliers data with pagination info
     */
    getAllSuppliers: async (params = {}) => {
        try {
            const { limit = 10, offset = 0, search = '', isActive = '', sortBy = 'CreatedAt', sortOrder = 'DESC' } = params;
            const url = SUPPLIERS.GET_ALL(limit, offset, search, isActive, sortBy, sortOrder);
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get all active suppliers only
     * @returns {Promise<object>} Active suppliers data
     */
    getActiveSuppliers: async () => {
        try {
            const response = await axiosInstance.get(SUPPLIERS.GET_ACTIVE);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Get a single supplier by ID
     * @param {number|string} id - Supplier ID
     * @returns {Promise<object>} Supplier data
     */
    getSupplierById: async (id) => {
        try {
            const response = await axiosInstance.get(SUPPLIERS.GET_BY_ID(id));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Create a new supplier
     * @param {object} supplierData - Supplier data object
     * @returns {Promise<object>} Created supplier data
     */
    createSupplier: async (supplierData) => {
        try {
            const response = await axiosInstance.post(SUPPLIERS.CREATE, supplierData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Update an existing supplier
     * @param {number|string} id - Supplier ID
     * @param {object} supplierData - Updated supplier data
     * @returns {Promise<object>} Updated supplier data
     */
    updateSupplier: async (id, supplierData) => {
        try {
            const response = await axiosInstance.put(SUPPLIERS.UPDATE(id), supplierData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Soft delete a supplier (marks as deleted but keeps in database)
     * @param {number|string} id - Supplier ID
     * @returns {Promise<object>} Soft deletion confirmation
     */
    softDeleteSupplier: async (id) => {
        try {
            const response = await axiosInstance.patch(SUPPLIERS.SOFT_DELETE(id), {});
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Permanently delete a supplier from the database
     * @param {number|string} id - Supplier ID
     * @returns {Promise<object>} Hard deletion confirmation
     */
    hardDeleteSupplier: async (id) => {
        try {
            const response = await axiosInstance.delete(SUPPLIERS.HARD_DELETE(id));
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
};
