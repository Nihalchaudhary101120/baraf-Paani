import { useState, useEffect, useCallback } from 'react';
import { getUsersApi } from '@/api/user.api';
import { extractErrorMessage } from '@/utils/helpers';

/**
 * Custom hook for fetching and managing user list state
 */
export const useUsers = (params = {}) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsersApi(params);
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
  };
};
