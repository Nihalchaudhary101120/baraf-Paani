import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Training API Service for HQ Command, Instructors & Medical Officers
 */

export const getTrainingClearancesApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.BASE, { params });
};

export const getTrainingClearanceByIdApi = (id) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.BY_ID(id));
};

export const getCandidateTrainingClearanceApi = (expeditionId, personnelId) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.CANDIDATE(expeditionId, personnelId));
};

export const assignRequiredTrainingApi = (data) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.ASSIGN, data);
};

export const createTrainingClearanceApi = (data) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.BASE, data);
};

export const addTrainingRecordApi = (id, record) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.RECORDS(id), record);
};

export const updateTrainingRecordApi = (id, index, record) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.RECORD_BY_INDEX(id, index), record);
};

export const deleteTrainingRecordApi = (id, index) => {
  return axiosInstance.delete(ENDPOINTS.TRAINING.RECORD_BY_INDEX(id, index));
};

export const verifyTrainingClearanceApi = (id, data = {}) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.VERIFY(id), data);
};

export const completeTrainingClearanceApi = (id) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.COMPLETE(id));
};
