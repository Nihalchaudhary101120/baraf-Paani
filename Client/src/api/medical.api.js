import axiosInstance from './axiosInstance';
import { ENDPOINTS } from './endpoints';

/**
 * Medical & Training API Service for Medical Officer & Command roles
 */

// Overview summary and live medical alerts
export const getMedicalOverviewApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.OVERVIEW, { params });
};

// Composite roster of personnel + medical + training (nominees only)
export const getPersonnelMedicalRosterApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.ROSTER, { params });
};

// Nominated candidates for a specific expedition (for Medical Officer dropdown)
export const getNominatedCandidatesApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.NOMINATED_CANDIDATES, { params });
};

// List assessments with filters
export const getMedicalAssessmentsApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.ASSESSMENTS, { params });
};

// Get single assessment by ID
export const getMedicalAssessmentByIdApi = (id) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.ASSESSMENT_BY_ID(id));
};

// Create or update assessment
export const createMedicalAssessmentApi = (data) => {
  return axiosInstance.post(ENDPOINTS.MEDICAL.ASSESSMENTS, data);
};

// Update assessment by ID
export const updateMedicalAssessmentApi = (id, data) => {
  return axiosInstance.put(ENDPOINTS.MEDICAL.ASSESSMENT_BY_ID(id), data);
};

// Update medical clearance decision
export const updateMedicalClearanceApi = (id, data) => {
  return axiosInstance.patch(ENDPOINTS.MEDICAL.CLEARANCE(id), data);
};

// Get personnel historical assessments across expeditions
export const getPersonnelMedicalHistoryApi = (personnelId) => {
  return axiosInstance.get(ENDPOINTS.MEDICAL.HISTORY(personnelId));
};

// ── TRAINING CLEARANCES ──

// List training clearances
export const getTrainingClearancesApi = (params = {}) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.BASE, { params });
};

// Get training clearance by ID
export const getTrainingClearanceByIdApi = (id) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.BY_ID(id));
};

// Get training clearance for a candidate
export const getCandidateTrainingClearanceApi = (expeditionId, personnelId) => {
  return axiosInstance.get(ENDPOINTS.TRAINING.CANDIDATE(expeditionId, personnelId));
};

// Assign required training modules for a candidate
export const assignRequiredTrainingApi = (data) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.ASSIGN, data);
};

// Create training clearance
export const createTrainingClearanceApi = (data) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.BASE, data);
};

// Add / Record training result
export const addTrainingRecordApi = (id, record) => {
  return axiosInstance.post(ENDPOINTS.TRAINING.RECORDS(id), record);
};

// Update training record
export const updateTrainingRecordApi = (id, index, record) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.RECORD_BY_INDEX(id, index), record);
};

// Delete training record
export const deleteTrainingRecordApi = (id, index) => {
  return axiosInstance.delete(ENDPOINTS.TRAINING.RECORD_BY_INDEX(id, index));
};

// HQ Command Verify Training Clearance
export const verifyTrainingClearanceApi = (id, data = {}) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.VERIFY(id), data);
};

// Complete training clearance
export const completeTrainingClearanceApi = (id) => {
  return axiosInstance.patch(ENDPOINTS.TRAINING.COMPLETE(id));
};

