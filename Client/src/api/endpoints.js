/**
 * API Endpoint Path Definitions
 * All endpoint paths MUST be defined here as constants.
 */

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH_TOKEN: '/auth/refresh',
  },
  USERS: {
    BASE: '/admin/users',
    BY_ID: (id) => `/admin/users/${id}`,
    PROFILE: '/auth/me',
  },
  ADMIN: {
    USERS: '/admin/users',
    USER_STATUS: (id) => `/admin/users/${id}/status`,
    STATS: '/admin/stats',
    DEVICES: '/admin/devices',
    DEVICE_STATUS: (id) => `/admin/devices/${id}/status`,
    COMMAND_OVERVIEW: '/admin/command-overview',
    PERSONNEL_READINESS: '/admin/personnel-readiness',
    EXPEDITIONS: '/admin/expeditions',
    EXPEDITION_BY_ID: (id) => `/admin/expeditions/${id}`,
    EXPEDITION_ASSIGN: (id) => `/admin/expeditions/${id}/assign-personnel`,
    EXPEDITION_NOMINATE: (id) => `/admin/expeditions/${id}/nominate-personnel`,
    EXPEDITION_CANDIDATES: (id) => `/admin/expeditions/${id}/candidates`,
    EXPEDITION_CONFIRM_CANDIDATE: (id, candidateId) => `/admin/expeditions/${id}/confirm-candidate/${candidateId}`,
    EXPEDITION_REMOVE_CANDIDATE: (id, candidateId) => `/admin/expeditions/${id}/candidates/${candidateId}`,
    MEDICAL_RECORDS: '/admin/medical-records',
    CARGO_DATA: '/admin/cargo-data',
    FIELD_OPS: '/admin/field-ops',
    INVENTORY_STATUS: '/admin/inventory-status',
  },
  STATIONS: {
    BASE: '/stations',
    ALL: '/stations',
  },
  PERSONNEL: {
    MY_PROFILE: '/personnel/me',
  },
  CARGO: {
    MANIFESTS: '/cargo/manifests',
    MANIFEST_BY_ID: (id) => `/cargo/manifests/${id}`,
    MANIFEST_STATUS: (id) => `/cargo/manifests/${id}/status`,
  },
  MEDICAL: {
    OVERVIEW: '/medical/overview',
    ROSTER: '/medical/roster',
    NOMINATED_CANDIDATES: '/medical/nominated-candidates',
    ASSESSMENTS: '/medical',
    ASSESSMENT_BY_ID: (id) => `/medical/${id}`,
    CLEARANCE: (id) => `/medical/${id}/clearance`,
    HISTORY: (personnelId) => `/medical/history/${personnelId}`,
  },
  TRAINING: {
    BASE: '/training',
    BY_ID: (id) => `/training/${id}`,
    CANDIDATE: (expId, persId) => `/training/candidate/${expId}/${persId}`,
    ASSIGN: '/training/assign',
    RECORDS: (id) => `/training/${id}/records`,
    RECORD_BY_INDEX: (id, index) => `/training/${id}/records/${index}`,
    VERIFY: (id) => `/training/${id}/verify`,
    COMPLETE: (id) => `/training/${id}/complete`,
  },
  HEALTH: '/health',
};
