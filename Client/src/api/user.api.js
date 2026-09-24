import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * User API Service
 */

export const getUsersApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.USERS.BASE, { params });
};

export const getUserByIdApi = (id) => {
  return axiosInstance.get(ENDPOINTS.USERS.BY_ID(id));
};

export const updateUserApi = (id, data) => {
  return axiosInstance.put(ENDPOINTS.USERS.BY_ID(id), data);
};

export const deleteUserApi = (id) => {
  return axiosInstance.delete(ENDPOINTS.USERS.BY_ID(id));
};
