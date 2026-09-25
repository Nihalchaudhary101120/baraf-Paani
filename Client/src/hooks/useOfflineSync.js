import { useState, useEffect, useCallback } from 'react';
import { getPendingEvents } from '@/services/syncServices/queueService';
import { syncOfflineQueue } from '@/services/syncServices/syncService';

/**
 * useOfflineSync — tracks network state, pending PouchDB event count, and last sync time.
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Poll pending count every 5 seconds
  useEffect(() => {
    const refresh = async () => {
      try {
        const events = await getPendingEvents();
        setPendingCount(events.length);
      } catch {
        // PouchDB may not be ready yet
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const manualSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      setLastSyncTime(new Date());
      // Refresh count after sync
      const events = await getPendingEvents();
      setPendingCount(events.length);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  return { isOnline, pendingCount, lastSyncTime, isSyncing, manualSync };
};
