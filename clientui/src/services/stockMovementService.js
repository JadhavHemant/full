// src/services/stockMovementService.js
// Service layer for stock movement-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import stock movement API endpoints
import { STOCK_MOVEMENTS } from "../Components/Endpoint/Endpoint";

/**
 * Helper function to build URL with query parameters
 * Filters out null, undefined, and empty string values
 * @param {string} endpoint - Base endpoint URL
 * @param {object} params - Query parameters
 * @returns {string} Complete URL with query string
 */
const buildUrl = (endpoint, params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    )
  ).toString();

  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

/**
 * Get all stock movements with filters and pagination
 * @param {number} limit - Maximum number of movements to return (default: 10)
 * @param {number} offset - Number of movements to skip for pagination (default: 0)
 * @param {string} search - Search term to filter movements (default: '')
 * @param {object} filters - Additional filters
 * @returns {Promise<object>} Stock movements data with pagination info
 */
export const getAllStockMovements = async (
  limit = 10,
  offset = 0,
  search = "",
  filters = {}
) => {
  const params = { limit, offset, search, ...filters };
  const url = buildUrl(STOCK_MOVEMENTS.BASE, params);
  const response = await axiosInstance.get(url);
  return response.data;
};

/**
 * Get a single stock movement by ID
 * @param {number|string} id - Stock movement ID
 * @returns {Promise<object>} Stock movement data
 */
export const getStockMovementById = async (id) => {
  const response = await axiosInstance.get(STOCK_MOVEMENTS.BY_ID(id));
  return response.data;
};

/**
 * Get stock movement statistics
 * @returns {Promise<object>} Stock movement statistics data
 */
export const getStockMovementStats = async () => {
  const response = await axiosInstance.get(STOCK_MOVEMENTS.STATS);
  return response.data;
};

/**
 * Get recent stock movements
 * @param {number} limit - Maximum number of recent movements to return (default: 5)
 * @returns {Promise<object>} Recent stock movements data
 */
export const getRecentStockMovements = async (limit = 5) => {
  const url = buildUrl(STOCK_MOVEMENTS.RECENT, { limit });
  const response = await axiosInstance.get(url);
  return response.data;
};

/**
 * Create a new stock movement
 * @param {object} movementData - Stock movement data object
 * @returns {Promise<object>} Created stock movement data
 */
export const createStockMovement = async (movementData) => {
  const response = await axiosInstance.post(
    STOCK_MOVEMENTS.CREATE,
    movementData
  );
  return response.data;
};

/**
 * Update an existing stock movement
 * @param {number|string} id - Stock movement ID
 * @param {object} movementData - Updated stock movement data
 * @returns {Promise<object>} Updated stock movement data
 */
export const updateStockMovement = async (id, movementData) => {
  const response = await axiosInstance.put(
    STOCK_MOVEMENTS.UPDATE(id),
    movementData
  );
  return response.data;
};

/**
 * Delete a stock movement
 * @param {number|string} id - Stock movement ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteStockMovement = async (id) => {
  const response = await axiosInstance.delete(STOCK_MOVEMENTS.DELETE(id));
  return response.data;
};
