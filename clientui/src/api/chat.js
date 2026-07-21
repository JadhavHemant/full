import axiosInstance from "../Components/AdminSite/utils/axiosInstance";

const chatApi = {
  getChannels: async () => {
    const { data } = await axiosInstance.get("chat/channels");
    return data.channels || [];
  },
  getChannel: async (channelId) => {
    const { data } = await axiosInstance.get(`chat/channels/${channelId}`);
    return data.channel;
  },
  createChannel: async (payload) => {
    const { data } = await axiosInstance.post("chat/channels", payload);
    return data.channel;
  },
  createDirectChannel: async (targetUserId) => {
    const { data } = await axiosInstance.post("chat/channels/direct", { targetUserId });
    return data.channel;
  },
  updateChannel: async (channelId, payload) => {
    const { data } = await axiosInstance.put(`chat/channels/${channelId}`, payload);
    return data.channel;
  },
  deleteChannel: async (channelId) => {
    const { data } = await axiosInstance.delete(`chat/channels/${channelId}`);
    return data;
  },
  addMember: async (channelId, userId) => {
    const { data } = await axiosInstance.post(`chat/channels/${channelId}/members`, { userId });
    return data.channel;
  },
  removeMember: async (channelId, userId) => {
    const { data } = await axiosInstance.delete(`chat/channels/${channelId}/members`, { data: { userId } });
    return data.channel;
  },
  getMessages: async (channelId, params = {}) => {
    const { data } = await axiosInstance.get(`chat/channels/${channelId}/messages`, { params });
    return data;
  },
  sendMessage: async (channelId, payload) => {
    const { data } = await axiosInstance.post(`chat/channels/${channelId}/messages`, payload);
    return data.message;
  },
  uploadFile: async (channelId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosInstance.post(`chat/channels/${channelId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },
  editMessage: async (messageId, content) => {
    const { data } = await axiosInstance.put(`chat/messages/${messageId}`, { content });
    return data.message;
  },
  deleteMessage: async (messageId) => {
    const { data } = await axiosInstance.delete(`chat/messages/${messageId}`);
    return data;
  },
  toggleReaction: async (messageId, emoji) => {
    const { data } = await axiosInstance.post(`chat/messages/${messageId}/react`, { emoji });
    return data.reactions;
  },
  markRead: async (messageId) => {
    const { data } = await axiosInstance.post(`chat/messages/${messageId}/read`);
    return data;
  },
  searchUsers: async (query) => {
    const { data } = await axiosInstance.get("chat/users/search", {
      params: { q: query },
    });
    return data.users || [];
  },
};

export default chatApi;
