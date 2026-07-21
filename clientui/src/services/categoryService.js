// src/services/categoryService.js
// Service layer for category-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import category API endpoints
import { CATEGORIES } from '../Components/Endpoint/Endpoint';

/**
 * Get all active categories (for dropdowns)
 * @returns {Promise<object>} Active categories data
 */
export const getActiveCategories = async () => {
    const response = await axiosInstance.get(CATEGORIES.GET_ACTIVE);
    return response.data;
};

/**
 * Get all categories with pagination and search
 * @param {number} limit - Maximum number of categories to return (default: 10)
 * @param {number} offset - Number of categories to skip for pagination (default: 0)
 * @param {string} search - Search term to filter categories (default: '')
 * @returns {Promise<object>} Categories data with pagination info
 */
export const getCategories = async (limit = 10, offset = 0, search = '') => {
    const response = await axiosInstance.get(CATEGORIES.GET_ALL(limit, offset, search));
    return response.data;
};
