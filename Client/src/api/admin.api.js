import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Admin API Service — Account Provisioning, Devices, Expeditions & Command Overview
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

export const getAdminStatsApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.STATS);
};

export const getDevicesApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.DEVICES);
};

export const registerDeviceApi = (deviceData) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.DEVICES, deviceData);
};

export const toggleDeviceStatusApi = (deviceId, status) => {
  return axiosInstance.patch(ENDPOINTS.ADMIN.DEVICE_STATUS(deviceId), { status });
};

export const getCommandOverviewApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.COMMAND_OVERVIEW);
};

export const getPersonnelReadinessApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.PERSONNEL_READINESS);
};

export const getExpeditionsApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.EXPEDITIONS);
};

export const createExpeditionApi = (expeditionData) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.EXPEDITIONS, expeditionData);
};

export const updateExpeditionApi = (expeditionId, data) => {
  return axiosInstance.patch(ENDPOINTS.ADMIN.EXPEDITION_BY_ID(expeditionId), data);
};

export const assignPersonnelToExpeditionApi = (expeditionId, data) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.EXPEDITION_ASSIGN(expeditionId), data);
};

export const nominatePersonnelApi = (expeditionId, data) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.EXPEDITION_NOMINATE(expeditionId), data);
};

export const getExpeditionCandidatesApi = (expeditionId) => {
  return axiosInstance.get(ENDPOINTS.ADMIN.EXPEDITION_CANDIDATES(expeditionId));
};

export const confirmExpeditionCandidateApi = (expeditionId, candidateId, data = {}) => {
  return axiosInstance.post(ENDPOINTS.ADMIN.EXPEDITION_CONFIRM_CANDIDATE(expeditionId, candidateId), data);
};

export const removeExpeditionCandidateApi = (expeditionId, candidateId) => {
  return axiosInstance.delete(ENDPOINTS.ADMIN.EXPEDITION_REMOVE_CANDIDATE(expeditionId, candidateId));
};

// HQ_ADMIN read-only operational views
export const getAdminMedicalRecordsApi = (params) => {
  return axiosInstance.get(ENDPOINTS.ADMIN.MEDICAL_RECORDS, { params });
};

export const getAdminCargoDataApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.CARGO_DATA);
};

export const getAdminFieldOpsApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.FIELD_OPS);
};

export const getAdminInventoryStatusApi = () => {
  return axiosInstance.get(ENDPOINTS.ADMIN.INVENTORY_STATUS);
};
