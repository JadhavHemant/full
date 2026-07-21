// src/services/teamsChatService.js
// Service layer for chat workspace API operations

// Import axios instance for making HTTP requests
import axiosInstance from "../Components/AdminSite/utils/axiosInstance";

/**
 * Chat workspace service object containing group/channel chat API methods.
 */
const CHAT_WORKSPACE_BASE = "/chat-workspace";

const teamsChatService = {
  /**
   * Get all teams with optional company filter
   * @param {number|string|null} companyId - Optional company ID to filter teams
   * @returns {Promise<object>} Teams data
   */
  async getTeams(companyId) {
    const { data } = await axiosInstance.get(`${CHAT_WORKSPACE_BASE}/teams`, {
      params: companyId ? { companyId } : undefined,
    });
    return data;
  },

  /**
   * Create a new team
   * @param {object} payload - Team data object
   * @returns {Promise<object>} Created team data
   */
  async createTeam(payload) {
    const { data } = await axiosInstance.post(`${CHAT_WORKSPACE_BASE}/teams`, payload);
    return data;
  },

  /**
   * Get members of a specific team
   * @param {number|string} teamId - Team ID
   * @returns {Promise<object>} Team members data
   */
  async getTeamMembers(teamId) {
    const { data } = await axiosInstance.get(`${CHAT_WORKSPACE_BASE}/teams/${teamId}/members`);
    return data;
  },

  async getCompanyUsers(companyId) {
    const { data } = await axiosInstance.get(`${CHAT_WORKSPACE_BASE}/users`, {
      params: companyId ? { companyId } : undefined,
    });
    return data;
  },

  async addTeamMembers(teamId, userIds) {
    const { data } = await axiosInstance.post(`${CHAT_WORKSPACE_BASE}/teams/${teamId}/members`, { userIds });
    return data;
  },

  async removeTeamMember(teamId, userId) {
    const { data } = await axiosInstance.delete(`${CHAT_WORKSPACE_BASE}/teams/${teamId}/members/${userId}`);
    return data;
  },

  /**
   * Create a new channel in a team
   * @param {number|string} teamId - Team ID
   * @param {object} payload - Channel data object
   * @returns {Promise<object>} Created channel data
   */
  async createChannel(teamId, payload) {
    const { data } = await axiosInstance.post(`${CHAT_WORKSPACE_BASE}/teams/${teamId}/channels`, payload);
    return data;
  },

  /**
   * Get messages from a specific channel
   * @param {number|string} channelId - Channel ID
   * @param {object} params - Query parameters for pagination and filtering
   * @returns {Promise<object>} Channel messages data
   */
  async getChannelMessages(channelId, params = {}) {
    const { data } = await axiosInstance.get(`${CHAT_WORKSPACE_BASE}/channels/${channelId}/messages`, {
      params,
    });
    return data;
  },

  /**
   * Send a message to a channel
   * @param {number|string} channelId - Channel ID
   * @param {object} payload - Message data object
   * @returns {Promise<object>} Sent message data
   */
  async sendMessage(channelId, payload) {
    const { data } = await axiosInstance.post(`${CHAT_WORKSPACE_BASE}/channels/${channelId}/messages`, payload);
    return data;
  },

  /**
   * Mark a channel as read for the current user
   * @param {number|string} channelId - Channel ID
   * @returns {Promise<object>} Mark as read confirmation
   */
  async markChannelAsRead(channelId) {
    const { data } = await axiosInstance.post(`${CHAT_WORKSPACE_BASE}/channels/${channelId}/read`);
    return data;
  },
};

export default teamsChatService;
