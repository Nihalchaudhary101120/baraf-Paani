import axios from 'axios';
import { STORAGE_KEYS, HTTP_STATUS } from '@/utils/constants';
import { storage } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Auth Token if present in storage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handling & Auth Expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      // Clear local session if token is invalid or expired
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      storage.removeItem(STORAGE_KEYS.USER_DATA);
      
      // Dispatch custom event for app auth state reset if needed
      window.dispatchEvent(new CustomEvent('app:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
