import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { loginApi, logoutApi, getCurrentUserApi, registerApi } from '@/api/auth.api';
import { STORAGE_KEYS } from '@/utils/constants';
import { storage } from '@/utils/storage';
import { extractErrorMessage } from '@/utils/helpers';

export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getItem(STORAGE_KEYS.USER_DATA));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(user);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCurrentUserApi();
      const userData = data.user || data;
      if (userData) {
        setUser(userData);
        storage.setItem(STORAGE_KEYS.USER_DATA, userData);
      }
    } catch (err) {
      // If fetching fails and no cached user, clear user
      const cached = storage.getItem(STORAGE_KEYS.USER_DATA);
      if (!cached) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      storage.removeItem(STORAGE_KEYS.USER_DATA);
      setError('Session expired. Please log in again.');
    };

    window.addEventListener('app:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('app:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser]);

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await loginApi(credentials);
      const { token: authToken, user: userData } = res;
      
      if (authToken) {
        storage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
      }
      if (userData) {
        storage.setItem(STORAGE_KEYS.USER_DATA, userData);
        setUser(userData);
      }
      return res;
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await registerApi(userData);
      const { token: authToken, user: registeredUser } = res;
      
      if (authToken) {
        storage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
      }
      if (registeredUser) {
        storage.setItem(STORAGE_KEYS.USER_DATA, registeredUser);
        setUser(registeredUser);
      }
      return res;
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      storage.removeItem(STORAGE_KEYS.USER_DATA);
      setUser(null);
      setError(null);
    }
  }, []);

  const clearError = () => setError(null);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
