// src/services/notificationPreferencesService.js
// Service layer for notification preferences-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import notification preferences API endpoints
import { NOTIFICATION_PREFERENCES } from "../Components/Endpoint/Endpoint";

/**
 * Get current user's notification preferences
 * @returns {Promise<object>} User's notification preferences data
 */
export const getMyNotificationPreferences = async () => {
  const response = await axiosInstance.get(`${NOTIFICATION_PREFERENCES}/mine`);
  return response.data;
};

/**
 * Save current user's notification preferences
 * @param {object} preferences - Notification preferences object
 * @param {boolean} replaceExisting - Whether to replace existing preferences or merge (default: false)
 * @returns {Promise<object>} Saved notification preferences data
 */
export const saveMyNotificationPreferences = async (preferences, replaceExisting = false) => {
  const response = await axiosInstance.put(`${NOTIFICATION_PREFERENCES}/mine`, {
    preferences,
    replaceExisting,
  });
  return response.data;
};

/**
 * Get notification preferences for a specific user
 * @param {number|string} userId - User ID
 * @returns {Promise<object>} User's notification preferences data
 */
export const getUserNotificationPreferences = async (userId) => {
  const response = await axiosInstance.get(`${NOTIFICATION_PREFERENCES}/user/${userId}`);
  return response.data;
};
