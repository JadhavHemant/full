// src/services/customerService.js
// Service layer for customer-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import customer API endpoints
import { CUSTOMERS } from '../Components/Endpoint/Endpoint';

/**
 * Get all customers with optional filters and pagination
 * @param {object} params - Query parameters for filtering and pagination
 * @returns {Promise<object>} Customers data with pagination info
 */
export const getAllCustomers = async (params = {}) => {
    const response = await axiosInstance.get(CUSTOMERS.GET_ALL(params));
    return response.data;
};

/**
 * Get a single customer by ID
 * @param {number|string} id - Customer ID
 * @returns {Promise<object>} Customer data
 */
export const getCustomerById = async (id) => {
    const response = await axiosInstance.get(CUSTOMERS.GET_BY_ID(id));
    return response.data;
};

/**
 * Get all active customers
 * @returns {Promise<object>} Active customers data
 */
export const getActiveCustomers = async () => {
    const response = await axiosInstance.get(CUSTOMERS.GET_ACTIVE);
    return response.data;
};

/**
 * Get customer statistics
 * @returns {Promise<object>} Customer statistics data
 */
export const getCustomerStats = async () => {
    const response = await axiosInstance.get(CUSTOMERS.STATS);
    return response.data;
};

/**
 * Create a new customer
 * @param {object} customerData - Customer data object
 * @returns {Promise<object>} Created customer data
 */
export const createCustomer = async (customerData) => {
    const response = await axiosInstance.post(CUSTOMERS.CREATE, customerData);
    return response.data;
};

/**
 * Update an existing customer
 * @param {number|string} id - Customer ID
 * @param {object} customerData - Updated customer data
 * @returns {Promise<object>} Updated customer data
 */
export const updateCustomer = async (id, customerData) => {
    const response = await axiosInstance.put(CUSTOMERS.UPDATE(id), customerData);
    return response.data;
};

/**
 * Toggle the active status of a customer
 * @param {number|string} id - Customer ID
 * @returns {Promise<object>} Updated customer with new status
 */
export const toggleActiveStatus = async (id) => {
    const response = await axiosInstance.patch(CUSTOMERS.TOGGLE_ACTIVE(id));
    return response.data;
};

/**
 * Update the outstanding balance of a customer
 * @param {number|string} id - Customer ID
 * @param {number} amount - Amount to adjust
 * @param {string} operation - Operation type ('add' or 'subtract')
 * @returns {Promise<object>} Updated customer with new balance
 */
export const updateOutstandingBalance = async (id, amount, operation) => {
    const response = await axiosInstance.patch(CUSTOMERS.UPDATE_OUTSTANDING(id), {
        amount,
        operation
    });
    return response.data;
};

/**
 * Soft delete a customer (marks as deleted but keeps in database)
 * @param {number|string} id - Customer ID
 * @returns {Promise<object>} Soft deletion confirmation
 */
export const softDeleteCustomer = async (id) => {
    const response = await axiosInstance.patch(CUSTOMERS.SOFT_DELETE(id));
    return response.data;
};

/**
 * Restore a soft-deleted customer
 * @param {number|string} id - Customer ID
 * @returns {Promise<object>} Restored customer data
 */
export const restoreCustomer = async (id) => {
    const response = await axiosInstance.patch(CUSTOMERS.RESTORE(id));
    return response.data;
};

/**
 * Permanently delete a customer from the database
 * @param {number|string} id - Customer ID
 * @returns {Promise<object>} Hard deletion confirmation
 */
export const hardDeleteCustomer = async (id) => {
    const response = await axiosInstance.delete(CUSTOMERS.HARD_DELETE(id));
    return response.data;
};
