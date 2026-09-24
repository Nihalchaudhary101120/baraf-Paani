import { ERROR_MESSAGES } from './constants';

/**
 * Extracts human-readable error message from API error response
 * @param {Object} error - Error object from catch block
 * @returns {string} User-friendly error message
 */
export const extractErrorMessage = (error) => {
  if (!error) return ERROR_MESSAGES.GENERIC_ERROR;
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return typeof error.response.data.error === 'string'
      ? error.response.data.error
      : ERROR_MESSAGES.GENERIC_ERROR;
  }

  if (error.message === 'Network Error') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return error.message || ERROR_MESSAGES.GENERIC_ERROR;
};

/**
 * Conditional classname concatenator helper
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Utility delay function for artificial loading or retry delays
 */
export const sleep = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
