// src/services/unitService.js
// Service layer for unit-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from '../Components/AdminSite/utils/axiosInstance';
// Import unit API endpoints
import { UNITS } from '../Components/Endpoint/Endpoint';

/**
 * Get all units with pagination and search
 * @param {number} limit - Maximum number of units to return (default: 10)
 * @param {number} offset - Number of units to skip for pagination (default: 0)
 * @param {string} search - Search term to filter units (default: '')
 * @returns {Promise<object>} Units data with pagination info
 */
export const getUnits = async (limit = 10, offset = 0, search = '') => {
    const response = await axiosInstance.get(UNITS.GET_ALL(limit, offset, search));
    return response.data;
};

/**
 * Get active units only (for dropdowns)
 * @returns {Promise<object>} Active units data
 */
export const getActiveUnits = async () => {
    const response = await axiosInstance.get(UNITS.GET_ACTIVE);
    return response.data;
};

/**
 * Get a single unit by ID
 * @param {number|string} id - Unit ID
 * @returns {Promise<object>} Unit data
 */
export const getUnitById = async (id) => {
    const response = await axiosInstance.get(UNITS.GET_BY_ID(id));
    return response.data;
};

/**
 * Create a new unit
 * @param {object} unitData - Unit data object
 * @returns {Promise<object>} Created unit data
 */
export const createUnit = async (unitData) => {
    const response = await axiosInstance.post(UNITS.CREATE, unitData);
    return response.data;
};

/**
 * Update an existing unit
 * @param {number|string} id - Unit ID
 * @param {object} unitData - Updated unit data
 * @returns {Promise<object>} Updated unit data
 */
export const updateUnit = async (id, unitData) => {
    const response = await axiosInstance.put(UNITS.UPDATE(id), unitData);
    return response.data;
};

/**
 * Delete a unit (soft delete)
 * @param {number|string} id - Unit ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteUnit = async (id) => {
    const response = await axiosInstance.delete(UNITS.SOFT_DELETE(id));
    return response.data;
};

/**
 * Bulk create multiple units
 * @param {array} unitsArray - Array of unit objects to create
 * @returns {Promise<object>} Bulk creation confirmation with results
 */
export const bulkCreateUnits = async (unitsArray) => {
    const response = await axiosInstance.post(UNITS.BULK_CREATE, { units: unitsArray });
    return response.data;
};
