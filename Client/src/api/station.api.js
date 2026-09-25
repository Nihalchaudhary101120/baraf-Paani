import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Station API Service — Antarctic Station Management
 */

export const getStationsApi = () => {
  return axiosInstance.get(ENDPOINTS.STATIONS.BASE);
};

export const createStationApi = (stationData) => {
  return axiosInstance.post(ENDPOINTS.STATIONS.BASE, stationData);
};
