// src/services/productStockService.js
// Service layer for product stock-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import product stock API endpoints
import { PRODUCT_STOCK } from '../Components/Endpoint/Endpoint';

/**
 * Helper function to build URL with query parameters
 * Filters out null, undefined, and empty string values
 * @param {string} endpoint - Base endpoint URL
 * @param {object} params - Query parameters
 * @returns {string} Complete URL with query string
 */
const buildUrl = (endpoint, params = {}) => {
    const queryString = new URLSearchParams(
        Object.entries(params).filter(([ , value]) =>
            value !== null && value !== undefined && value !== ''
        )
    ).toString();

    return queryString ? `${endpoint}?${queryString}` : endpoint;
};

/**
 * Get all product stocks with filters and pagination
 * @param {number} limit - Maximum number of stocks to return (default: 10)
 * @param {number} offset - Number of stocks to skip for pagination (default: 0)
 * @param {string} search - Search term to filter stocks (default: '')
 * @param {object} filters - Additional filters
 * @returns {Promise<object>} Product stocks data with pagination info
 */
export const getAllProductStocks = async (limit = 10, offset = 0, search = '', filters = {}) => {
    try {
        const params = { limit, offset, search, ...filters };
        const url = buildUrl(PRODUCT_STOCK.BASE || '/product-stock', params);
        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch product stocks' };
    }
};

/**
 * Get product stock by ID
 * @param {number|string} id - Product stock ID
 * @returns {Promise<object>} Product stock data
 */
export const getProductStockById = async (id) => {
    try {
        const endpoint = PRODUCT_STOCK.BY_ID ? PRODUCT_STOCK.BY_ID(id) : `/product-stock/${id}`;
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch product stock' };
    }
};

/**
 * Get stock by product
 * @param {number|string} productId - Product ID
 * @returns {Promise<object>} Stock data for the product
 */
export const getStockByProduct = async (productId) => {
    try {
        const endpoint = PRODUCT_STOCK.BY_PRODUCT ? PRODUCT_STOCK.BY_PRODUCT(productId) : `/product-stock/product/${productId}`;
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch stock by product' };
    }
};

/**
 * Get stock by warehouse
 * @param {number|string} warehouseId - Warehouse ID
 * @returns {Promise<object>} Stock data for the warehouse
 */
export const getStockByWarehouse = async (warehouseId) => {
    try {
        const endpoint = PRODUCT_STOCK.BY_WAREHOUSE ? PRODUCT_STOCK.BY_WAREHOUSE(warehouseId) : `/product-stock/warehouse/${warehouseId}`;
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch stock by warehouse' };
    }
};

/**
 * Get low stock items
 * @returns {Promise<object>} Low stock items data
 */
export const getLowStockItems = async () => {
    try {
        const endpoint = PRODUCT_STOCK.LOW_STOCK || '/product-stock/low-stock';
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch low stock items' };
    }
};

/**
 * Create a new product stock entry
 * @param {object} stockData - Product stock data object
 * @returns {Promise<object>} Created product stock data
 */
export const createProductStock = async (stockData) => {
    try {
        const endpoint = PRODUCT_STOCK.BASE || '/product-stock';
        const response = await axiosInstance.post(endpoint, stockData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to create product stock' };
    }
};

/**
 * Update an existing product stock
 * @param {number|string} id - Product stock ID
 * @param {object} stockData - Updated product stock data
 * @returns {Promise<object>} Updated product stock data
 */
export const updateProductStock = async (id, stockData) => {
    try {
        const endpoint = PRODUCT_STOCK.BY_ID ? PRODUCT_STOCK.BY_ID(id) : `/product-stock/${id}`;
        const response = await axiosInstance.put(endpoint, stockData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update product stock' };
    }
};

/**
 * Adjust stock quantity
 * @param {number|string} id - Product stock ID
 * @param {number} adjustment - Quantity adjustment (positive or negative)
 * @param {string} reason - Reason for the adjustment
 * @returns {Promise<object>} Updated product stock data
 */
export const adjustStockQuantity = async (id, adjustment, reason) => {
    try {
        const endpoint = PRODUCT_STOCK.ADJUST ? PRODUCT_STOCK.ADJUST(id) : `/product-stock/${id}/adjust`;
        const response = await axiosInstance.post(endpoint, { adjustment, reason });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to adjust stock quantity' };
    }
};

/**
 * Transfer stock between warehouses
 * @param {object} transferData - Transfer data including source, destination, and quantity
 * @returns {Promise<object>} Transfer confirmation with updated stock data
 */
export const transferStock = async (transferData) => {
    try {
        const endpoint = PRODUCT_STOCK.TRANSFER || '/product-stock/transfer';
        const response = await axiosInstance.post(endpoint, transferData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to transfer stock' };
    }
};

/**
 * Soft delete (deactivate) a product stock entry
 * @param {number|string} id - Product stock ID
 * @returns {Promise<object>} Soft deletion confirmation
 */
export const softDeleteProductStock = async (id) => {
    try {
        const endpoint = PRODUCT_STOCK.SOFT_DELETE ? PRODUCT_STOCK.SOFT_DELETE(id) : `/product-stock/${id}/soft`;
        const response = await axiosInstance.patch(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to deactivate product stock' };
    }
};

/**
 * Permanently delete a product stock entry
 * @param {number|string} id - Product stock ID
 * @returns {Promise<object>} Hard deletion confirmation
 */
export const deleteProductStock = async (id) => {
    try {
        const endpoint = PRODUCT_STOCK.HARD_DELETE ? PRODUCT_STOCK.HARD_DELETE(id) : `/product-stock/${id}/hard`;
        const response = await axiosInstance.delete(endpoint);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to delete product stock' };
    }
};
