// src/services/companySettingsService.js
// Service layer for company settings-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import company settings API endpoints
import { COMPANY_SETTINGS } from "../Components/Endpoint/Endpoint";

/**
 * Get company settings
 * @param {number|string|null} companyId - Optional company ID to get settings for
 * @returns {Promise<object>} Company settings data
 */
export const getCompanySettings = async (companyId = null) => {
  const endpoint = companyId ? `${COMPANY_SETTINGS}/${companyId}` : COMPANY_SETTINGS;
  const response = await axiosInstance.get(endpoint);
  return response.data;
};

/**
 * Save company settings
 * @param {object} settings - Company settings object
 * @param {object} options - Options object
 * @param {number|string|null} options.companyId - Optional company ID
 * @param {boolean} options.merge - Whether to merge with existing settings (default: true)
 * @returns {Promise<object>} Saved company settings data
 */
export const saveCompanySettings = async (settings, { companyId = null, merge = true } = {}) => {
  const endpoint = companyId ? `${COMPANY_SETTINGS}/${companyId}` : COMPANY_SETTINGS;
  const response = await axiosInstance.put(endpoint, { settings, merge });
  return response.data;
};
