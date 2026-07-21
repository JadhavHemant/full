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
});