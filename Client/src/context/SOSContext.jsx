import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as sosApi from '@/api/sos.api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLocationContext } from './LocationContext';
import {
  saveOfflineSOS,
  updateSOSSyncStatus,
  getPendingSyncSOS,
  getAllOfflineSOS,
  clearSOSDraft
} from '@/services/pouchdbService';
import offlineSyncService, { NETWORK_STATUS } from '@/services/offlineSyncService';

const SOSContext = createContext(null);

export const SOSProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();
  const { location, getCurrentLocation, startLocationTracking, stopLocationTracking } = useLocationContext();

  const showToast = useCallback((msg, type = 'info', opts = {}) => {
    if (toast?.showToast) {
      toast.showToast(msg, type, opts);
    } else if (toast?.show) {
      toast.show(msg, type, opts);
    } else if (typeof toast === 'function') {
      toast(msg, type, opts);
    } else {
      console.log(`[Toast ${type}]`, msg);
    }
  }, [toast]);

  const [activeSosList, setActiveSosList] = useState([]);
  const [currentSos, setCurrentSos] = useState(null);
  const [responders, setResponders] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Offline Sync state
  const [syncSnapshot, setSyncSnapshot] = useState({
    status: offlineSyncService.status,
    pendingCount: 0,
    isSyncing: false
  });
  const [offlineSOSList, setOfflineSOSList] = useState([]);

  // Ref to track known SOS IDs to alert on new critical incidents
  const knownSosIdsRef = useRef(new Set());
  const initialFetchDoneRef = useRef(false);

  // Play audio emergency chime for critical alerts
  const playAlertSound = useCallback((severity = 'HIGH') => {
    try {
      if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = severity === 'CRITICAL' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(severity === 'CRITICAL' ? 880 : 660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(severity === 'CRITICAL' ? 440 : 520, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio playback might be restricted before user interaction
    }
  }, []);

  /**
   * Fetch active incidents from backend
   */
  const fetchActiveSOS = useCallback(async (quiet = false) => {
    if (!user) return;
    // When offline, do not attempt network request
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (!quiet) setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.userLat = location.latitude;
        params.userLng = location.longitude;
      }

      const res = await sosApi.getActiveSOS(params);
      const incidents = res?.incidents || res?.data?.incidents || [];

      setActiveSosList(incidents);
      setLastFetched(new Date());
      setError(null);

      // Check for newly triggered critical/high incidents
      if (initialFetchDoneRef.current) {
        incidents.forEach((inc) => {
          if (!knownSosIdsRef.current.has(inc._id)) {
            if (inc.severity === 'CRITICAL' || inc.severity === 'HIGH') {
              playAlertSound(inc.severity);
              showToast(
                `🚨 NEW ${inc.severity} SOS: ${inc.emergencyType.replace('_', ' ')} (${inc.sosNumber})`,
                'error',
                { duration: 7000 }
              );
            }
          }
        });
      }

      // Update known set
      incidents.forEach((inc) => knownSosIdsRef.current.add(inc._id));
      initialFetchDoneRef.current = true;

      // Update currentSos if it's currently selected
      setCurrentSos((prev) => {
        if (!prev) return incidents[0] || null;
        const updated = incidents.find((i) => i._id === prev._id);
        return updated || prev;
      });
    } catch (err) {
      if (!quiet) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch active SOS alerts');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user, location, showToast, playAlertSound]);

  // Subscribe to offlineSyncService: only show pouch-to-db message when succeeded
  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((snapshot) => {
      setSyncSnapshot(snapshot);
      getAllOfflineSOS().then(setOfflineSOSList);
      if (snapshot.syncedCount > 0) {
        showToast(
          `✓ Successfully synchronized ${snapshot.syncedCount} SOS record(s) from local queue to Command database.`,
          'success',
          { duration: 6000 }
        );
        fetchActiveSOS(true);
      }
    });
    return unsubscribe;
  }, [showToast, fetchActiveSOS]);

  /**
   * Fetch responders for a specific SOS
   */
  const fetchSOSResponders = useCallback(async (sosId) => {
    if (!sosId) return [];
    try {
      const res = await sosApi.getResponders(sosId);
      const list = res?.responders || res?.data?.responders || [];
      setResponders(list);
      return list;
    } catch (err) {
      console.warn('[fetchSOSResponders] Error:', err.message);
      return [];
    }
  }, []);

  /**
   * Fetch a single SOS with full timeline and responders
   */
  const fetchSOSById = useCallback(async (id) => {
    if (!id) return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return null;
    }
    setActionLoading(true);
    try {
      const res = await sosApi.getSOSById(id);
      const sosData = res?.sos || res?.data?.sos;
      if (sosData) {
        setCurrentSos(sosData);
        if (sosData.responders) {
          setResponders(sosData.responders);
        }
      }
      return sosData;
    } catch (err) {
      // Do not pop up network error toasts for background detail queries
      console.warn('[fetchSOSById] Telemetry fetch notice:', err.message);
      return null;
    } finally {
      setActionLoading(false);
    }
  }, []);

  /**
   * Sync responders whenever currentSos changes
   */
  useEffect(() => {
    if (currentSos?._id) {
      if (currentSos.responders && currentSos.responders.length > 0) {
        setResponders(currentSos.responders);
      } else {
        fetchSOSResponders(currentSos._id);
      }
    } else {
      setResponders([]);
    }
  }, [currentSos?._id, fetchSOSResponders]);

  /**
   * Create new SOS Incident (Offline-First Flow: Sections 5, 6, 7, 8)
   */
  const createSOS = useCallback(async (payload) => {
    setActionLoading(true);

    // 1. Generate clientIncidentId BEFORE submission (Section 6)
    const clientIncidentId = payload.clientIncidentId || (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sos-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    );

    // 2. Prepare offline PouchDB document (Section 5)
    const offlineRecord = {
      _id: `sos-${clientIncidentId}`,
      type: 'SOS',
      clientIncidentId,
      emergencyType: payload.emergencyType,
      severity: payload.severity || 'HIGH',
      description: payload.description,
      reporter: {
        personnelId: payload.personnelId || user?.personnelId || null,
        userId: user?._id || user?.id,
        name: user?.name || 'Personnel',
        role: user?.role || 'PERSONNEL'
      },
      stationId: payload.stationId || user?.stationId || null,
      expeditionId: payload.expeditionId || user?.expeditionId || null,
      location: {
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        accuracy: payload.accuracy ?? null,
        addressOrDesc: payload.addressOrDesc || (payload.latitude ? 'Coordinates detected' : 'Location unavailable')
      },
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING_SYNC',
      syncAttempts: 0,
      lastSyncAttempt: null,
      lastSyncError: null,
      serverIncidentId: null,
      sosNumber: null
    };

    // 3. Save SOS to local PouchDB / offline store first (Section 7)
    try {
      await saveOfflineSOS(offlineRecord);
    } catch (pouchErr) {
      console.warn('[createSOS] Warning saving to local PouchDB:', pouchErr);
    }

    // 4. If browser is currently offline, don't attempt network call (Section 7 & 8)
    const isNetworkOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isNetworkOffline) {
      try {
        await clearSOSDraft();
      } catch {}

      showToast('🟠 SOS STORED LOCALLY. Waiting for communication...', 'warning', { duration: 8000 });

      try {
        offlineSyncService.syncPendingSOS();
      } catch {}

      setActionLoading(false);
      return {
        success: true,
        offline: true,
        clientIncidentId,
        message: 'SOS stored in local offline queue'
      };
    }

    // 5. Attempt server transmission when online (Section 7)
    try {
      const transmissionPayload = {
        ...payload,
        clientIncidentId,
        offlineCreated: false
      };

      const res = await sosApi.createSOS(transmissionPayload);
      const newSos = res?.sos || res?.data?.sos;

      if (newSos) {
        // Server acknowledged: Mark local record as SYNCED
        try {
          await updateSOSSyncStatus(`sos-${clientIncidentId}`, 'SYNCED', {
            serverIncidentId: newSos._id,
            sosNumber: newSos.sosNumber,
            syncedAt: new Date().toISOString()
          });
        } catch {}

        // Clear active draft (Section 14)
        try {
          await clearSOSDraft();
        } catch {}

        // High priority success confirmation
        showToast(`🟢 SOS TRANSMITTED TO COMMAND: ${newSos.sosNumber}`, 'success', { duration: 6000 });
        playAlertSound('HIGH');

        await fetchActiveSOS(true);
        setCurrentSos(newSos);
        return { success: true, sos: newSos, offline: false };
      }
    } catch (err) {
      // Server reached failed or offline (Section 7 & 8)
      console.warn('[createSOS] Server unreachable, stored in local PouchDB queue:', err.message);

      try {
        await updateSOSSyncStatus(`sos-${clientIncidentId}`, 'PENDING_SYNC', {
          lastSyncError: err.message
        });
      } catch {}

      // Clear draft since it is safely in the offline queue
      try {
        await clearSOSDraft();
      } catch {}

      // Truthful alert: Never falsely claim sent if server did not acknowledge (Section 8)
      showToast('🟠 SOS STORED LOCALLY. Waiting for communication...', 'warning', { duration: 8000 });

      // Trigger sync manager to monitor for network recovery
      try {
        offlineSyncService.syncPendingSOS();
      } catch {}

      return {
        success: true,
        offline: true,
        clientIncidentId,
        message: 'SOS stored in local offline queue'
      };
    } finally {
      setActionLoading(false);
    }
  }, [user, fetchActiveSOS, showToast, playAlertSound]);

  /**
   * Acknowledge SOS (Station Command)
   */
  const acknowledgeSOS = useCallback(async (sosId, notes = '') => {
    setActionLoading(true);
    try {
      const res = await sosApi.acknowledgeSOS(sosId, { notes });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Incident ${updated?.sosNumber || ''} acknowledged.`, 'info');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Error: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Start Assessment (Station Command)
   */
  const assessSOS = useCallback(async (sosId, notes = '') => {
    setActionLoading(true);
    try {
      const res = await sosApi.assessSOS(sosId, { notes });
      const updated = res?.sos || res?.data?.sos;
      showToast('Incident moved to ASSESSING status.', 'info');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Error: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * "I'M RESPONDING" - Automatic Location Capture & Optimistic Volunteer Update
   */
  const volunteerResponse = useCallback(async (sosId, locationData = null, notes = '') => {
    setActionLoading(true);

    // Find incident for target
    const targetIncident = activeSosList.find((s) => s._id === sosId) || currentSos;
    const sosNumber = targetIncident?.sosNumber || 'SOS';

    // 1. Automatically obtain coordinates via browser Geolocation API if not provided
    let finalLocation = locationData;
    let locationAcquired = false;

    if (!finalLocation || !finalLocation.latitude) {
      try {
        const freshLoc = await getCurrentLocation({ enableHighAccuracy: true });
        if (freshLoc && freshLoc.isAvailable && freshLoc.latitude) {
          finalLocation = freshLoc;
          locationAcquired = true;
        } else if (location && location.latitude) {
          finalLocation = location;
          locationAcquired = true;
        }
      } catch {
        finalLocation = location || {};
      }
    } else {
      locationAcquired = true;
    }

    // 2. Optimistic UI update immediately (no page reload)
    const optimisticResponder = {
      _id: `temp-${Date.now()}`,
      sosId,
      userId: user?._id || user?.id,
      name: user?.name || 'Personnel',
      role: user?.role || 'PERSONNEL',
      designation: user?.designation || '',
      qualificationMatch: 'GENERAL',
      status: 'RESPONDING',
      assigned: false,
      teamId: 'UNASSIGNED',
      teamName: 'Not Formally Assigned',
      location: {
        type: 'Point',
        coordinates: finalLocation?.longitude && finalLocation?.latitude ? [finalLocation.longitude, finalLocation.latitude] : [0, 0],
        latitude: finalLocation?.latitude || null,
        longitude: finalLocation?.longitude || null,
        accuracy: finalLocation?.accuracy || null,
        isAvailable: Boolean(finalLocation?.latitude)
      },
      distanceKm: targetIncident?.distanceToUserKm || null,
      volunteeredAt: new Date()
    };

    setActiveSosList((prev) =>
      prev.map((s) => {
        if (s._id === sosId) {
          const prevResponders = s.responders || s.volunteers || [];
          const already = prevResponders.some(
            (r) => (r.userId?._id || r.userId) === (user?._id || user?.id)
          );
          const updatedResponders = already ? prevResponders : [...prevResponders, optimisticResponder];
          return {
            ...s,
            responderCount: (s.responderCount || prevResponders.length) + (already ? 0 : 1),
            responders: updatedResponders,
            volunteers: updatedResponders
          };
        }
        return s;
      })
    );

    if (currentSos?._id === sosId) {
      setCurrentSos((prev) => {
        if (!prev) return prev;
        const prevResponders = prev.responders || prev.volunteers || [];
        const already = prevResponders.some(
          (r) => (r.userId?._id || r.userId) === (user?._id || user?.id)
        );
        const updated = already ? prevResponders : [...prevResponders, optimisticResponder];
        return {
          ...prev,
          responderCount: (prev.responderCount || prevResponders.length) + (already ? 0 : 1),
          responders: updated,
          volunteers: updated
        };
      });
      setResponders((prev) => {
        const already = prev.some((r) => (r.userId?._id || r.userId) === (user?._id || user?.id));
        return already ? prev : [...prev, optimisticResponder];
      });
    }

    try {
      const payload = {
        latitude: finalLocation?.latitude,
        longitude: finalLocation?.longitude,
        accuracy: finalLocation?.accuracy,
        notes
      };

      const res = await sosApi.volunteerResponse(sosId, payload);
      const updated = res?.sos || res?.data?.sos;
      const responder = res?.responder || res?.data?.responder;
      const isLocationAvailable = res?.isLocationAvailable ?? res?.data?.isLocationAvailable;

      showToast(`✓ You are now responding to ${sosNumber}`, 'success');

      if (!isLocationAvailable && !locationAcquired) {
        showToast('⚠ Location unavailable. You are still registered as a responder.', 'warning');
      }

      await fetchActiveSOS(true);
      if (updated) {
        setCurrentSos(updated);
        if (updated.responders) setResponders(updated.responders);
      }
      return { success: true, sos: updated, responder };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('already responding')) {
        showToast('You are already responding to this SOS.', 'warning');
      } else {
        showToast('✕ Unable to register response. Please try again.', 'error');
      }
      // Re-fetch to reconcile state
      await fetchActiveSOS(true);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [activeSosList, currentSos, user, location, getCurrentLocation, fetchActiveSOS, showToast]);

  /**
   * "I'M NO LONGER RESPONDING" - Stand Down Volunteer
   */
  const standDownVolunteer = useCallback(async (sosId, notes = '') => {
    setActionLoading(true);

    // Optimistic UI update
    setActiveSosList((prev) =>
      prev.map((s) => {
        if (s._id === sosId) {
          const prevResponders = (s.responders || s.volunteers || []).filter(
            (r) => (r.userId?._id || r.userId) !== (user?._id || user?.id)
          );
          return {
            ...s,
            responderCount: Math.max(0, (s.responderCount || 1) - 1),
            responders: prevResponders,
            volunteers: prevResponders
          };
        }
        return s;
      })
    );

    if (currentSos?._id === sosId) {
      setCurrentSos((prev) => {
        if (!prev) return prev;
        const prevResponders = (prev.responders || prev.volunteers || []).filter(
          (r) => (r.userId?._id || r.userId) !== (user?._id || user?.id)
        );
        return {
          ...prev,
          responderCount: Math.max(0, (prev.responderCount || 1) - 1),
          responders: prevResponders,
          volunteers: prevResponders
        };
      });
      setResponders((prev) => prev.filter((r) => (r.userId?._id || r.userId) !== (user?._id || user?.id)));
    }

    try {
      const res = await sosApi.standDownResponse(sosId, { notes });
      const updated = res?.sos || res?.data?.sos;
      showToast('You are no longer marked as a responder.', 'info');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Error: ${msg}`, 'error');
      await fetchActiveSOS(true);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [currentSos, user, fetchActiveSOS, showToast]);

  /**
   * Update volunteer progression status (RESPONDING -> ON_THE_WAY -> ON_SITE -> ASSISTING -> STOOD_DOWN)
   */
  const updateResponseStatus = useCallback(async (sosId, status, notes = '', targetUserId = null, responderId = null) => {
    setActionLoading(true);
    try {
      const res = await sosApi.updateVolunteerStatus(sosId, { status, notes, userId: targetUserId, responderId });
      const updated = res?.sos || res?.data?.sos;
      const responder = res?.responder || res?.data?.responder;
      showToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'info');
      await fetchActiveSOS(true);
      if (updated) {
        setCurrentSos(updated);
        if (updated.responders) setResponders(updated.responders);
      }
      return { success: true, sos: updated, responder };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Status update failed: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Assign volunteer to a formal response team (Commander / Operator action)
   */
  const assignResponseTeam = useCallback(async (sosId, { responderId, userId: targetUserId, teamName, teamId, notes }) => {
    setActionLoading(true);
    try {
      const res = await sosApi.assignResponseTeam(sosId, { responderId, userId: targetUserId, teamName, teamId, notes });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Formally assigned to ${teamName || 'Response Team'}`, 'success');
      await fetchActiveSOS(true);
      if (updated) {
        setCurrentSos(updated);
      }
      await fetchSOSResponders(sosId);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Assignment failed: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, fetchSOSResponders, showToast]);

  /**
   * Commander accepts volunteer responder
   */
  const acceptResponder = useCallback(async (sosId, volunteerId, notes = '') => {
    setActionLoading(true);
    try {
      const res = await sosApi.acceptResponder(sosId, { volunteerId, notes });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Responder accepted and response assigned.`, 'success');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Failed to accept responder: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Commander declines volunteer responder
   */
  const declineVolunteer = useCallback(async (sosId, volunteerId, reason = '') => {
    setActionLoading(true);
    try {
      const res = await sosApi.declineVolunteer(sosId, { volunteerId, reason });
      const updated = res?.sos || res?.data?.sos;
      showToast('Volunteer offer declined.', 'info');
      await fetchActiveSOS(true);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Error: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Commander manually assigns responder
   */
  const assignResponder = useCallback(async (sosId, { userId: targetUserId, personnelId, notes }) => {
    setActionLoading(true);
    try {
      const res = await sosApi.assignResponder(sosId, { userId: targetUserId, personnelId, notes });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Responder successfully assigned to incident.`, 'success');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Assignment failed: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Update incident lifecycle status (e.g. RESPONDER_DISPATCHED, ON_SITE, STABILIZED)
   */
  const updateStatus = useCallback(async (sosId, status, notes = '') => {
    setActionLoading(true);
    try {
      const res = await sosApi.updateSOSStatus(sosId, { status, notes });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'info');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Status update failed: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Update live responder coordinates
   */
  const updateResponderLocation = useCallback(async (sosId, locData) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true };
    }
    try {
      const res = await sosApi.updateResponderLocation(sosId, {
        latitude: locData.latitude,
        longitude: locData.longitude,
        accuracy: locData.accuracy
      });
      return { success: true, data: res.data };
    } catch (err) {
      console.warn('[updateResponderLocation] Error updating telemetry:', err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Resolve incident formally
   */
  const resolveSOS = useCallback(async (sosId, resolutionNotes, outcome = 'STABILIZED_AND_SAFE') => {
    setActionLoading(true);
    try {
      const res = await sosApi.resolveSOS(sosId, { resolutionNotes, outcome });
      const updated = res?.sos || res?.data?.sos;
      showToast(`Emergency incident successfully resolved and closed.`, 'success');
      await fetchActiveSOS(true);
      if (updated) setCurrentSos(updated);
      return { success: true, sos: updated };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Failed to resolve incident: ${msg}`, 'error');
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  }, [fetchActiveSOS, showToast]);

  /**
   * Fetch candidates for manual assignment
   */
  const fetchCandidates = useCallback(async (sosId) => {
    if (!sosId) return [];
    try {
      const res = await sosApi.getNearbyCandidates(sosId);
      const list = res?.candidates || res?.data?.candidates || [];
      setCandidates(list);
      return list;
    } catch (err) {
      console.warn('[fetchCandidates] Error:', err.message);
      return [];
    }
  }, []);

  // Poll active incidents every 4 seconds while user is logged in
  useEffect(() => {
    if (!user) return;
    fetchActiveSOS(false);

    const interval = setInterval(() => {
      fetchActiveSOS(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [user, fetchActiveSOS]);

  // Manage live tracking for responding or assigned personnel automatically
  useEffect(() => {
    if (!user || !activeSosList.length) return;

    // Check if current user is responding or assigned to an active unresolved incident
    const activeRespondingSos = activeSosList.find((sos) => {
      if (sos.status === 'RESOLVED' || sos.status === 'CANCELLED') return false;
      const isAssigned =
        (sos.assignedResponder?.userId?._id || sos.assignedResponder?.userId)?.toString() === user._id?.toString();
      const isVolunteered = (sos.responders || sos.volunteers || []).some(
        (r) =>
          (r.userId?._id || r.userId)?.toString() === user._id?.toString() &&
          r.status !== 'STOOD_DOWN'
      );
      return isAssigned || isVolunteered;
    });

    if (activeRespondingSos) {
      // Start location watch and stream coordinates
      startLocationTracking((locData) => {
        updateResponderLocation(activeRespondingSos._id, locData);
      });
    } else {
      stopLocationTracking();
    }
  }, [user, activeSosList, startLocationTracking, stopLocationTracking, updateResponderLocation]);

  // Check current user's response status for currentSos
  const myResponseRecord = useMemo(() => {
    if (!user || !currentSos) return null;
    const all = currentSos.responders || currentSos.volunteers || [];
    return all.find(
      (r) =>
        (r.userId?._id || r.userId)?.toString() === user._id?.toString() &&
        r.status !== 'STOOD_DOWN'
    ) || null;
  }, [user, currentSos]);

  const myResponseStatus = myResponseRecord ? myResponseRecord.status : null;

  // Computed helper states
  const myActiveSos = activeSosList.find(
    (sos) =>
      (sos.userId?._id || sos.userId)?.toString() === user?._id?.toString()
  );

  const myRespondingSos = activeSosList.find((sos) => {
    const isAssigned =
      (sos.assignedResponder?.userId?._id || sos.assignedResponder?.userId)?.toString() === user?._id?.toString();
    const isVol = (sos.responders || sos.volunteers || []).some(
      (v) =>
        (v.userId?._id || v.userId)?.toString() === user?._id?.toString() &&
        v.status !== 'STOOD_DOWN'
    );
    return isAssigned || isVol;
  });

  const value = {
    // State
    activeSosList,
    activeSOS: activeSosList,
    sosFeed: activeSosList,
    currentSos,
    selectedSOS: currentSos,
    setCurrentSos,
    responders,
    myResponseRecord,
    myResponseStatus,
    candidates,
    loading,
    actionLoading,
    error,
    lastFetched,
    myActiveSos,
    myRespondingSos,

    // Offline Queue & Sync State (Sections 5-11, 17)
    networkStatus: syncSnapshot.status,
    pendingSyncCount: syncSnapshot.pendingCount,
    isSyncing: syncSnapshot.isSyncing,
    offlineSOSList,
    syncNow: () => offlineSyncService.syncNow(),

    // Methods
    fetchActiveSOS,
    fetchSOSById,
    fetchSOSDetails: fetchSOSById,
    fetchSOSResponders,
    createSOS,
    triggerSOS: createSOS,
    acknowledgeSOS,
    assessSOS,
    volunteerResponse,
    volunteerForSOS: volunteerResponse,
    standDownVolunteer,
    removeVolunteer: standDownVolunteer,
    updateResponseStatus,
    assignResponseTeam,
    acceptResponder,
    declineVolunteer,
    assignResponder,
    updateStatus,
    updateResponderLocation,
    resolveSOS,
    fetchCandidates,
    playAlertSound
  };

  return (
    <SOSContext.Provider value={value}>
      {children}
    </SOSContext.Provider>
  );
};

export const useSOSContext = () => {
  const context = useContext(SOSContext);
  if (!context) {
    throw new Error('useSOSContext must be used within an SOSProvider');
  }
  return context;
};

export default SOSContext;
