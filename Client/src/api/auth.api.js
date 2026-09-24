import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Authentication API Service
 */

export const loginApi = (credentials) => {
  return axiosInstance.post(ENDPOINTS.AUTH.LOGIN, credentials);
};

export const registerApi = (userData) => {
  return axiosInstance.post(ENDPOINTS.AUTH.REGISTER, userData);
};

export const logoutApi = () => {
  return axiosInstance.post(ENDPOINTS.AUTH.LOGOUT);
};

export const getCurrentUserApi = () => {
  return axiosInstance.get(ENDPOINTS.AUTH.ME);
};

export const refreshTokenApi = (refreshToken) => {
  return axiosInstance.post(ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });
};
