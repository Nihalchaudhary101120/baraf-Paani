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
  HEALTH: '/health',
};
