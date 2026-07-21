// src/services/opportunityProductService.js
// Service layer for opportunity product-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import opportunity product API endpoints
import { OPPORTUNITY_PRODUCTS } from "../Components/Endpoint/Endpoint";

/**
 * Get all opportunity products with optional filters
 * @param {object} params - Query parameters for filtering
 * @returns {Promise<object>} Opportunity products data
 */
export const getOpportunityProducts = async (params = {}) => {
  const response = await axiosInstance.get(OPPORTUNITY_PRODUCTS, { params });
  return response.data;
};

/**
 * Get a single opportunity product by ID
 * @param {number|string} id - Opportunity product ID
 * @returns {Promise<object>} Opportunity product data
 */
export const getOpportunityProductById = async (id) => {
  const response = await axiosInstance.get(`${OPPORTUNITY_PRODUCTS}/${id}`);
  return response.data;
};

/**
 * Create a new opportunity product
 * @param {object} payload - Opportunity product data object
 * @returns {Promise<object>} Created opportunity product data
 */
export const createOpportunityProduct = async (payload) => {
  const response = await axiosInstance.post(OPPORTUNITY_PRODUCTS, payload);
  return response.data;
};

/**
 * Update an existing opportunity product
 * @param {number|string} id - Opportunity product ID
 * @param {object} payload - Updated opportunity product data
 * @returns {Promise<object>} Updated opportunity product data
 */
export const updateOpportunityProduct = async (id, payload) => {
  const response = await axiosInstance.put(`${OPPORTUNITY_PRODUCTS}/${id}`, payload);
  return response.data;
};

/**
 * Delete an opportunity product
 * @param {number|string} id - Opportunity product ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteOpportunityProduct = async (id) => {
  const response = await axiosInstance.delete(`${OPPORTUNITY_PRODUCTS}/${id}`);
  return response.data;
};
