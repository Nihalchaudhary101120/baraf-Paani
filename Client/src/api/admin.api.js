import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Admin API Service — Account Provisioning and User Management
 */

export const createUserApi = (userData) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.USERS, userData);
};

export const getAdminUsersApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.USERS);
};

export const toggleUserStatusApi = (userId) => {
  return axiosInstance.patch(ENDPOINTS.ADMIN.USER_STATUS(userId));
};
