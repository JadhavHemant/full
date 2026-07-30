import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";

export const createCrudService = (baseUrl) => ({
  async list(params = {}) {
    const response = await axiosInstance.get(baseUrl, { params });
    return response.data;
  },
  async getById(id) {
    const response = await axiosInstance.get(`${baseUrl}/${id}`);
    return response.data;
  },
  async create(payload) {
    const response = await axiosInstance.post(baseUrl, payload);
    return response.data;
  },
  async update(id, payload) {
    const response = await axiosInstance.put(`${baseUrl}/${id}`, payload);
    return response.data;
  },
  async remove(id) {
    const response = await axiosInstance.delete(`${baseUrl}/${id}`);
    return response.data;
  },
  async runAction(id, { method = "post", path = "", payload = {}, params = {} } = {}) {
    const normalizedMethod = String(method || "post").toLowerCase();
    const normalizedPath = String(path || "").replace(/^\/+/, "");
    const targetUrl = normalizedPath ? `${baseUrl}/${id}/${normalizedPath}` : `${baseUrl}/${id}`;
    const response = await axiosInstance({
      url: targetUrl,
      method: normalizedMethod,
      data: payload,
      params,
    });
    return response.data;
  },
  async listComments(id) {
    const response = await axiosInstance.get(`${baseUrl}/${id}/comments`);
    return response.data;
  },
  async addComment(id, commentText) {
    const response = await axiosInstance.post(`${baseUrl}/${id}/comments`, { commentText });
    return response.data;
  },
  async listHistory(id) {
    const response = await axiosInstance.get(`${baseUrl}/${id}/history`);
    return response.data;
  },
});
