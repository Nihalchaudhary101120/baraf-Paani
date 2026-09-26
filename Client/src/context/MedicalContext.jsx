import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getMedicalOverviewApi,
  getPersonnelMedicalRosterApi,
  getMedicalAssessmentsApi,
  createMedicalAssessmentApi,
  updateMedicalAssessmentApi,
  updateMedicalClearanceApi,
  getPersonnelMedicalHistoryApi,
  getTrainingClearancesApi,
  addTrainingRecordApi,
  completeTrainingClearanceApi,
  getNominatedCandidatesApi
} from '@/api/medical.api';
import { useAuth } from './AuthContext';

const MedicalContext = createContext(null);

export const MedicalProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // ── State Stores ─────────────────────────────────────────────────────────
  const [selectedExpedition, setSelectedExpedition] = useState('EXP-47');
  const [expeditions, setExpeditions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [nominatedCandidates, setNominatedCandidates] = useState([]);
  const [overviewStats, setOverviewStats] = useState({
    totalPersonnel: 0,
    pendingMedical: 0,
    medicallyFit: 0,
    restrictions: 0,
    notFit: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    trainingPartial: 0
  });
  const [stationStats, setStationStats] = useState({
    Maitri: { total: 0, fit: 0, restricted: 0, pending: 0, notFit: 0 },
    Bharati: { total: 0, fit: 0, restricted: 0, pending: 0, notFit: 0 }
  });
  const [alerts, setAlerts] = useState([]);
  const [historyCache, setHistoryCache] = useState({});

  // ── Loading Flags ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState({
    initial: false,
    overview: false,
    roster: false,
    assessments: false,
    trainings: false,
    saving: false,
    history: false
  });

  const isInitialized = useRef(false);

  // Helper to extract data from API response safely (handles both direct payload and axios wrapped)
  const extractData = (res) => {
    if (!res) return null;
    return res.data !== undefined ? res.data : res;
  };

  // ── 1. Fetch Medical Overview & Stats ────────────────────────────────────
  const fetchOverview = useCallback(async (expeditionId = selectedExpedition, silent = false) => {
    if (!silent) setLoading(l => ({ ...l, overview: true }));
    try {
      const rawRes = await getMedicalOverviewApi({ expeditionId });
      const res = extractData(rawRes);
      if (res && (res.success || res.stats)) {
        if (res.stats) setOverviewStats(res.stats);
        if (res.stationStats) setStationStats(res.stationStats);
        if (Array.isArray(res.alerts)) setAlerts(res.alerts);
        if (Array.isArray(res.expeditions) && res.expeditions.length > 0) {
          setExpeditions(res.expeditions);
        }
        return res;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchOverview notice:', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, overview: false }));
    }
    return null;
  }, [selectedExpedition]);

  // ── 2. Fetch Personnel Medical Roster ────────────────────────────────────
  const fetchRoster = useCallback(async (expeditionId = selectedExpedition, silent = false) => {
    if (!silent) setLoading(l => ({ ...l, roster: true }));
    try {
      const rawRes = await getPersonnelMedicalRosterApi({ expeditionId });
      const res = extractData(rawRes);
      if (res && (res.success || Array.isArray(res.roster))) {
        const list = res.roster || [];
        setRoster(list);
        return list;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchRoster notice:', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, roster: false }));
    }
    return [];
  }, [selectedExpedition]);

  // ── 3. Fetch Raw Assessments List ────────────────────────────────────────
  const fetchAssessments = useCallback(async (params = {}, silent = false) => {
    if (!silent) setLoading(l => ({ ...l, assessments: true }));
    try {
      const rawRes = await getMedicalAssessmentsApi({ expeditionId: selectedExpedition, ...params });
      const res = extractData(rawRes);
      if (res && (res.success || Array.isArray(res.assessments))) {
        const list = res.assessments || [];
        setAssessments(list);
        return list;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchAssessments notice:', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, assessments: false }));
    }
    return [];
  }, [selectedExpedition]);

  // ── 4. Fetch Training Clearances ─────────────────────────────────────────
  const fetchTrainings = useCallback(async (params = {}, silent = false) => {
    if (!silent) setLoading(l => ({ ...l, trainings: true }));
    try {
      const rawRes = await getTrainingClearancesApi({ expeditionId: selectedExpedition, ...params });
      const res = extractData(rawRes);
      if (res && (res.success || Array.isArray(res.clearances))) {
        const list = res.clearances || [];
        setTrainings(list);
        return list;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchTrainings notice:', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, trainings: false }));
    }
    return [];
  }, [selectedExpedition]);

  // ── 4b. Fetch Nominated Candidates (for Medical Officer Create Assessment) ─
  const fetchNominatedCandidates = useCallback(async (expeditionId = selectedExpedition, silent = false) => {
    try {
      const rawRes = await getNominatedCandidatesApi({ expeditionId });
      const res = extractData(rawRes);
      if (res && (res.success || Array.isArray(res.candidates))) {
        const list = res.candidates || [];
        setNominatedCandidates(list);
        return list;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchNominatedCandidates notice:', err.message);
    }
    return [];
  }, [selectedExpedition]);

  // ── 5. Fetch Historical Records for a Single Personnel ───────────────────
  const fetchPersonnelHistory = useCallback(async (personnelId, silent = false) => {
    if (historyCache[personnelId]) {
      return historyCache[personnelId];
    }
    if (!silent) setLoading(l => ({ ...l, history: true }));
    try {
      const rawRes = await getPersonnelMedicalHistoryApi(personnelId);
      const res = extractData(rawRes);
      if (res && res.success) {
        const historyData = {
          assessments: res.assessments || [],
          trainings: res.trainings || []
        };
        setHistoryCache(prev => ({ ...prev, [personnelId]: historyData }));
        return historyData;
      }
    } catch (err) {
      console.warn('MedicalContext: fetchPersonnelHistory notice:', err.message);
    } finally {
      if (!silent) setLoading(l => ({ ...l, history: false }));
    }
    return null;
  }, [historyCache]);

  // ── 6. Parallel Pre-fetch for Entire Medical Platform ────────────────────
  const fetchAllMedicalData = useCallback(async (expId = selectedExpedition) => {
    setLoading(l => ({ ...l, initial: true }));
    try {
      await Promise.allSettled([
        fetchOverview(expId, true),
        fetchRoster(expId, true),
        fetchAssessments({ expeditionId: expId }, true),
        fetchTrainings({ expeditionId: expId }, true),
        fetchNominatedCandidates(expId, true)
      ]);
      isInitialized.current = true;
    } finally {
      setLoading(l => ({ ...l, initial: false }));
    }
  }, [fetchOverview, fetchRoster, fetchAssessments, fetchTrainings, fetchNominatedCandidates, selectedExpedition]);

  // Auto pre-fetch on mount / auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllMedicalData(selectedExpedition);
    }
  }, [isAuthenticated, selectedExpedition, fetchAllMedicalData]);

  // ── 7. Optimistic Mutations: Save/Update Medical Assessment ───────────────
  const saveAssessment = useCallback(async (assessmentData) => {
    setLoading(l => ({ ...l, saving: true }));
    try {
      const payload = {
        ...assessmentData,
        medicalHistory: {
          allergies: typeof assessmentData.medicalHistory?.allergies === 'string'
            ? assessmentData.medicalHistory.allergies.split(',').map(s => s.trim()).filter(Boolean)
            : assessmentData.medicalHistory?.allergies || [],
          chronicDiseases: typeof assessmentData.medicalHistory?.chronicDiseases === 'string'
            ? assessmentData.medicalHistory.chronicDiseases.split(',').map(s => s.trim()).filter(Boolean)
            : assessmentData.medicalHistory?.chronicDiseases || [],
          previousSurgeries: typeof assessmentData.medicalHistory?.previousSurgeries === 'string'
            ? assessmentData.medicalHistory.previousSurgeries.split(',').map(s => s.trim()).filter(Boolean)
            : assessmentData.medicalHistory?.previousSurgeries || [],
          currentMedications: typeof assessmentData.medicalHistory?.currentMedications === 'string'
            ? assessmentData.medicalHistory.currentMedications.split(',').map(s => s.trim()).filter(Boolean)
            : assessmentData.medicalHistory?.currentMedications || []
        },
        vaccinations: {
          ...assessmentData.vaccinations,
          others: typeof assessmentData.vaccinations?.others === 'string'
            ? assessmentData.vaccinations.others.split(',').map(s => s.trim()).filter(Boolean)
            : assessmentData.vaccinations?.others || []
        }
      };

      // Optimistic update on local roster state
      setRoster(prev => prev.map(p => {
        if (p.personnelId === payload.personnelId || p.personnelId?._id === payload.personnelId) {
          return {
            ...p,
            medicalStatus: payload.clearance?.status || 'PENDING',
            lastExaminationDate: payload.examinationDate,
            medicalAssessment: {
              ...(p.medicalAssessment || {}),
              ...payload
            }
          };
        }
        return p;
      }));

      const rawRes = await createMedicalAssessmentApi(payload);
      const res = extractData(rawRes);

      // Revalidate in background to keep stats and roster perfectly synchronized
      fetchOverview(selectedExpedition, true);
      fetchRoster(selectedExpedition, true);

      return res;
    } finally {
      setLoading(l => ({ ...l, saving: false }));
    }
  }, [selectedExpedition, fetchOverview, fetchRoster]);

  // ── 8. Optimistic Mutations: Quick Clearance Decision ────────────────────
  const quickUpdateClearance = useCallback(async (personnelId, assessmentId, status, restrictions = [], remarks = '') => {
    // Optimistic roster update
    setRoster(prev => prev.map(p => {
      if (p.personnelId === personnelId || p.personnelId?._id === personnelId) {
        return {
          ...p,
          medicalStatus: status,
          medicalAssessment: {
            ...(p.medicalAssessment || {}),
            clearance: {
              status,
              restrictions: restrictions || [],
              remarks: remarks || `Clearance marked as ${status}`
            }
          }
        };
      }
      return p;
    }));

    if (assessmentId) {
      try {
        await updateMedicalClearanceApi(assessmentId, {
          status,
          restrictions,
          remarks
        });
      } catch (err) {
        console.warn('MedicalContext: quickUpdateClearance error', err.message);
      }
    }
    // Re-sync stats
    fetchOverview(selectedExpedition, true);
  }, [selectedExpedition, fetchOverview]);

  // ── 9. Optimistic Mutations: Add Training Record ──────────────────────────
  const addTraining = useCallback(async (personnelId, clearanceId, record) => {
    // Optimistic local roster training update
    setRoster(prev => prev.map(p => {
      if (p.personnelId === personnelId || p.personnelId?._id === personnelId) {
        const existingTrainings = p.trainingClearance?.trainings || [];
        const updatedTrainings = [...existingTrainings, record];
        const allPassed = updatedTrainings.every(t => t.passed);
        const newOverallStatus = allPassed ? 'COMPLETED' : 'PARTIAL';
        return {
          ...p,
          trainingStatus: newOverallStatus,
          trainingClearance: {
            ...(p.trainingClearance || {}),
            trainings: updatedTrainings,
            overallStatus: newOverallStatus
          }
        };
      }
      return p;
    }));

    if (clearanceId) {
      try {
        await addTrainingRecordApi(clearanceId, record);
      } catch (err) {
        console.warn('MedicalContext: addTraining error', err.message);
      }
    }
    fetchOverview(selectedExpedition, true);
    fetchRoster(selectedExpedition, true);
  }, [selectedExpedition, fetchOverview, fetchRoster]);

  // ── 10. Optimistic Mutations: Complete Training Clearance ────────────────
  const completeTraining = useCallback(async (personnelId, clearanceId) => {
    setRoster(prev => prev.map(p => {
      if (p.personnelId === personnelId || p.personnelId?._id === personnelId) {
        return {
          ...p,
          trainingStatus: 'COMPLETED',
          trainingClearance: {
            ...(p.trainingClearance || {}),
            overallStatus: 'COMPLETED'
          }
        };
      }
      return p;
    }));

    if (clearanceId) {
      try {
        await completeTrainingClearanceApi(clearanceId);
      } catch (err) {
        console.warn('MedicalContext: completeTraining error', err.message);
      }
    }
    fetchOverview(selectedExpedition, true);
    fetchRoster(selectedExpedition, true);
  }, [selectedExpedition, fetchOverview, fetchRoster]);

  // ── Context Value Payload ────────────────────────────────────────────────
  const value = {
    // State
    selectedExpedition,
    setSelectedExpedition,
    expeditions,
    roster,
    assessments,
    trainings,
    nominatedCandidates,
    overviewStats,
    stationStats,
    alerts,
    historyCache,
    loading,
    isInitialized: isInitialized.current,

    // Fetch methods
    fetchOverview,
    fetchRoster,
    fetchAssessments,
    fetchTrainings,
    fetchNominatedCandidates,
    fetchPersonnelHistory,
    fetchAllMedicalData,

    // Mutation helpers
    saveAssessment,
    quickUpdateClearance,
    addTraining,
    completeTraining
  };

  return <MedicalContext.Provider value={value}>{children}</MedicalContext.Provider>;
};

export const useMedicalData = () => {
  const context = useContext(MedicalContext);
  if (!context) {
    throw new Error('useMedicalData must be used within a MedicalProvider');
  }
  return context;
};

export default MedicalContext;
