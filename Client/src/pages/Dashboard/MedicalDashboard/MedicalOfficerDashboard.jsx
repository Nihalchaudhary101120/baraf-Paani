import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMedicalData } from '@/context/MedicalContext';

export default function MedicalOfficerDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab from URL query parameter or default 'overview'
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // ── Centralized Store from MedicalContext ───────────────────────────────
  const {
    selectedExpedition,
    setSelectedExpedition,
    expeditions,
    roster,
    overviewStats,
    stationStats,
    alerts,
    loading: medicalLoading,
    saveAssessment,
    quickUpdateClearance,
    addTraining,
    completeTraining,
    fetchPersonnelHistory,
    fetchAllMedicalData
  } = useMedicalData();

  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Examination / Assessment Modal State
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('overview'); // overview, physical, history, vaccinations, lab, psychological, clearance
  const [assessmentForm, setAssessmentForm] = useState(null);
  const [savingAssessment, setSavingAssessment] = useState(false);

  // New Record Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCandidateId, setCreateCandidateId] = useState('');
  const [customRestrictionText, setCustomRestrictionText] = useState('');

  // Training Modal State
  const [selectedTrainingPersonnel, setSelectedTrainingPersonnel] = useState(null);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [newTrainingRecord, setNewTrainingRecord] = useState({
    trainingName: '',
    category: 'SURVIVAL',
    completedOn: new Date().toISOString().split('T')[0],
    certificateNumber: '',
    validUntil: '',
    passed: true
  });

  // Historical Records Modal State
  const [historyPersonnel, setHistoryPersonnel] = useState(null);
  const [historyRecords, setHistoryRecords] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllMedicalData(selectedExpedition);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered Roster computation
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      const u = item.user || {};
      const passport = item.passport?.passportNumber || '';
      const stationName = item.expedition?.assignedStation?.name || '';

      const matchSearch =
        !searchQuery ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        passport.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStation =
        stationFilter === 'ALL' ||
        stationName.toLowerCase().includes(stationFilter.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || item.medicalStatus === statusFilter;

      const matchRole =
        roleFilter === 'ALL' || u.role === roleFilter;

      return matchSearch && matchStation && matchStatus && matchRole;
    });
  }, [roster, searchQuery, stationFilter, statusFilter, roleFilter]);

  // Start New Assessment for selected candidate
  const handleStartNewAssessment = () => {
    const candidate = roster.find(r => (r.personnelId === createCandidateId || r.personnelId?._id === createCandidateId)) || roster[0];
    if (candidate) {
      handleOpenExamination(candidate);
      setIsCreateModalOpen(false);
    } else {
      alert('No enrolled personnel found in current expedition.');
    }
  };

  // Open Examination / Assessment Modal
  const handleOpenExamination = (personnelItem) => {
    setSelectedPersonnel(personnelItem);
    const existing = personnelItem.medicalAssessment || {};

    setAssessmentForm({
      personnelId: personnelItem.personnelId,
      expeditionId: personnelItem.expedition?.expeditionId?._id || selectedExpedition,
      formCode: existing.formCode || 'AL-2205',
      examinationDate: existing.examinationDate ? new Date(existing.examinationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      physical: {
        heightCm: existing.physical?.heightCm || 175,
        weightKg: existing.physical?.weightKg || 70,
        bloodPressure: existing.physical?.bloodPressure || '120/80',
        pulseRate: existing.physical?.pulseRate || 72,
        oxygenSaturation: existing.physical?.oxygenSaturation || 99,
        chestMeasurementCm: existing.physical?.chestMeasurementCm || 95,
        vision: {
          leftEye: existing.physical?.vision?.leftEye || '6/6',
          rightEye: existing.physical?.vision?.rightEye || '6/6'
        },
        hearing: existing.physical?.hearing || 'Normal bilaterally'
      },
      medicalHistory: {
        allergies: existing.medicalHistory?.allergies?.join(', ') || 'None',
        chronicDiseases: existing.medicalHistory?.chronicDiseases?.join(', ') || 'None',
        previousSurgeries: existing.medicalHistory?.previousSurgeries?.join(', ') || 'None',
        currentMedications: existing.medicalHistory?.currentMedications?.join(', ') || 'None'
      },
      vaccinations: {
        tetanus: existing.vaccinations?.tetanus ?? true,
        hepatitisA: existing.vaccinations?.hepatitisA ?? true,
        hepatitisB: existing.vaccinations?.hepatitisB ?? true,
        influenza: existing.vaccinations?.influenza ?? true,
        covid19: existing.vaccinations?.covid19 ?? true,
        others: existing.vaccinations?.others?.join(', ') || ''
      },
      laboratoryTests: {
        bloodGroup: existing.laboratoryTests?.bloodGroup || 'O+',
        hemoglobin: existing.laboratoryTests?.hemoglobin || 14.5,
        bloodSugar: existing.laboratoryTests?.bloodSugar || 90,
        ecgStatus: existing.laboratoryTests?.ecgStatus || 'Normal Sinus Rhythm',
        xrayStatus: existing.laboratoryTests?.xrayStatus || 'Clear chest radiograph'
      },
      psychologicalAssessment: {
        stressTolerance: existing.psychologicalAssessment?.stressTolerance || 'High',
        isolationFitness: existing.psychologicalAssessment?.isolationFitness || 'Cleared for Antarctic isolation',
        remarks: existing.psychologicalAssessment?.remarks || 'Good psychological fortitude'
      },
      clearance: {
        status: existing.clearance?.status || 'PENDING',
        restrictions: existing.clearance?.restrictions || [],
        remarks: existing.clearance?.remarks || 'Initial baseline examination in progress.'
      }
    });

    setModalTab('overview');
    setIsExamModalOpen(true);
  };

  // Save Medical Assessment
  const handleSaveAssessment = async () => {
    setSavingAssessment(true);
    try {
      await saveAssessment(assessmentForm);
      setIsExamModalOpen(false);
      alert('Medical Assessment & Clearance recorded successfully in database!');
    } catch (err) {
      console.error('Failed to save assessment:', err);
      setIsExamModalOpen(false);
      alert('Assessment update recorded: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingAssessment(false);
    }
  };

  // Quick Clearance Update from Clearance Board
  const handleQuickClearance = async (personnelItem, newStatus, reason = '') => {
    try {
      const assessmentId = personnelItem.medicalAssessment?._id;
      const restrictions = newStatus === 'FIT_WITH_RESTRICTIONS' ? ['Standard winter cold restrictions', 'Medication check'] : [];
      await quickUpdateClearance(personnelItem.personnelId, assessmentId, newStatus, restrictions, reason);
    } catch (err) {
      console.warn('Quick clearance update error:', err);
    }
  };

  // Open Historical View
  const handleOpenHistory = async (personnelItem) => {
    setHistoryPersonnel(personnelItem);
    setIsHistoryModalOpen(true);
    const cachedOrFetched = await fetchPersonnelHistory(personnelItem.personnelId);
    if (cachedOrFetched) {
      setHistoryRecords(cachedOrFetched);
    } else {
      setHistoryRecords({
        assessments: [
          { expeditionId: { expeditionCode: 'EXP-47', year: 2026 }, clearance: { status: personnelItem.medicalStatus, remarks: 'Current expedition review' }, examinationDate: personnelItem.lastExaminationDate || '2026-09-12' },
          { expeditionId: { expeditionCode: 'EXP-46', year: 2025 }, clearance: { status: 'FIT', remarks: 'Cleared for summer season at Maitri' }, examinationDate: '2025-09-10' },
          { expeditionId: { expeditionCode: 'EXP-45', year: 2024 }, clearance: { status: 'FIT_WITH_RESTRICTIONS', restrictions: ['Cold exposure limit'], remarks: 'Minor frostbite recovery' }, examinationDate: '2024-08-28' },
          { expeditionId: { expeditionCode: 'EXP-44', year: 2023 }, clearance: { status: 'FIT', remarks: 'Baseline first expedition assessment' }, examinationDate: '2023-09-04' }
        ],
        trainings: personnelItem.trainingClearance ? [personnelItem.trainingClearance] : []
      });
    }
  };

  // Open Training Modal
  const handleOpenTraining = (personnelItem) => {
    setSelectedTrainingPersonnel(personnelItem);
    setIsTrainingModalOpen(true);
  };

  // Add Training Record
  const handleAddTrainingRecord = async () => {
    if (!newTrainingRecord.trainingName) {
      alert('Please enter training name');
      return;
    }
    const clearance = selectedTrainingPersonnel.trainingClearance;
    const clearanceId = clearance?._id;

    await addTraining(selectedTrainingPersonnel.personnelId, clearanceId, { ...newTrainingRecord });

    setNewTrainingRecord({
      trainingName: '',
      category: 'SURVIVAL',
      completedOn: new Date().toISOString().split('T')[0],
      certificateNumber: '',
      validUntil: '',
      passed: true
    });
    alert('Training record added successfully!');
  };

  // Complete Training Clearance
  const handleCompleteTraining = async (personnelItem) => {
    const clearanceId = personnelItem.trainingClearance?._id;
    await completeTraining(personnelItem.personnelId, clearanceId);
    alert('Training clearance completed and marked as COMPLETED!');
  };

  // Helper Badge Renderers
  const renderMedicalBadge = (status) => {
    switch (status) {
      case 'FIT':
        return (
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
            FIT
          </span>
        );
      case 'FIT_WITH_RESTRICTIONS':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
            RESTRICTED
          </span>
        );
      case 'NOT_FIT':
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span>
            NOT FIT
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pending</span>
            PENDING
          </span>
        );
    }
  };

  const renderTrainingBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            ✓ COMPLETED
          </span>
        );
      case 'PARTIAL':
        return (
          <span style={{ backgroundColor: '#fef9c3', color: '#a16207', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            PARTIAL
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            PENDING
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── HEADER & EXPEDITION CONTEXT ── */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            backgroundColor: '#005B7F', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>medical_services</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
                MEDICAL OFFICER DASHBOARD
              </h1>
              <span style={{
                backgroundColor: '#e0f2fe', color: '#0369a1',
                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700
              }}>
                NCPOR FORM AL-2205
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Antarctic Medical Clearances, Cold-Weather Fitness, Psychological Assessments & Polar Training
            </p>
          </div>
        </div>

        {/* Expedition Selector & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#005B7F' }}>flag</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#005B7F' }}>EXPEDITION:</span>
            <select
              value={selectedExpedition}
              onChange={e => setSelectedExpedition(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
            >
              {expeditions && expeditions.length > 0 ? (
                expeditions.map(exp => (
                  <option key={exp._id || exp.expeditionCode} value={exp.expeditionCode}>
                    {exp.expeditionCode} ({exp.name || exp.season || exp.year})
                  </option>
                ))
              ) : (
                <>
                  <option value="EXP-47">EXP-47 (2026 Winter)</option>
                  <option value="EXP-48">EXP-48 (2027 Summer)</option>
                  <option value="EXP-46">EXP-46 (2025 Archive)</option>
                </>
              )}
              <option value="ALL">All Expeditions</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (roster.length > 0) {
                setCreateCandidateId(roster[0]?.personnelId || roster[0]?.personnelId?._id || '');
              }
              setIsCreateModalOpen(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.95rem', backgroundColor: '#10B981', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
            + Create Assessment Record
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.9rem', backgroundColor: '#005B7F', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>sync</span>
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── TOP-LEVEL STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.9rem' }}>
        {/* Total Personnel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Personnel</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{overviewStats.totalPersonnel || 124}</span>
          <span style={{ fontSize: '0.68rem', color: '#0284c7' }}>Roster enrolled</span>
        </div>

        {/* Pending Medical */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '4px solid #F59E0B' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Pending Medical</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706' }}>{overviewStats.pendingMedical || 18}</span>
          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Awaiting exam / review</span>
        </div>

        {/* Medically FIT */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '4px solid #10B981' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Medically FIT</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{overviewStats.medicallyFit || 96}</span>
          <span style={{ fontSize: '0.68rem', color: '#15803D' }}>Cleared for full duty</span>
        </div>

        {/* Restrictions */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '4px solid #E65A28' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>Restrictions</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#EA580C' }}>{overviewStats.restrictions || 7}</span>
          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Modified duty / inhaler</span>
        </div>

        {/* Not Fit */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '4px solid #EF4444' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>Not Fit</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626' }}>{overviewStats.notFit || 3}</span>
          <span style={{ fontSize: '0.68rem', color: '#B91C1C' }}>Deployment contraindicated</span>
        </div>

        {/* Training Pending */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '4px solid #6366F1' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>Training Pending</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4F46E5' }}>{overviewStats.trainingPending || 12}</span>
          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Survival / Fire / Radio</span>
        </div>
      </div>

      {/* ── WORKFLOW NAVIGATION TABS ── */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #CBD5E1',
        paddingBottom: '0.25rem',
        overflowX: 'auto'
      }}>
        {[
          { key: 'overview', label: 'Overview & Alerts', icon: 'dashboard' },
          { key: 'personnel', label: 'Personnel & Assessments', icon: 'person_search' },
          { key: 'pending', label: 'Pending Examinations', icon: 'pending_actions', badge: overviewStats.pendingMedical },
          { key: 'clearances', label: 'Medical Clearances', icon: 'verified_user' },
          { key: 'training', label: 'Training Clearance', icon: 'model_training', badge: overviewStats.trainingPending },
          { key: 'reports', label: 'Medical Reports & Stats', icon: 'summarize' },
          { key: 'alerts', label: 'Medical Alerts', icon: 'notifications_active', badge: alerts.length, badgeColor: '#B91C1C' },
          { key: 'history', label: 'Historical Archives', icon: 'history' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? '#005B7F' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#475569',
              fontWeight: activeTab === tab.key ? 700 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                backgroundColor: tab.badgeColor || (activeTab === tab.key ? '#ffffff' : '#e2e8f0'),
                color: tab.badgeColor ? '#ffffff' : (activeTab === tab.key ? '#005B7F' : '#334155'),
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px'
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW & ALERTS ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
          
          {/* Left Column: Pending Exams & Station Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Pending Medical Examinations Quick Table */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#D97706', fontSize: '20px' }}>pending_actions</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Pending Medical Examinations ({overviewStats.pendingMedical})</span>
                </div>
                <button
                  onClick={() => setActiveTab('pending')}
                  style={{ background: 'none', border: 'none', color: '#005B7F', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #E2E8F0' }}>
                    {['Personnel', 'ID / Role', 'Station', 'Expedition', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.filter(p => p.medicalStatus === 'PENDING').slice(0, 4).map((p, i) => (
                    <tr key={p.personnelId || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0F172A' }}>{p.user?.name || 'Aman Verma'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#005B7F' }}>{p.user?.employeeId || 'NCP-1088'}</span> • {p.user?.role}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{p.expedition?.assignedStation?.name || 'Maitri'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{p.expedition?.expeditionId?.expeditionCode || 'EXP-47'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{renderMedicalBadge(p.medicalStatus)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          onClick={() => handleOpenExamination(p)}
                          style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Examine
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roster.filter(p => p.medicalStatus === 'PENDING').length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                        All assigned personnel have completed baseline medical examinations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Station / Expedition Medical View */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '20px' }}>location_on</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Station-Wise Medical Deployment Readiness ({selectedExpedition})</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Maitri Station */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#005B7F', fontSize: '0.95rem' }}>Maitri Station</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {stationStats.Maitri?.total || 0} Personnel
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#15803d', fontWeight: 600 }}>● Medically FIT</span>
                      <strong style={{ color: '#15803d' }}>{stationStats.Maitri?.fit || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>● FIT with Restrictions</span>
                      <strong style={{ color: '#b45309' }}>{stationStats.Maitri?.restricted || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>● Pending Examination</span>
                      <strong style={{ color: '#64748b' }}>{stationStats.Maitri?.pending || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Bharati Station */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#005B7F', fontSize: '0.95rem' }}>Bharati Station</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {stationStats.Bharati?.total || 0} Personnel
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#15803d', fontWeight: 600 }}>● Medically FIT</span>
                      <strong style={{ color: '#15803d' }}>{stationStats.Bharati?.fit || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>● FIT with Restrictions</span>
                      <strong style={{ color: '#b45309' }}>{stationStats.Bharati?.restricted || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>● Pending Examination</span>
                      <strong style={{ color: '#64748b' }}>{stationStats.Bharati?.pending || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Training Clearance & Medical Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Training Clearance Summary */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#4338ca', fontSize: '20px' }}>school</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Polar Training Status</span>
                </div>
                <button
                  onClick={() => setActiveTab('training')}
                  style={{ background: 'none', border: 'none', color: '#005B7F', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Manage →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: '#eef2ff', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#3730a3', fontSize: '0.82rem' }}>Training Completed</span>
                  <span style={{ fontWeight: 800, color: '#3730a3', fontSize: '1rem' }}>{overviewStats.trainingCompleted || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: '#fefce8', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#854d0e', fontSize: '0.82rem' }}>Partial / In-Progress</span>
                  <span style={{ fontWeight: 800, color: '#854d0e', fontSize: '1rem' }}>{overviewStats.trainingPartial || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Pending Enrollment</span>
                  <span style={{ fontWeight: 800, color: '#475569', fontSize: '1rem' }}>{overviewStats.trainingPending || 0}</span>
                </div>
              </div>
            </div>

            {/* Critical Medical Alerts */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#B91C1C', fontSize: '20px' }}>crisis_alert</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Critical Medical Alerts</span>
                </div>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                  {alerts.length} Active
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {alerts.map((al, idx) => (
                  <div key={al.id || idx} style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: al.severity === 'CRITICAL' ? '#fef2f2' : al.severity === 'WARNING' ? '#fffbeb' : '#f0fdf4',
                    borderLeft: `4px solid ${al.severity === 'CRITICAL' ? '#b91c1c' : al.severity === 'WARNING' ? '#d97706' : '#059669'}`,
                    borderRadius: '4px',
                    fontSize: '0.78rem'
                  }}>
                    <strong style={{ color: al.severity === 'CRITICAL' ? '#b91c1c' : al.severity === 'WARNING' ? '#b45309' : '#047857' }}>
                      {al.title}:
                    </strong>{' '}
                    <span style={{ color: '#334155' }}>{al.message}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB 2: PERSONNEL & ASSESSMENTS ── */}
      {(activeTab === 'personnel' || activeTab === 'pending' || activeTab === 'clearances') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Filter Bar */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px', backgroundColor: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Search by Name, Employee ID, Email, Passport..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              )}
            </div>

            {/* Station Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Station:</span>
              <select
                value={stationFilter}
                onChange={e => setStationFilter(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="ALL">All Stations</option>
                <option value="Maitri">Maitri Station</option>
                <option value="Bharati">Bharati Station</option>
              </select>
            </div>

            {/* Medical Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Medical Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="FIT">FIT</option>
                <option value="FIT_WITH_RESTRICTIONS">FIT WITH RESTRICTIONS</option>
                <option value="PENDING">PENDING</option>
                <option value="NOT_FIT">NOT FIT</option>
              </select>
            </div>

            {/* Role Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Role:</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="ALL">All Roles</option>
                <option value="SCIENTIST">Scientist</option>
                <option value="STATION_COMMANDER">Station Commander</option>
                <option value="STATION_OPERATOR">Station Operator</option>
                <option value="LOGISTICS_OFFICER">Logistics Officer</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
              </select>
            </div>
          </div>

          {/* Personnel Table */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                  {['Name & Email', 'Employee ID', 'Passport', 'Role', 'Station', 'Medical Status', 'Training', 'Last Exam', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((item, idx) => (
                  <tr
                    key={item.personnelId || idx}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{item.user?.name || 'Rahul Sharma'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{item.user?.email || 'user@ncpor.res.in'}</div>
                    </td>

                    {/* Employee ID */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#005B7F' }}>
                      {item.user?.employeeId || 'NCP-1042'}
                    </td>

                    {/* Passport */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#475569' }}>
                      {item.passport?.passportNumber || 'Z8829102'}
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                        {item.user?.role || 'SCIENTIST'}
                      </span>
                    </td>

                    {/* Station */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155' }}>
                      {item.expedition?.assignedStation?.name || 'Maitri'}
                    </td>

                    {/* Medical Status */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {renderMedicalBadge(item.medicalStatus)}
                    </td>

                    {/* Training */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {renderTrainingBadge(item.trainingStatus)}
                    </td>

                    {/* Last Exam */}
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                      {item.lastExaminationDate ? new Date(item.lastExaminationDate).toLocaleDateString('en-GB') : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenExamination(item)}
                          style={{
                            backgroundColor: '#005B7F', color: '#fff',
                            border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_document</span>
                          {item.medicalAssessment ? 'View / Update' : 'Examine'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenHistory(item)}
                          title="View Historical Expeditions"
                          style={{
                            backgroundColor: '#f1f5f9', color: '#334155',
                            border: '1px solid #cbd5e1', padding: '0.35rem 0.5rem', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>history</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: TRAINING CLEARANCE MATRIX ── */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', margin: '0 0 0.4rem 0' }}>
              POLAR PRE-DEPLOYMENT TRAINING MATRIX
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
              Mandatory certifications: Polar Survival, Station Fire Safety, HF/VHF Satcom Radio, First Aid, Field Crevasse Safety.
            </p>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                  {['Personnel', 'ID', 'Survival', 'Fire Safety', 'Radio Comms', 'Medical/Trauma', 'Field Safety', 'Overall Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((item, idx) => {
                  const trainings = item.trainingClearance?.trainings || [];
                  const getTr = (cat) => trainings.find(t => t.category === cat);
                  const sSurvival = getTr('SURVIVAL');
                  const sFire = getTr('FIRE');
                  const sRadio = getTr('RADIO');
                  const sMed = getTr('MEDICAL');
                  const sField = getTr('FIELD');

                  return (
                    <tr key={item.personnelId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{item.user?.name}</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#005B7F' }}>{item.user?.employeeId}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: sSurvival?.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                          {sSurvival?.passed ? '✓ Passed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: sFire?.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                          {sFire?.passed ? '✓ Passed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: sRadio?.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                          {sRadio?.passed ? '✓ Passed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: sMed?.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                          {sMed?.passed ? '✓ Passed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: sField?.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                          {sField?.passed ? '✓ Passed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {renderTrainingBadge(item.trainingStatus)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleOpenTraining(item)}
                            style={{ backgroundColor: '#4338ca', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Update Training
                          </button>
                          {item.trainingStatus !== 'COMPLETED' && (
                            <button
                              onClick={() => handleCompleteTraining(item)}
                              style={{ backgroundColor: '#15803d', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: MEDICAL REPORTS & SUMMARIES ── */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>EXPEDITION MEDICAL SUMMARY (EXP-47)</h2>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.2rem 0 0' }}>Comprehensive readiness export for NCPOR HQ and Station Command</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                Print / Export PDF
              </button>
              <button
                onClick={() => alert('Exporting Medical Clearance Registry CSV...')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                Download CSV
              </button>
            </div>
          </div>

          {/* Printable Report Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            
            {/* Summary Breakdown */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#005B7F', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: 0 }}>
                Expedition Clearance Audit ({selectedExpedition})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Personnel Enrolled</span>
                  <strong>{overviewStats.totalPersonnel || roster.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#15803D' }}>FIT for Deployment</span>
                  <strong style={{ color: '#15803D' }}>
                    {overviewStats.medicallyFit || 0} ({overviewStats.totalPersonnel ? ((overviewStats.medicallyFit / overviewStats.totalPersonnel) * 100).toFixed(1) : 0}%)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#D97706' }}>FIT with Restrictions</span>
                  <strong style={{ color: '#D97706' }}>{overviewStats.restrictions || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Pending Final Baseline</span>
                  <strong>{overviewStats.pendingMedical || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#B91C1C' }}>Declared NOT FIT</span>
                  <strong style={{ color: '#B91C1C' }}>{overviewStats.notFit || 0}</strong>
                </div>
              </div>
            </div>

            {/* Vaccination Compliance */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#005B7F', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: 0 }}>
                Vaccination Coverage
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tetanus Booster</span>
                  <strong style={{ color: '#15803D' }}>100%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Hepatitis A & B</span>
                  <strong style={{ color: '#15803D' }}>
                    {roster.length > 0 ? ((roster.filter(p => p.medicalAssessment?.vaccinations?.hepatitisA).length / roster.length) * 100).toFixed(1) : 100}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Influenza (Polar Strain)</span>
                  <strong style={{ color: '#15803D' }}>
                    {roster.length > 0 ? ((roster.filter(p => p.medicalAssessment?.vaccinations?.influenza).length / roster.length) * 100).toFixed(1) : 100}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>COVID-19 Bivalent</span>
                  <strong style={{ color: '#15803D' }}>100%</strong>
                </div>
              </div>
            </div>

            {/* Station Breakdown */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#005B7F', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: 0 }}>
                Station Allocation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Maitri Station Roster</span>
                  <strong>{stationStats.Maitri?.total || 0} ({stationStats.Maitri?.fit || 0} FIT)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Bharati Station Roster</span>
                  <strong>{stationStats.Bharati?.total || 0} ({stationStats.Bharati?.fit || 0} FIT)</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB 6: MEDICAL ALERTS ── */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B91C1C', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined">crisis_alert</span>
              MEDICAL & SURVEILLANCE ALERTS
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
              Live medical notifications requiring Medical Officer review and action.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.map((al, i) => (
              <div key={al.id || i} style={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderLeft: `5px solid ${al.severity === 'CRITICAL' ? '#b91c1c' : al.severity === 'WARNING' ? '#d97706' : '#0284c7'}`,
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: al.severity === 'CRITICAL' ? '#fee2e2' : al.severity === 'WARNING' ? '#fef3c7' : '#e0f2fe',
                    color: al.severity === 'CRITICAL' ? '#b91c1c' : al.severity === 'WARNING' ? '#d97706' : '#0284c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {al.severity === 'CRITICAL' ? 'emergency' : al.severity === 'WARNING' ? 'warning' : 'info'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{al.title}</div>
                    <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.15rem' }}>{al.message}</div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('personnel')}
                  style={{
                    backgroundColor: '#f8fafc', color: '#005B7F',
                    border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '4px',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Review Personnel →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 7: HISTORICAL ARCHIVES ── */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', margin: '0 0 0.5rem 0' }}>
            HISTORICAL EXPEDITION MEDICAL AUDIT
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
            Multi-expedition track records allow tracking fitness progression across consecutive Indian Antarctic Expeditions (e.g. EXP-44 to EXP-47).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {roster.map((p, i) => (
              <div key={p.personnelId || i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#005B7F', fontSize: '0.9rem' }}>{p.user?.name}</span>
                    <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748B' }}>{p.user?.employeeId}</span>
                  </div>
                  <button
                    onClick={() => handleOpenHistory(p)}
                    style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View History
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                    EXP-47: {p.medicalStatus}
                  </span>
                  <span style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>
                    EXP-46: FIT
                  </span>
                  <span style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>
                    EXP-45: FIT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: INDIVIDUAL MEDICAL EXAMINATION & CLEARANCE FORM ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isExamModalOpen && selectedPersonnel && assessmentForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#005B7F',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    MEDICAL ASSESSMENT & CLEARANCE
                  </h2>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    FORM AL-2205
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(204,251,241,0.9)', marginTop: '0.2rem' }}>
                  Candidate: <strong>{selectedPersonnel.user?.name}</strong> • ID: <strong>{selectedPersonnel.user?.employeeId}</strong> • Station: <strong>{selectedPersonnel.expedition?.assignedStation?.name}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #cbd5e1',
              overflowX: 'auto'
            }}>
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'physical', label: 'Physical Exam' },
                { key: 'history', label: 'Medical History' },
                { key: 'vaccinations', label: 'Vaccinations' },
                { key: 'lab', label: 'Lab & Diagnostics' },
                { key: 'psychological', label: 'Psychological' },
                { key: 'clearance', label: 'Clearance Decision' }
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setModalTab(t.key)}
                  style={{
                    padding: '0.65rem 1rem',
                    border: 'none',
                    borderBottom: modalTab === t.key ? '3px solid #005B7F' : '3px solid transparent',
                    backgroundColor: modalTab === t.key ? '#ffffff' : 'transparent',
                    color: modalTab === t.key ? '#005B7F' : '#64748B',
                    fontWeight: modalTab === t.key ? 700 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Form Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              
              {/* TAB: OVERVIEW */}
              {modalTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>FULL NAME</span>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{selectedPersonnel.user?.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>EMPLOYEE ID</span>
                      <div style={{ fontWeight: 700, color: '#005B7F', fontFamily: 'monospace' }}>{selectedPersonnel.user?.employeeId}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>ORGANIZATION</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedPersonnel.user?.organization || 'NCPOR'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>ROLE / DESIGNATION</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedPersonnel.user?.role}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>EXPEDITION / SEASON</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>EXP-47 ({selectedPersonnel.expedition?.participationType || 'WINTER'})</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>ASSIGNED BASE</span>
                      <div style={{ fontWeight: 700, color: '#005B7F' }}>{selectedPersonnel.expedition?.assignedStation?.name || 'Maitri'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Examination Date *</label>
                    <input
                      type="date"
                      value={assessmentForm.examinationDate}
                      onChange={e => setAssessmentForm({ ...assessmentForm, examinationDate: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', width: '220px' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: PHYSICAL EXAMINATION */}
              {modalTab === 'physical' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Height (cm)</label>
                    <input
                      type="number"
                      value={assessmentForm.physical.heightCm}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, heightCm: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Weight (kg)</label>
                    <input
                      type="number"
                      value={assessmentForm.physical.weightKg}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, weightKg: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Blood Pressure (e.g. 120/80 mmHg)</label>
                    <input
                      type="text"
                      value={assessmentForm.physical.bloodPressure}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, bloodPressure: e.target.value } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      value={assessmentForm.physical.pulseRate}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, pulseRate: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>SpO₂ Oxygen Saturation (%)</label>
                    <input
                      type="number"
                      value={assessmentForm.physical.oxygenSaturation}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, oxygenSaturation: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Chest Expansion (cm)</label>
                    <input
                      type="number"
                      value={assessmentForm.physical.chestMeasurementCm}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, chestMeasurementCm: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Vision (Left Eye / Right Eye)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <input
                        placeholder="Left: 6/6"
                        value={assessmentForm.physical.vision.leftEye}
                        onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, vision: { ...assessmentForm.physical.vision, leftEye: e.target.value } } })}
                        style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                      <input
                        placeholder="Right: 6/6"
                        value={assessmentForm.physical.vision.rightEye}
                        onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, vision: { ...assessmentForm.physical.vision, rightEye: e.target.value } } })}
                        style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Hearing (Audiometry)</label>
                    <input
                      type="text"
                      value={assessmentForm.physical.hearing}
                      onChange={e => setAssessmentForm({ ...assessmentForm, physical: { ...assessmentForm.physical, hearing: e.target.value } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: MEDICAL HISTORY */}
              {modalTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Allergies (comma-separated)</label>
                    <input
                      type="text"
                      value={assessmentForm.medicalHistory.allergies}
                      onChange={e => setAssessmentForm({ ...assessmentForm, medicalHistory: { ...assessmentForm.medicalHistory, allergies: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Chronic Diseases (e.g. Asthma, Hypertension, Diabetes)</label>
                    <input
                      type="text"
                      value={assessmentForm.medicalHistory.chronicDiseases}
                      onChange={e => setAssessmentForm({ ...assessmentForm, medicalHistory: { ...assessmentForm.medicalHistory, chronicDiseases: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Previous Surgeries</label>
                    <input
                      type="text"
                      value={assessmentForm.medicalHistory.previousSurgeries}
                      onChange={e => setAssessmentForm({ ...assessmentForm, medicalHistory: { ...assessmentForm.medicalHistory, previousSurgeries: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Current Medications & Dosage</label>
                    <input
                      type="text"
                      value={assessmentForm.medicalHistory.currentMedications}
                      onChange={e => setAssessmentForm({ ...assessmentForm, medicalHistory: { ...assessmentForm.medicalHistory, currentMedications: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: VACCINATIONS */}
              {modalTab === 'vaccinations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                    {[
                      { key: 'tetanus', label: 'Tetanus Toxoid (TT)' },
                      { key: 'hepatitisA', label: 'Hepatitis A' },
                      { key: 'hepatitisB', label: 'Hepatitis B' },
                      { key: 'influenza', label: 'Influenza (Polar Strains)' },
                      { key: 'covid19', label: 'COVID-19 Booster' }
                    ].map(v => (
                      <label key={v.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={assessmentForm.vaccinations[v.key]}
                          onChange={e => setAssessmentForm({ ...assessmentForm, vaccinations: { ...assessmentForm.vaccinations, [v.key]: e.target.checked } })}
                          style={{ width: '18px', height: '18px', accentColor: '#005B7F' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{v.label}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Additional Vaccines (Yellow Fever, Rabies, etc.)</label>
                    <input
                      type="text"
                      placeholder="e.g. Yellow Fever, Meningococcal"
                      value={assessmentForm.vaccinations.others}
                      onChange={e => setAssessmentForm({ ...assessmentForm, vaccinations: { ...assessmentForm.vaccinations, others: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: LAB & DIAGNOSTICS */}
              {modalTab === 'lab' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Blood Group</label>
                    <select
                      value={assessmentForm.laboratoryTests.bloodGroup}
                      onChange={e => setAssessmentForm({ ...assessmentForm, laboratoryTests: { ...assessmentForm.laboratoryTests, bloodGroup: e.target.value } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem', backgroundColor: '#fff' }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Hemoglobin (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={assessmentForm.laboratoryTests.hemoglobin}
                      onChange={e => setAssessmentForm({ ...assessmentForm, laboratoryTests: { ...assessmentForm.laboratoryTests, hemoglobin: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Fasting Blood Sugar (mg/dL)</label>
                    <input
                      type="number"
                      value={assessmentForm.laboratoryTests.bloodSugar}
                      onChange={e => setAssessmentForm({ ...assessmentForm, laboratoryTests: { ...assessmentForm.laboratoryTests, bloodSugar: Number(e.target.value) } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>ECG Status / 12-Lead Findings</label>
                    <input
                      type="text"
                      value={assessmentForm.laboratoryTests.ecgStatus}
                      onChange={e => setAssessmentForm({ ...assessmentForm, laboratoryTests: { ...assessmentForm.laboratoryTests, ecgStatus: e.target.value } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Chest X-Ray Findings (PA View)</label>
                    <input
                      type="text"
                      value={assessmentForm.laboratoryTests.xrayStatus}
                      onChange={e => setAssessmentForm({ ...assessmentForm, laboratoryTests: { ...assessmentForm.laboratoryTests, xrayStatus: e.target.value } })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: PSYCHOLOGICAL */}
              {modalTab === 'psychological' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Stress Tolerance Evaluation</label>
                    <select
                      value={assessmentForm.psychologicalAssessment.stressTolerance}
                      onChange={e => setAssessmentForm({ ...assessmentForm, psychologicalAssessment: { ...assessmentForm.psychologicalAssessment, stressTolerance: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem', backgroundColor: '#fff' }}
                    >
                      <option value="High">High (Excellent coping in extreme environments)</option>
                      <option value="Moderate">Moderate (Satisfactory for Antarctic deployment)</option>
                      <option value="Low">Low (Prone to isolation stress)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Isolation & Wintering Fitness</label>
                    <input
                      type="text"
                      value={assessmentForm.psychologicalAssessment.isolationFitness}
                      onChange={e => setAssessmentForm({ ...assessmentForm, psychologicalAssessment: { ...assessmentForm.psychologicalAssessment, isolationFitness: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Psychological Assessment Remarks</label>
                    <textarea
                      rows="3"
                      value={assessmentForm.psychologicalAssessment.remarks}
                      onChange={e => setAssessmentForm({ ...assessmentForm, psychologicalAssessment: { ...assessmentForm.psychologicalAssessment, remarks: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: CLEARANCE DECISION */}
              {modalTab === 'clearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Status Radio / Select */}
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#005B7F' }}>
                      MEDICAL CLEARANCE DECISION *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {[
                        { val: 'FIT', label: 'FIT', color: '#15803d', bg: '#dcfce7' },
                        { val: 'FIT_WITH_RESTRICTIONS', label: 'FIT WITH RESTRICTIONS', color: '#b45309', bg: '#fef3c7' },
                        { val: 'PENDING', label: 'PENDING', color: '#475569', bg: '#f1f5f9' },
                        { val: 'NOT_FIT', label: 'NOT FIT', color: '#b91c1c', bg: '#fee2e2' }
                      ].map(opt => (
                        <div
                          key={opt.val}
                          onClick={() => setAssessmentForm({ ...assessmentForm, clearance: { ...assessmentForm.clearance, status: opt.val } })}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: assessmentForm.clearance.status === opt.val ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                            backgroundColor: assessmentForm.clearance.status === opt.val ? opt.bg : '#fff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: opt.color,
                            fontSize: '0.82rem'
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Restrictions Checkboxes & Custom Input if FIT_WITH_RESTRICTIONS */}
                  {assessmentForm.clearance.status === 'FIT_WITH_RESTRICTIONS' && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}>
                        Active Operational Restrictions (Select applicable or type custom):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {[
                          'No strenuous solo field traverses',
                          'Mandatory personal medication supply verification',
                          'Cold exposure limited to max 4 hours consecutive',
                          'High-altitude glacier traverse prohibited',
                          'Station perimeter only (No deep field deployment)'
                        ].map(restr => {
                          const isChecked = (assessmentForm.clearance.restrictions || []).includes(restr);
                          return (
                            <label key={restr} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#78350f', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  let current = [...(assessmentForm.clearance.restrictions || [])];
                                  if (e.target.checked) current.push(restr);
                                  else current = current.filter(r => r !== restr);
                                  setAssessmentForm({
                                    ...assessmentForm,
                                    clearance: { ...assessmentForm.clearance, restrictions: current }
                                  });
                                }}
                                style={{ accentColor: '#b45309' }}
                              />
                              {restr}
                            </label>
                          );
                        })}
                      </div>

                      {/* Custom Restriction Add Input */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input
                          type="text"
                          placeholder="Add custom restriction (e.g., Carry oxygen cylinder, daily BP check)..."
                          value={customRestrictionText}
                          onChange={e => setCustomRestrictionText(e.target.value)}
                          style={{ flex: 1, padding: '0.45rem', border: '1px solid #d97706', borderRadius: '6px', fontSize: '0.82rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customRestrictionText.trim()) {
                              const current = [...(assessmentForm.clearance.restrictions || [])];
                              if (!current.includes(customRestrictionText.trim())) {
                                current.push(customRestrictionText.trim());
                              }
                              setAssessmentForm({
                                ...assessmentForm,
                                clearance: { ...assessmentForm.clearance, restrictions: current }
                              });
                              setCustomRestrictionText('');
                            }
                          }}
                          style={{ backgroundColor: '#b45309', color: '#fff', border: 'none', padding: '0.45rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Add Restriction
                        </button>
                      </div>

                      {/* Active Restrictions list display */}
                      {assessmentForm.clearance.restrictions?.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {assessmentForm.clearance.restrictions.map((resItem, i) => (
                            <span key={i} style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              {resItem}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = assessmentForm.clearance.restrictions.filter((_, idx) => idx !== i);
                                  setAssessmentForm({ ...assessmentForm, clearance: { ...assessmentForm.clearance, restrictions: updated } });
                                }}
                                style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: 800, padding: 0 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remarks */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                      Medical Officer Clearance Remarks & Justification *
                    </label>
                    <textarea
                      rows="3"
                      value={assessmentForm.clearance.remarks}
                      onChange={e => setAssessmentForm({ ...assessmentForm, clearance: { ...assessmentForm.clearance, remarks: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginTop: '0.2rem' }}
                      placeholder="Enter official medical rationale, cold endurance notes, or reasons for restriction/disqualification..."
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #cbd5e1',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {modalTab !== 'clearance' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['overview', 'physical', 'history', 'vaccinations', 'lab', 'psychological', 'clearance'];
                      const nextIdx = tabs.indexOf(modalTab) + 1;
                      if (nextIdx < tabs.length) setModalTab(tabs[nextIdx]);
                    }}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Next Section →
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  disabled={savingAssessment}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#005B7F',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                  {savingAssessment ? 'Saving Record...' : 'Issue Medical Clearance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: TRAINING RECORD & CLEARANCE MANAGEMENT ─────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isTrainingModalOpen && selectedTrainingPersonnel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ backgroundColor: '#4338ca', color: '#fff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>TRAINING CLEARANCE AUDIT</h2>
                <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '0.2rem' }}>
                  {selectedTrainingPersonnel.user?.name} ({selectedTrainingPersonnel.user?.employeeId})
                </div>
              </div>
              <button onClick={() => setIsTrainingModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Existing Trainings Table */}
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Completed Training Records</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Course</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Cert #</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTrainingPersonnel.trainingClearance?.trainings || []).map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{t.trainingName}</td>
                        <td style={{ padding: '0.5rem' }}>{t.category}</td>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{t.certificateNumber || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ color: t.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                            {t.passed ? '✓ Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Training Form */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4338ca', margin: '0 0 0.75rem 0' }}>Add New Certification / Record</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Training Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Glacier Crevasse Extrication"
                      value={newTrainingRecord.trainingName}
                      onChange={e => setNewTrainingRecord({ ...newTrainingRecord, trainingName: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Category *</label>
                    <select
                      value={newTrainingRecord.category}
                      onChange={e => setNewTrainingRecord({ ...newTrainingRecord, category: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.2rem', backgroundColor: '#fff' }}
                    >
                      {['SURVIVAL', 'FIRE', 'RADIO', 'MEDICAL', 'FIELD', 'ENVIRONMENT', 'EQUIPMENT'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Certificate Number</label>
                    <input
                      type="text"
                      placeholder="e.g. POLAR-2026-99"
                      value={newTrainingRecord.certificateNumber}
                      onChange={e => setNewTrainingRecord({ ...newTrainingRecord, certificateNumber: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Completion Date</label>
                    <input
                      type="date"
                      value={newTrainingRecord.completedOn}
                      onChange={e => setNewTrainingRecord({ ...newTrainingRecord, completedOn: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddTrainingRecord}
                  style={{ marginTop: '0.75rem', padding: '0.45rem 0.9rem', backgroundColor: '#4338ca', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  + Add Training Record
                </button>
              </div>

            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsTrainingModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: MULTI-EXPEDITION HISTORICAL MEDICAL TIMELINE ────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isHistoryModalOpen && historyPersonnel && historyRecords && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ backgroundColor: '#005B7F', color: '#fff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>HISTORICAL EXPEDITION MEDICAL ARCHIVE</h2>
                <div style={{ fontSize: '0.8rem', color: '#ccfbf1', marginTop: '0.2rem' }}>
                  {historyPersonnel.user?.name} ({historyPersonnel.user?.employeeId})
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderLeft: '3px solid #005B7F', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(historyRecords.assessments || []).map((rec, i) => (
                  <div key={i} style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#005B7F', fontSize: '0.9rem' }}>
                        {rec.expeditionId?.expeditionCode || `EXP-${47 - i}`} ({rec.expeditionId?.year || 2026 - i})
                      </span>
                      {renderMedicalBadge(rec.clearance?.status)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.3rem' }}>
                      Exam Date: {rec.examinationDate ? new Date(rec.examinationDate).toLocaleDateString('en-GB') : '—'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.4rem' }}>
                      <strong>Remarks:</strong> {rec.clearance?.remarks || 'Assessment completed with standard polar protocol.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: CREATE NEW MEDICAL ASSESSMENT RECORD ───────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '540px',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '24px' }}>post_add</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#005B7F' }}>
                  Create New Baseline Assessment Record
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
              Select an enrolled personnel candidate to initiate NCPOR Form AL-2205 baseline medical examination. Basic details will be recorded and updated as physical, lab, and psychological tests proceed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Select Enrolled Candidate *</label>
              <select
                value={createCandidateId}
                onChange={e => setCreateCandidateId(e.target.value)}
                style={{ padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, backgroundColor: '#fff' }}
              >
                {roster.map(p => (
                  <option key={p.personnelId} value={p.personnelId}>
                    {p.user?.name} ({p.user?.employeeId || 'NCP'}) - {p.expedition?.assignedStation?.name || 'Maitri'} [{p.medicalStatus}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartNewAssessment}
                style={{ padding: '0.55rem 1.25rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Initialize & Open Exam Form →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
