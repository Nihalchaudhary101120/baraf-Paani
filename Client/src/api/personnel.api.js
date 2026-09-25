import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Personnel Profile API Service
 */

export const getMyPersonnelProfileApi = () =>
  axiosInstance.get(ENDPOINTS.PERSONNEL.MY_PROFILE);

export const updateMyPersonnelProfileApi = (profileData) =>
  axiosInstance.put(ENDPOINTS.PERSONNEL.MY_PROFILE, profileData);
