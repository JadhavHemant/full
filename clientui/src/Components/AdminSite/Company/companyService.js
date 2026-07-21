// src/services/companyService.js

import axiosInstance from '../utils/axiosInstance';
import { COMPANIES } from '../../Endpoint/Endpoint';

export const getCompanies = async (limit = 10, offset = 0, search = '') => {
    const response = await axiosInstance.get(COMPANIES.GET_ALL(limit, offset, search));
    return response.data;
};

export const getCompanyById = async (id) => {
    const response = await axiosInstance.get(COMPANIES.GET_BY_ID(id));
    return response.data;
};

export const createCompany = async (formData) => {
    const response = await axiosInstance.post(COMPANIES.CREATE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateCompany = async (id, formData) => {
    const response = await axiosInstance.put(COMPANIES.UPDATE(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteCompany = async (id) => {
    const response = await axiosInstance.delete(COMPANIES.DELETE(id));
    return response.data;
};

export const toggleActiveStatus = async (id) => {
    const response = await axiosInstance.patch(COMPANIES.TOGGLE_ACTIVE(id));
    return response.data;
};

export const toggleFlagStatus = async (id) => {
    const response = await axiosInstance.patch(COMPANIES.TOGGLE_FLAG(id));
    return response.data;
};
