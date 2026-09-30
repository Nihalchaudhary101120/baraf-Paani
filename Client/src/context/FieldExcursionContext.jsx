import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getActiveExcursions,
  getExcursionHistory,
  getMyActiveExcursions,
  getExcursionById,
  createExcursion as createExcursionApi,
  startExcursion as startExcursionApi,
  markExcursionReturned as markExcursionReturnedApi,
  cancelExcursion as cancelExcursionApi,
  submitCheckIn as submitCheckInApi,
  getCheckIns as getCheckInsApi,
  getLatestCheckIns as getLatestCheckInsApi
} from '@/api/field.api';
import { getAllPersonnelApi } from '@/api/personnel.api';
import { useToast } from './ToastContext';
import { queueEvent } from '@/services/syncServices/queueService';

const FieldExcursionContext = createContext(null);

export const useFieldExcursion = () => {
  const context = useContext(FieldExcursionContext);
  if (!context) {
    throw new Error('useFieldExcursion must be used within a FieldExcursionProvider');
  }
  return context;
};

export const FieldExcursionProvider = ({ children }) => {
  const toast = useToast();

  const notify = useCallback((msg, type = 'success') => {
    if (toast?.[type]) toast[type](msg);
    else if (toast?.showToast) toast.showToast(msg, type);
    else if (toast?.show) toast.show(msg, type);
  }, [toast]);

  const [activeExcursions, setActiveExcursions] = useState([]);
  const [history, setHistory] = useState([]);
  const [myActiveExcursions, setMyActiveExcursions] = useState([]);
  const [selectedExcursion, setSelectedExcursion] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [latestCheckIns, setLatestCheckIns] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [summary, setSummary] = useState({ active: 0, overdue: 0, planned: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch Active Excursions (Station Operator / Command)
  const fetchActive = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getActiveExcursions(params);
      const data = res?.data || res || {};
      const list = data.excursions || [];
      setActiveExcursions(list);
      if (data.summary) {
        setSummary(data.summary);
      }
      return list;
    } catch (err) {
      console.error('Fetch active excursions error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to fetch active excursions';
      setError(errMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Excursion History (Completed & Cancelled)
  const fetchHist = useCallback(async (params = {}) => {
    try {
      const res = await getExcursionHistory(params);
      const data = res?.data || res || {};
      const list = data.excursions || [];
      setHistory(list);
      return list;
    } catch (err) {
      console.error('Fetch excursion history error:', err);
      return [];
    }
  }, []);

  // 3. Fetch My Assigned Active Excursions (Personnel)
  const fetchMyActive = useCallback(async () => {
    try {
      const res = await getMyActiveExcursions();
      const data = res?.data || res || {};
      const list = data.excursions || [];
      setMyActiveExcursions(list);
      return list;
    } catch (err) {
      console.error('Fetch my active excursions error:', err);
      return [];
    }
  }, []);

  // 4. Fetch Personnel List for Station Operator assignment dropdowns
  const fetchPersonnel = useCallback(async (stationId) => {
    try {
      const params = stationId ? { stationId } : {};
      const res = await getAllPersonnelApi(params);
      const data = res?.data || res || {};
      const list = data.personnel || [];
      setPersonnelList(list);
      return list;
    } catch (err) {
      console.error('Fetch personnel error:', err);
      return [];
    }
  }, []);

  // 5. Fetch Excursion Details
  const fetchExcursionDetails = useCallback(async (id) => {
    try {
      const res = await getExcursionById(id);
      const exc = res?.data?.excursion || res?.excursion;
      if (exc) {
        setSelectedExcursion(exc);
      }
      return exc;
    } catch (err) {
      console.error('Fetch excursion details error:', err);
      return null;
    }
  }, []);

  // 6. Fetch Check-Ins for Excursion
  const fetchCheckIns = useCallback(async (id) => {
    try {
      const res = await getCheckInsApi(id);
      const list = res?.data?.checkIns || res?.checkIns || [];
      setCheckIns(list);
      return list;
    } catch (err) {
      console.error('Fetch check-ins error:', err);
      return [];
    }
  }, []);

  // 7. Fetch Latest Check-In Per Member + Delay Status
  const fetchLatestCheckIns = useCallback(async (id) => {
    try {
      const res = await getLatestCheckInsApi(id);
      const data = res?.data || res || {};
      const members = data.members || [];
      setLatestCheckIns(members);
      return members;
    } catch (err) {
      console.error('Fetch latest check-ins error:', err);
      return [];
    }
  }, []);

  // 8. Create Excursion (Station Operator)
  const createExcursion = useCallback(async (payload) => {
    try {
      setLoading(true);
      const res = await createExcursionApi(payload);
      const created = res?.data?.excursion || res?.excursion;
      if (created) {
        setActiveExcursions(prev => [created, ...prev]);
        setSummary(prev => ({
          ...prev,
          planned: (prev.planned || 0) + 1,
          total: (prev.total || 0) + 1
        }));
        notify('Field excursion created successfully.', 'success');
        return { success: true, excursion: created };
      }
      return { success: false };
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to create field excursion';
      notify(`Failed to create excursion: ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  }, [notify]);

  // 9. Start Excursion: PLANNED -> ACTIVE
  const startExcursion = useCallback(async (id) => {
    try {
      const res = await startExcursionApi(id);
      const updated = res?.data?.excursion || res?.excursion;
      if (updated) {
        setActiveExcursions(prev => prev.map(e => e._id === id ? updated : e));
        if (selectedExcursion?._id === id) {
          setSelectedExcursion(updated);
        }
        setSummary(prev => ({
          ...prev,
          planned: Math.max(0, (prev.planned || 0) - 1),
          active: (prev.active || 0) + 1
        }));
        notify('Excursion started successfully.', 'success');
        return { success: true, excursion: updated };
      }
      return { success: false };
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to start excursion';
      notify(`Failed to start excursion: ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  }, [notify, selectedExcursion]);

  // 10. Mark Returned: ACTIVE/OVERDUE -> COMPLETED
  const markReturned = useCallback(async (id) => {
    try {
      const res = await markExcursionReturnedApi(id);
      const completed = res?.data?.excursion || res?.excursion;
      if (completed) {
        // Remove from active list
        setActiveExcursions(prev => prev.filter(e => e._id !== id));
        // Add to history
        setHistory(prev => [completed, ...prev]);
        if (selectedExcursion?._id === id) {
          setSelectedExcursion(completed);
        }
        setSummary(prev => ({
          ...prev,
          active: Math.max(0, (prev.active || 0) - 1),
          completed: (prev.completed || 0) + 1,
          total: Math.max(0, (prev.total || 0) - 1)
        }));
        notify('Excursion marked as returned.', 'success');
        return { success: true, excursion: completed };
      }
      return { success: false };
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to mark excursion as returned';
      notify(`Failed to update excursion: ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  }, [notify, selectedExcursion]);

  // 11. Cancel Excursion: PLANNED -> CANCELLED
  const cancelExcursion = useCallback(async (id) => {
    try {
      const res = await cancelExcursionApi(id);
      const cancelled = res?.data?.excursion || res?.excursion;
      if (cancelled) {
        setActiveExcursions(prev => prev.filter(e => e._id !== id));
        setHistory(prev => [cancelled, ...prev]);
        if (selectedExcursion?._id === id) {
          setSelectedExcursion(cancelled);
        }
        setSummary(prev => ({
          ...prev,
          planned: Math.max(0, (prev.planned || 0) - 1),
          total: Math.max(0, (prev.total || 0) - 1)
        }));
        notify('Excursion cancelled successfully.', 'success');
        return { success: true, excursion: cancelled };
      }
      return { success: false };
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to cancel excursion';
      notify(`Failed to cancel excursion: ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  }, [notify, selectedExcursion]);

  // 12. Submit Field Check-In (Online or Offline Queue)
  const submitCheckIn = useCallback(async (excursionId, payload) => {
    try {
      if (navigator.onLine) {
        const res = await submitCheckInApi(excursionId, payload);
        const checkIn = res?.data?.checkIn || res?.checkIn;
        if (checkIn) {
          setCheckIns(prev => [checkIn, ...prev]);
          // Refresh latest check-in status
          fetchLatestCheckIns(excursionId);
        }
        notify('Check-in submitted successfully.', 'success');
        return { success: true, checkIn };
      } else {
        // Queue locally via PouchDB offline architecture (backed by IndexedDB)
        const queuedDoc = await queueEvent({
          type: 'FIELD_CHECK_IN',
          excursionId,
          payload: {
            excursionId,
            location: payload.location || { latitude: payload.latitude, longitude: payload.longitude },
            latitude: payload.latitude,
            longitude: payload.longitude,
            temperature: payload.temperature,
            batteryLevel: payload.batteryLevel,
            notes: payload.notes,
            networkAvailable: false,
          },
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          retryCount: 0,
        });
        notify('Check-in saved offline. It will sync when connectivity returns.', 'info');
        return { success: true, offlineQueued: true, queuedDoc };
      }
    } catch (err) {
      // If network dropped mid-request, queue locally
      if (!err.response || err.code === 'ERR_NETWORK') {
        const queuedDoc = await queueEvent({
          type: 'FIELD_CHECK_IN',
          excursionId,
          payload: {
            excursionId,
            location: payload.location || { latitude: payload.latitude, longitude: payload.longitude },
            latitude: payload.latitude,
            longitude: payload.longitude,
            temperature: payload.temperature,
            batteryLevel: payload.batteryLevel,
            notes: payload.notes,
            networkAvailable: false,
          },
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          retryCount: 0,
        });
        notify('Check-in saved offline. It will sync when connectivity returns.', 'info');
        return { success: true, offlineQueued: true, queuedDoc };
      }

      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit check-in';
      notify(`Check-in failed: ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  }, [notify, fetchLatestCheckIns]);

  // Refresh All
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchActive(),
      fetchHist(),
      fetchMyActive()
    ]);
  }, [fetchActive, fetchHist, fetchMyActive]);

  useEffect(() => {
    refreshAll();
    fetchPersonnel();
  }, [refreshAll, fetchPersonnel]);

  // Listen for sync completion/error events dispatched by syncService
  useEffect(() => {
    const handleSyncComplete = (e) => {
      if (e.detail?.checkInsSynced > 0) {
        notify('Offline check-in synced successfully.', 'success');
        refreshAll();
        if (selectedExcursion) {
          fetchCheckIns(selectedExcursion._id);
          fetchLatestCheckIns(selectedExcursion._id);
        }
      }
    };

    const handleSyncError = (e) => {
      if (e.detail?.isPermanent && ['FIELD_CHECK_IN', 'FIELD_CHECKIN'].includes(e.detail?.event?.type)) {
        notify('Check-in could not be synchronized.', 'error');
      }
    };

    window.addEventListener('nirantra:sync-complete', handleSyncComplete);
    window.addEventListener('nirantra:sync-error', handleSyncError);
    return () => {
      window.removeEventListener('nirantra:sync-complete', handleSyncComplete);
      window.removeEventListener('nirantra:sync-error', handleSyncError);
    };
  }, [notify, refreshAll, selectedExcursion, fetchCheckIns, fetchLatestCheckIns]);

  const value = {
    activeExcursions,
    history,
    myActiveExcursions,
    selectedExcursion,
    setSelectedExcursion,
    checkIns,
    latestCheckIns,
    personnelList,
    summary,
    loading,
    error,
    fetchActiveExcursions: fetchActive,
    fetchHistory: fetchHist,
    fetchMyActiveExcursions: fetchMyActive,
    fetchPersonnel,
    fetchExcursionDetails,
    fetchCheckIns,
    fetchLatestCheckIns,
    createExcursion,
    startExcursion,
    markReturned,
    cancelExcursion,
    submitCheckIn,
    refreshAll
  };

  return (
    <FieldExcursionContext.Provider value={value}>
      {children}
    </FieldExcursionContext.Provider>
  );
};
