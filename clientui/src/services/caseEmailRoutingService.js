// src/services/caseEmailRoutingService.js
// Service layer for case email routing-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import case email routing API endpoints
import { CASE_EMAIL_ROUTING } from "../Components/Endpoint/Endpoint";

/**
 * Case email routing service object containing all case email routing-related API methods
 */
export const caseEmailRoutingService = {
  /**
   * Get email routing rules with optional filters
   * @param {number|string|null} companyId - Optional company ID to filter routes
   * @param {boolean|null} isActive - Optional active status filter
   * @returns {Promise<object>} Email routing rules data
   */
  getRoutes: async (companyId = null, isActive = null) => {
    const params = {};
    if (companyId) params.companyId = companyId;
    if (typeof isActive === "boolean") params.isActive = isActive;
    const response = await axiosInstance.get(CASE_EMAIL_ROUTING.ROUTES, { params });
    return response.data;
  },

  /**
   * Create a new email routing rule
   * @param {object} payload - Email routing rule data object
   * @returns {Promise<object>} Created email routing rule data
   */
  createRoute: async (payload) => {
    const response = await axiosInstance.post(CASE_EMAIL_ROUTING.ROUTES, payload);
    return response.data;
  },

  /**
   * Update an existing email routing rule
   * @param {number|string} id - Email routing rule ID
   * @param {object} payload - Updated email routing rule data
   * @returns {Promise<object>} Updated email routing rule data
   */
  updateRoute: async (id, payload) => {
    const response = await axiosInstance.put(CASE_EMAIL_ROUTING.ROUTE_BY_ID(id), payload);
    return response.data;
  },

  /**
   * Disable (delete) an email routing rule
   * @param {number|string} id - Email routing rule ID
   * @returns {Promise<object>} Deletion confirmation
   */
  disableRoute: async (id) => {
    const response = await axiosInstance.delete(CASE_EMAIL_ROUTING.ROUTE_BY_ID(id));
    return response.data;
  },
};

export default caseEmailRoutingService;
