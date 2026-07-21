// src/services/auditEventsService.js
// Service layer for audit events-related API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";
// Import audit events API endpoints
import { AUDIT_EVENTS } from "../Components/Endpoint/Endpoint";

/**
 * Get audit events with optional filters
 * @param {object} params - Query parameters for filtering audit events
 * @returns {Promise<object>} Audit events data
 */
export const getAuditEvents = async (params = {}) => {
  const response = await axiosInstance.get(AUDIT_EVENTS, { params });
  return response.data;
};

/**
 * Create a new audit event
 * @param {object} payload - Audit event data object
 * @returns {Promise<object>} Created audit event data
 */
export const createAuditEvent = async (payload) => {
  const response = await axiosInstance.post(AUDIT_EVENTS, payload);
  return response.data;
};
