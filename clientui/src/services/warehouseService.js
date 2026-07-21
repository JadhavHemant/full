// src/services/warehouseService.js
// Service layer for warehouse-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import warehouse API endpoints
import { WAREHOUSES } from '../Components/Endpoint/Endpoint';

/**
 * Get all warehouses with filters and pagination
 * @param {number} limit - Maximum number of warehouses to return (default: 10)
 * @param {number} offset - Number of warehouses to skip for pagination (default: 0)
 * @param {string} search - Search term to filter warehouses (default: '')
 * @param {object} filters - Additional filters
 * @returns {Promise<object>} Warehouses data with pagination info
 */
export const getWarehouses = async (limit = 10, offset = 0, search = '', filters = {}) => {
    try {
        const params = new URLSearchParams({
            limit,
            offset,
            search,
            ...filters
        });

        const response = await axiosInstance.get(`${WAREHOUSES.BASE}?${params}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Get active warehouses (for dropdowns)
 * @param {number|string|null} companyId - Optional company ID to filter warehouses
 * @returns {Promise<object>} Active warehouses data
 */
export const getActiveWarehouses = async (companyId = null) => {
    try {
        const params = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`${WAREHOUSES.ACTIVE}${params}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Get a single warehouse by ID
 * @param {number|string} id - Warehouse ID
 * @returns {Promise<object>} Warehouse data
 */
export const getWarehouseById = async (id) => {
    try {
        const response = await axiosInstance.get(WAREHOUSES.BY_ID(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Get warehouses by company
 * @param {number|string} companyId - Company ID
 * @param {boolean} includeInactive - Whether to include inactive warehouses (default: false)
 * @returns {Promise<object>} Warehouses data for the company
 */
export const getWarehousesByCompany = async (companyId, includeInactive = false) => {
    try {
        const response = await axiosInstance.get(`${WAREHOUSES.BY_COMPANY(companyId)}?includeInactive=${includeInactive}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Create a new warehouse
 * @param {object} warehouseData - Warehouse data object
 * @returns {Promise<object>} Created warehouse data
 */
export const createWarehouse = async (warehouseData) => {
    try {
        const response = await axiosInstance.post(WAREHOUSES.BASE, warehouseData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Update an existing warehouse
 * @param {number|string} id - Warehouse ID
 * @param {object} warehouseData - Updated warehouse data
 * @returns {Promise<object>} Updated warehouse data
 */
export const updateWarehouse = async (id, warehouseData) => {
    try {
        const response = await axiosInstance.put(WAREHOUSES.BY_ID(id), warehouseData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Toggle the active status of a warehouse
 * @param {number|string} id - Warehouse ID
 * @returns {Promise<object>} Updated warehouse with new status
 */
export const toggleActiveStatus = async (id) => {
    try {
        const response = await axiosInstance.patch(WAREHOUSES.TOGGLE_STATUS(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Soft delete a warehouse (marks as deleted but keeps in database)
 * @param {number|string} id - Warehouse ID
 * @returns {Promise<object>} Soft deletion confirmation
 */
export const softDeleteWarehouse = async (id) => {
    try {
        const response = await axiosInstance.delete(WAREHOUSES.SOFT_DELETE(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Permanently delete a warehouse from the database
 * @param {number|string} id - Warehouse ID
 * @returns {Promise<object>} Hard deletion confirmation
 */
export const deleteWarehouse = async (id) => {
    try {
        const response = await axiosInstance.delete(WAREHOUSES.HARD_DELETE(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Bulk import warehouses
 * @param {array} warehouses - Array of warehouse objects to import
 * @returns {Promise<object>} Import confirmation with results
 */
export const bulkImportWarehouses = async (warehouses) => {
    try {
        const response = await axiosInstance.post(WAREHOUSES.BULK_IMPORT, { warehouses });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
