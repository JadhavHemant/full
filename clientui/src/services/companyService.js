// src/services/companyService.js
// Service layer for company-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import company API endpoints
import { COMPANIES } from '../Components/Endpoint/Endpoint';

/**
 * Get all active companies
 * @returns {Promise<object>} Active companies data
 */
export const getActiveCompanies = async () => {
    try {
        console.log('📡 Fetching active companies from:', COMPANIES.GET_ACTIVE);
        const response = await axiosInstance.get(COMPANIES.GET_ACTIVE);
        console.log('✅ Companies response:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ getActiveCompanies error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get companies with pagination and search
 * Can accept either an object with all parameters or individual parameters
 * @param {number|object} limitOrParams - Either limit number or params object
 * @param {number} offset - Offset for pagination (default: 0)
 * @param {string} search - Search term (default: '')
 * @returns {Promise<object>} Companies data with pagination info
 */
export const getCompanies = async (limitOrParams = 10, offset = 0, search = '') => {
    try {
        const params = typeof limitOrParams === 'object'
            ? limitOrParams
            : { limit: limitOrParams, offset, search };
        const response = await axiosInstance.get(COMPANIES.GET_ALL(params));
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
};

/**
 * Get a single company by ID
 * @param {number|string} id - Company ID
 * @returns {Promise<object>} Company data
 */
export const getCompanyById = async (id) => {
    try {
        const response = await axiosInstance.get(COMPANIES.GET_BY_ID(id));
        return response.data;
    } catch (error) {
        console.error('Error fetching company:', error);
        throw error;
    }
};

/**
 * Create a new company
 * @param {FormData} formData - Company data including logo file
 * @returns {Promise<object>} Created company data
 */
export const createCompany = async (formData) => {
    try {
        const response = await axiosInstance.post(COMPANIES.CREATE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating company:', error);
        throw error;
    }
};

/**
 * Update an existing company
 * @param {number|string} id - Company ID
 * @param {FormData} formData - Updated company data including logo file
 * @returns {Promise<object>} Updated company data
 */
export const updateCompany = async (id, formData) => {
    try {
        const response = await axiosInstance.put(COMPANIES.UPDATE(id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating company:', error);
        throw error;
    }
};

/**
 * Delete a company by ID
 * @param {number|string} id - Company ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteCompany = async (id) => {
    try {
        const response = await axiosInstance.delete(COMPANIES.DELETE(id));
        return response.data;
    } catch (error) {
        console.error('Error deleting company:', error);
        throw error;
    }
};

/**
 * Toggle the active status of a company
 * @param {number|string} id - Company ID
 * @returns {Promise<object>} Updated company with new status
 */
export const toggleActiveStatus = async (id) => {
    try {
        const response = await axiosInstance.patch(COMPANIES.TOGGLE_ACTIVE(id));
        return response.data;
    } catch (error) {
        console.error('Error toggling company status:', error);
        throw error;
    }
};

/**
 * Toggle the flag status of a company
 * @param {number|string} id - Company ID
 * @returns {Promise<object>} Updated company with new flag status
 */
export const toggleFlagStatus = async (id) => {
    try {
        const response = await axiosInstance.patch(COMPANIES.TOGGLE_FLAG(id));
        return response.data;
    } catch (error) {
        console.error('Error toggling company flag:', error);
        throw error;
    }
};
