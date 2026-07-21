/**
 * API Mode utility
 * API mode is controlled exclusively by config.js (API_MODE field).
 * Simply change src/config.js → API_MODE: 'local' or 'live'
 */

import CONFIG from '../config';

/**
 * Get the currently selected API mode
 * @returns {'local' | 'live'}
 */
export const getApiMode = () => {
  return CONFIG.API_MODE;
};

/**
 * Get the API base URL based on the selected mode
 * @returns {string} The API base URL
 */
export const getApiBaseUrl = () => {
  return CONFIG.API_BASE_URL;
};

export default {
  getApiMode,
  getApiBaseUrl,
};