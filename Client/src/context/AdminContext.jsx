import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminUsersApi,
  getAdminStatsApi,
  getDevicesApi,
  getExpeditionsApi,
  getPersonnelReadinessApi,
  getAdminCargoDataApi,
  getAdminFieldOpsApi,
  getAdminInventoryStatusApi,
  getAdminMedicalRecordsApi,
} from '@/api/admin.api';
import { getStationsApi } from '@/api/station.api';
import { useAuth } from './AuthContext';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // ── State Stores ─────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [expeditions, setExpeditions] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [cargoData, setCargoData] = useState(null);
  const [fieldOpsData, setFieldOpsData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [medicalData, setMedicalData] = useState(null);

  // ── Loading Flags ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState({
    users: false,
    stations: false,
    devices: false,
    stats: false,
    expeditions: false,
    personnel: false,
    cargo: false,
    fieldOps: false,
    inventory: false,
    medical: false,
    initial: false,
  });

  const isInitialized = useRef(false);

  // ── Individual Fetchers (with silent background revalidation option) ────

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, users: true }));
    try {
      const res = await getAdminUsersApi();
      if (res && (res.success || Array.isArray(res.users))) {
        setUsers(res.users || []);
        return res.users || [];
      }
    } catch (err) {
      console.warn('AdminContext: fetchUsers error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, users: false }));
    }
    return [];
  }, []);

  const fetchStations = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, stations: true }));
    try {
      const res = await getStationsApi();
      const list = res?.stations || (Array.isArray(res) ? res : []);
      setStations(list);
      return list;
    } catch (err) {
      console.warn('AdminContext: fetchStations error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, stations: false }));
    }
    return [];
  }, []);

  const fetchDevices = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, devices: true }));
    try {
      const res = await getDevicesApi();
      const list = res?.devices || (Array.isArray(res) ? res : []);
      setDevices(list);
      return list;
    } catch (err) {
      console.warn('AdminContext: fetchDevices error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, devices: false }));
    }
    return [];
  }, []);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, stats: true }));
    try {
      const res = await getAdminStatsApi();
      if (res && (res.success || res.stats)) {
        setStats(res);
        return res;
      }
    } catch (err) {
      console.warn('AdminContext: fetchStats error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, stats: false }));
    }
    return null;
  }, []);

  const fetchExpeditions = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, expeditions: true }));
    try {
      const res = await getExpeditionsApi();
      if (res?.expeditions) {
        setExpeditions(res.expeditions);
        return res.expeditions;
      }
    } catch (err) {
      console.warn('AdminContext: fetchExpeditions error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, expeditions: false }));
    }
    return [];
  }, []);

  const fetchPersonnel = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, personnel: true }));
    try {
      const res = await getPersonnelReadinessApi();
      if (res?.personnel) {
        setPersonnel(res.personnel);
        return res.personnel;
      }
    } catch (err) {
      console.warn('AdminContext: fetchPersonnel error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, personnel: false }));
    }
    return [];
  }, []);

  const fetchCargoData = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, cargo: true }));
    try {
      const res = await getAdminCargoDataApi();
      if (res?.success) {
        setCargoData(res);
        return res;
      }
    } catch (err) {
      console.warn('AdminContext: fetchCargoData error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, cargo: false }));
    }
    return null;
  }, []);

  const fetchFieldOpsData = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, fieldOps: true }));
    try {
      const res = await getAdminFieldOpsApi();
      if (res?.success) {
        setFieldOpsData(res);
        return res;
      }
    } catch (err) {
      console.warn('AdminContext: fetchFieldOpsData error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, fieldOps: false }));
    }
    return null;
  }, []);

  const fetchInventoryData = useCallback(async (silent = false) => {
    if (!silent) setLoading(l => ({ ...l, inventory: true }));
    try {
      const res = await getAdminInventoryStatusApi();
      if (res?.success) {
        setInventoryData(res);
        return res;
      }
    } catch (err) {
      console.warn('AdminContext: fetchInventoryData error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, inventory: false }));
    }
    return null;
  }, []);

  const fetchMedicalData = useCallback(async (params = {}, silent = false) => {
    if (!silent) setLoading(l => ({ ...l, medical: true }));
    try {
      const res = await getAdminMedicalRecordsApi(params);
      if (res?.success) {
        setMedicalData(res);
        return res;
      }
    } catch (err) {
      console.warn('AdminContext: fetchMedicalData error', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, medical: false }));
    }
    return null;
  }, []);

  // ── Parallel Pre-fetch for Entire HQ Admin / Command Platform ────────────
  const fetchAllAdminData = useCallback(async () => {
    setLoading(l => ({ ...l, initial: true }));
    try {
      await Promise.allSettled([
        fetchUsers(true),
        fetchStations(true),
        fetchDevices(true),
        fetchStats(true),
        fetchExpeditions(true),
        fetchPersonnel(true),
        fetchCargoData(true),
        fetchInventoryData(true),
        fetchFieldOpsData(true),
        fetchMedicalData({}, true),
      ]);
      isInitialized.current = true;
    } finally {
      setLoading(l => ({ ...l, initial: false }));
    }
  }, [
    fetchUsers,
    fetchStations,
    fetchDevices,
    fetchStats,
    fetchExpeditions,
    fetchPersonnel,
    fetchCargoData,
    fetchInventoryData,
    fetchFieldOpsData,
    fetchMedicalData,
  ]);

  // Trigger pre-fetch when HQ user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role && ['HQ_ADMIN', 'HQ_COMMAND', 'LOGISTICS_OFFICER', 'STATION_COMMANDER'].includes(user.role)) {
      fetchAllAdminData();
    }
  }, [isAuthenticated, user?.role, fetchAllAdminData]);

  // ── Optimistic Update Helpers (Immediate UI updates with zero lag) ────────

  const addUser = useCallback((newUser) => {
    setUsers(prev => [newUser, ...prev]);
    setStats(prev => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          totalUsers: (prev.stats.totalUsers || 0) + 1,
          activeUsers: (prev.stats.activeUsers || 0) + 1,
        }
      };
    });
  }, []);

  const toggleUserStatus = useCallback((userId) => {
    setUsers(prev =>
      prev.map(u => u._id === userId ? { ...u, isActive: !u.isActive } : u)
    );
  }, []);

  const addStation = useCallback((newStation) => {
    setStations(prev => [newStation, ...prev]);
    setStats(prev => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          totalStations: (prev.stats.totalStations || 0) + 1,
        }
      };
    });
  }, []);

  const addDevice = useCallback((newDevice) => {
    setDevices(prev => [newDevice, ...prev]);
    setStats(prev => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          totalDevices: (prev.stats.totalDevices || 0) + 1,
          activeDevices: (prev.stats.activeDevices || 0) + 1,
        }
      };
    });
  }, []);

  const toggleDeviceStatus = useCallback((deviceId, newStatus) => {
    setDevices(prev =>
      prev.map(d => d._id === deviceId ? { ...d, status: newStatus } : d)
    );
  }, []);

  const addExpedition = useCallback((newExp) => {
    setExpeditions(prev => [newExp, ...prev]);
  }, []);

  const updateExpedition = useCallback((expId, updatedFields) => {
    setExpeditions(prev =>
      prev.map(exp => exp._id === expId ? { ...exp, ...updatedFields } : exp)
    );
  }, []);

  const addCargoManifest = useCallback((newManifest) => {
    setCargoData(prev => {
      if (!prev) return { success: true, manifests: [newManifest], checkpoints: [], shipments: [] };
      return {
        ...prev,
        manifests: [newManifest, ...(prev.manifests || [])],
        summary: {
          ...prev.summary,
          totalManifests: (prev.summary?.totalManifests || 0) + 1,
        }
      };
    });
  }, []);

  const value = {
    // State
    users,
    stations,
    devices,
    stats,
    expeditions,
    personnel,
    cargoData,
    fieldOpsData,
    inventoryData,
    medicalData,
    loading,
    isInitialized: isInitialized.current,

    // Fetch methods
    fetchUsers,
    fetchStations,
    fetchDevices,
    fetchStats,
    fetchExpeditions,
    fetchPersonnel,
    fetchCargoData,
    fetchFieldOpsData,
    fetchInventoryData,
    fetchMedicalData,
    fetchAllAdminData,

    // Optimistic mutation helpers
    addUser,
    toggleUserStatus,
    addStation,
    addDevice,
    toggleDeviceStatus,
    addExpedition,
    updateExpedition,
    addCargoManifest,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdminData = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;
