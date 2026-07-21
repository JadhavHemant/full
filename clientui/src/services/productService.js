// src/services/productService.js
// Service layer for product-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import product API endpoints
import { PRODUCTS } from '../Components/Endpoint/Endpoint';

/**
 * Get all products with pagination, search, and filters
 * @param {number} limit - Maximum number of products to return (default: 10)
 * @param {number} offset - Number of products to skip for pagination (default: 0)
 * @param {string} search - Search term to filter products (default: '')
 * @param {object} filters - Additional filters (categoryId, companyId, isActive, lowStock, sortBy, sortOrder)
 * @returns {Promise<object>} Products data with pagination info
 */
export const getProducts = async (limit = 10, offset = 0, search = '', filters = {}) => {
    const response = await axiosInstance.get(
        PRODUCTS.GET_ALL(
            limit, offset, search,
            filters.categoryId, filters.companyId, filters.isActive,
            filters.lowStock, filters.sortBy, filters.sortOrder
        )
    );
    return response.data;
};

/**
 * Get a single product by its ID
 * @param {number|string} id - Product ID
 * @returns {Promise<object>} Product data
 */
export const getProductById = async (id) => {
    const response = await axiosInstance.get(PRODUCTS.GET_BY_ID(id));
    return response.data;
};

/**
 * Create a new product
 * @param {FormData} formData - Product data including image file
 * @returns {Promise<object>} Created product data
 */
export const createProduct = async (formData) => {
    const response = await axiosInstance.post(PRODUCTS.CREATE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

/**
 * Update an existing product
 * @param {number|string} id - Product ID
 * @param {FormData} formData - Updated product data including image file
 * @returns {Promise<object>} Updated product data
 */
export const updateProduct = async (id, formData) => {
    const response = await axiosInstance.put(PRODUCTS.UPDATE(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

/**
 * Delete a product by ID
 * @param {number|string} id - Product ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteProduct = async (id) => {
    const response = await axiosInstance.delete(PRODUCTS.DELETE(id));
    return response.data;
};

/**
 * Toggle the active status of a product
 * @param {number|string} id - Product ID
 * @returns {Promise<object>} Updated product with new status
 */
export const toggleActiveStatus = async (id) => {
    const response = await axiosInstance.patch(PRODUCTS.TOGGLE_ACTIVE(id));
    return response.data;
};

/**
 * Get products with low stock for a specific company
 * @param {number|string} companyId - Company ID
 * @param {number} limit - Maximum number of products to return (default: 10)
 * @returns {Promise<object>} Low stock products data
 */
export const getLowStockProducts = async (companyId, limit = 10) => {
    const response = await axiosInstance.get(PRODUCTS.LOW_STOCK(companyId, limit));
    return response.data;
};

/**
 * Get product statistics for a specific company
 * @param {number|string} companyId - Company ID
 * @returns {Promise<object>} Product statistics data
 */
export const getProductStats = async (companyId) => {
    const response = await axiosInstance.get(PRODUCTS.STATS(companyId));
    return response.data;
};

/**
 * Delete multiple products in a single request
 * @param {array} ids - Array of product IDs to delete
 * @returns {Promise<object>} Bulk deletion confirmation
 */
export const bulkDeleteProducts = async (ids) => {
    const response = await axiosInstance.delete(PRODUCTS.BULK_DELETE, {
        data: { ids }
    });
    return response.data;
};

