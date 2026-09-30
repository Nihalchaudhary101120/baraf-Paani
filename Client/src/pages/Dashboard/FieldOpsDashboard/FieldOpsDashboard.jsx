import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldExcursion } from '@/context/FieldExcursionContext';
import { getStationsApi } from '@/api/station.api';
import { getCheckInQueue } from '@/services/syncServices/queueService';

const STATUS_STYLE = {
  ACTIVE:    { bg: '#ecfdf5', color: '#15803D', border: '#a7f3d0', label: 'ACTIVE', pulse: false },
  OVERDUE:   { bg: '#fef2f2', color: '#B91C1C', border: '#fecaca', label: '⚠ OVERDUE', pulse: true },
  PLANNED:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'PLANNED', pulse: false },
  COMPLETED: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', label: 'COMPLETED', pulse: false },
  CANCELLED: { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0', label: 'CANCELLED', pulse: false },
};

const RISK_STYLE = {
  LOW:    { color: '#15803D', bg: '#f0fdf4', border: '#bbf7d0' },
  MEDIUM: { color: '#854d0e', bg: '#fefce8', border: '#fef08a' },
  HIGH:   { color: '#B91C1C', bg: '#fef2f2', border: '#fecaca' },
};

const TRANSPORT_ICONS = {
  SNOWMOBILE:    'two_wheeler',
  TRACK_VEHICLE: 'directions_bus',
  HELICOPTER:    'helicopter',
  FOOT:          'hiking',
};

const FieldOpsDashboard = () => {
  const { user } = useAuth();
  const {
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
    fetchExcursionDetails,
    fetchCheckIns,
    fetchLatestCheckIns,
    createExcursion,
    startExcursion,
    markReturned,
    cancelExcursion,
    submitCheckIn,
    fetchPersonnel,
    refreshAll,
  } = useFieldExcursion();

  const isOperator = ['STATION_OPERATOR', 'STATION_COMMANDER', 'HQ_COMMAND', 'HQ_ADMIN'].includes(user?.role);

  const [activeTab, setActiveTab] = useState(isOperator ? 'active' : 'my_active');
  const [stations, setStations] = useState([]);

  // Resolve Station Operator's assigned station from AuthContext or stations list
  const userStationDoc = typeof user?.stationId === 'object' && user?.stationId !== null ? user?.stationId : null;
  const userStationId = userStationDoc?._id || user?.stationId || user?.station;

  const assignedStation = React.useMemo(() => {
    if (userStationDoc?.name || userStationDoc?.code) return userStationDoc;
    if (userStationId && stations.length > 0) {
      return stations.find(s => String(s._id) === String(userStationId) || s.code === String(userStationId)) || null;
    }
    return null;
  }, [userStationDoc, userStationId, stations]);

  const assignedStationId = assignedStation?._id || (typeof userStationId === 'string' ? userStationId : '');
  const assignedStationName = assignedStation?.name || (assignedStation?.code ? `${assignedStation.code} Station` : 'Assigned Station');
  const assignedStationCode = assignedStation?.code || '';

  // Form states
  const [createForm, setCreateForm] = useState({
    stationId: assignedStationId || '',
    leaderId: '',
    members: [],
    purpose: '',
    destinationName: '',
    destinationLat: '',
    destinationLng: '',
    transportMode: 'TRACK_VEHICLE',
    departureTime: '',
    expectedReturnTime: '',
    checkInIntervalMinutes: 60,
    weatherRisk: 'LOW',
  });

  const [checkInForm, setCheckInForm] = useState({
    excursionId: '',
    temp: '',
    battery: '',
    lat: '',
    lng: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshPendingCount = async () => {
    try {
      const q = await getCheckInQueue();
      const pending = q.filter(e => e.status === 'PENDING' || e.syncStatus === 'PENDING');
      setPendingSyncCount(pending.length);
    } catch (e) {}
  };

  useEffect(() => {
    refreshPendingCount();
    const handleSyncComplete = () => refreshPendingCount();
    window.addEventListener('nirantra:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('nirantra:sync-complete', handleSyncComplete);
  }, []);

  // Fetch stations for reference
  useEffect(() => {
    const loadStations = async () => {
      try {
        const res = await getStationsApi();
        const list = res?.stations || res?.data?.stations || res?.data || [];
        setStations(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching stations:', err);
      }
    };
    loadStations();
  }, []);

  // Automatically sync createForm.stationId and fetch scoped personnel
  useEffect(() => {
    if (assignedStationId) {
      setCreateForm((prev) => ({
        ...prev,
        stationId: assignedStationId,
      }));
      fetchPersonnel(assignedStationId);
    }
  }, [assignedStationId, fetchPersonnel]);

  // When switching to 'create' tab, refresh personnel for assigned station
  useEffect(() => {
    if (activeTab === 'create' && assignedStationId) {
      fetchPersonnel(assignedStationId);
    }
  }, [activeTab, assignedStationId, fetchPersonnel]);

  // When expanding an excursion, load its check-ins and latest member statuses
  const handleToggleExpand = async (exc) => {
    if (selectedExcursion?._id === exc._id) {
      setSelectedExcursion(null);
    } else {
      setSelectedExcursion(exc);
      await Promise.all([
        fetchExcursionDetails(exc._id),
        fetchCheckIns(exc._id),
        fetchLatestCheckIns(exc._id),
      ]);
    }
  };

  // Pre-fill default departure & return times
  useEffect(() => {
    const now = new Date();
    const plus8h = new Date(now.getTime() + 8 * 3600 * 1000);
    const toLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCreateForm((prev) => ({
      ...prev,
      departureTime: prev.departureTime || toLocalISO(now),
      expectedReturnTime: prev.expectedReturnTime || toLocalISO(plus8h),
      stationId: assignedStationId || prev.stationId || '',
    }));
  }, [user, assignedStationId]);

  // Handle Create Excursion submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.leaderId) {
      alert('Please select a Team Leader from the personnel list.');
      return;
    }
    if (new Date(createForm.expectedReturnTime) <= new Date(createForm.departureTime)) {
      alert('Expected Return Time must be after Departure Time.');
      return;
    }

    setSubmitting(true);
    const payload = {
      stationId: assignedStationId || createForm.stationId || undefined,
      leaderId: createForm.leaderId,
      members: createForm.members,
      purpose: createForm.purpose,
      destination: {
        name: createForm.destinationName,
        coordinates: {
          latitude: parseFloat(createForm.destinationLat) || 0,
          longitude: parseFloat(createForm.destinationLng) || 0,
        },
      },
      transportMode: createForm.transportMode,
      departureTime: new Date(createForm.departureTime).toISOString(),
      expectedReturnTime: new Date(createForm.expectedReturnTime).toISOString(),
      checkInIntervalMinutes: parseInt(createForm.checkInIntervalMinutes, 10) || 60,
      weatherRisk: createForm.weatherRisk,
    };

    const res = await createExcursion(payload);
    setSubmitting(false);
    if (res.success) {
      setCreateForm((prev) => ({
        ...prev,
        purpose: '',
        destinationName: '',
        destinationLat: '',
        destinationLng: '',
        leaderId: '',
        members: [],
      }));
      setActiveTab('active');
    }
  };

  // Handle Check-In submit
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInForm.excursionId) {
      alert('Please select an active excursion.');
      return;
    }

    setSubmitting(true);
    const payload = {
      latitude: parseFloat(checkInForm.lat) || 0,
      longitude: parseFloat(checkInForm.lng) || 0,
      temperature: checkInForm.temp !== '' ? parseFloat(checkInForm.temp) : null,
      batteryLevel: checkInForm.battery !== '' ? parseInt(checkInForm.battery, 10) : null,
      notes: checkInForm.notes,
      networkAvailable: navigator.onLine,
    };

    const res = await submitCheckIn(checkInForm.excursionId, payload);
    setSubmitting(false);
    if (res.success) {
      setCheckInForm({ excursionId: '', temp: '', battery: '', lat: '', lng: '', notes: '' });
      if (selectedExcursion?._id === checkInForm.excursionId) {
        fetchCheckIns(checkInForm.excursionId);
        fetchLatestCheckIns(checkInForm.excursionId);
      }
    }
  };

  // Helper to prefill Check-In for an excursion
  const handleOpenCheckInFor = (exc) => {
    setCheckInForm((prev) => ({ ...prev, excursionId: exc._id }));
    setActiveTab('checkin');
  };

  // Filter members list by search query
  const filteredPersonnel = personnelList.filter((p) => {
    const name = p.userId?.name || '';
    const empId = p.userId?.employeeId || '';
    const des = p.userId?.designation || '';
    const q = memberSearch.toLowerCase();
    return name.toLowerCase().includes(q) || empId.toLowerCase().includes(q) || des.toLowerCase().includes(q);
  });

  // Candidate excursions for check-in: if operator, all active/overdue; if personnel, myActive
  const availableExcursionsForCheckIn = isOperator ? activeExcursions.filter((e) => ['ACTIVE', 'OVERDUE'].includes(e.status)) : myActiveExcursions;
  const currentSelectedForCheckIn = availableExcursionsForCheckIn.find((e) => e._id === checkInForm.excursionId);

  // Define tabs depending on role
  const tabs = isOperator
    ? [
        { id: 'active', label: 'Active Excursions', icon: 'explore', count: activeExcursions.length },
        { id: 'create', label: 'Register Excursion', icon: 'add_location_alt' },
        { id: 'checkin', label: 'Submit Check-in', icon: 'pin_drop' },
        { id: 'history', label: 'Excursion History', icon: 'history', count: history.length },
      ]
    : [
        { id: 'my_active', label: 'My Active Excursions', icon: 'explore', count: myActiveExcursions.length },
        { id: 'checkin', label: 'Submit Check-in', icon: 'pin_drop' },
        { id: 'history', label: 'Excursion History', icon: 'history', count: history.length },
      ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>FIELD OPERATIONS</h1>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#005B7F15', color: '#005B7F', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
              {user?.role?.replace(/_/g, ' ') || 'OPERATIONS'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Station field excursions, personnel check-in monitor, and overdue tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {pendingSyncCount > 0 && (
            <span
              title="Check-ins saved locally in PouchDB/IndexedDB awaiting network synchronization"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sync_problem</span>
              {pendingSyncCount} offline check-in{pendingSyncCount > 1 ? 's' : ''} queued
            </span>
          )}

          <button
            type="button"
            onClick={() => refreshAll()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
              padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, color: '#475569',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#005B7F' }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Dynamic Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Active in Field', value: summary.active, icon: 'directions_run', color: '#15803D', bg: '#f0fdf4' },
          { label: 'Overdue Excursions', value: summary.overdue, icon: 'warning', color: '#B91C1C', bg: '#fef2f2', pulse: summary.overdue > 0 },
          { label: 'Planned Excursions', value: summary.planned, icon: 'calendar_month', color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Completed Missions', value: summary.completed, icon: 'verified', color: '#64748B', bg: '#f8fafc' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: '#fff', border: `1px solid ${stat.pulse ? '#fca5a5' : '#E2E8F0'}`, borderRadius: '8px',
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: stat.pulse ? '0 0 12px rgba(239,68,68,0.2)' : 'none',
            }}
          >
            <div
              style={{
                width: '42px', height: '42px', borderRadius: '8px',
                backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: stat.color }}>{stat.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value || 0}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginTop: '3px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', backgroundColor: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #005B7F' : '2px solid transparent',
              marginBottom: '-2px', color: activeTab === tab.id ? '#005B7F' : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  backgroundColor: activeTab === tab.id ? '#005B7F' : '#e2e8f0',
                  color: activeTab === tab.id ? '#fff' : '#475569',
                  fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '9999px',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: ACTIVE EXCURSIONS (STATION OPERATOR) ────────────────── */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && activeExcursions.length === 0 ? (
            <div style={{ backgroundColor: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '8px', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
              <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Loading active field excursions...</p>
            </div>
          ) : activeExcursions.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px dashed #cbd5e1', padding: '3rem', textAlign: 'center', borderRadius: '8px', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>explore_off</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginTop: '0.5rem' }}>No Active Excursions</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.25rem' }}>There are currently no planned, active, or overdue field excursions for this station.</p>
              {isOperator && (
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  style={{
                    marginTop: '1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Register New Excursion
                </button>
              )}
            </div>
          ) : (
            activeExcursions.map((exc) => {
              const ss = STATUS_STYLE[exc.status] || STATUS_STYLE.PLANNED;
              const risk = RISK_STYLE[exc.weatherRisk] || RISK_STYLE.LOW;
              const isExpanded = selectedExcursion?._id === exc._id;
              const leaderName = exc.leaderId?.userId?.name || 'Assigned Leader';
              const memberCount = (exc.members?.length || 0) + 1;
              const icon = TRANSPORT_ICONS[exc.transportMode] || 'hiking';

              return (
                <div
                  key={exc._id}
                  style={{
                    backgroundColor: '#fff',
                    border: `1px solid ${exc.status === 'OVERDUE' ? '#fecaca' : '#E2E8F0'}`,
                    borderLeft: `5px solid ${ss.color}`,
                    borderRadius: '8px', overflow: 'hidden',
                    boxShadow: exc.status === 'OVERDUE' ? '0 2px 10px rgba(239,68,68,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    onClick={() => handleToggleExpand(exc)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.75rem',
                      backgroundColor: exc.status === 'OVERDUE' ? '#fff5f5' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '42px', height: '42px', borderRadius: '8px',
                          backgroundColor: `${ss.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: ss.color }}>{icon}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.95rem' }}>
                            {exc.excursionNumber}
                          </span>
                          <span
                            style={{
                              backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                              padding: '0.12rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700,
                            }}
                          >
                            {ss.label}
                          </span>
                          <span
                            style={{
                              backgroundColor: risk.bg, color: risk.color, border: `1px solid ${risk.border}`,
                              padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                            }}
                          >
                            {exc.weatherRisk} RISK
                          </span>
                          {exc.stationId && (
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                              📍 {exc.stationId.name || exc.stationId.code}
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#1e293b' }}>
                          <strong>{leaderName}</strong> <span style={{ color: '#94a3b8' }}>→</span> <strong>{exc.destination?.name || 'Field Site'}</strong> · {memberCount} personnel · {exc.transportMode?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {/* Operator Actions */}
                      {isOperator && exc.status === 'PLANNED' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startExcursion(exc._id); }}
                          style={{
                            backgroundColor: '#005B7F', color: '#fff', border: 'none',
                            padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>play_arrow</span>
                          Start Excursion
                        </button>
                      )}

                      {isOperator && ['ACTIVE', 'OVERDUE'].includes(exc.status) && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); markReturned(exc._id); }}
                          style={{
                            backgroundColor: '#15803D', color: '#fff', border: 'none',
                            padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>home</span>
                          Mark Returned
                        </button>
                      )}

                      {isOperator && exc.status === 'PLANNED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Cancel planned excursion ${exc.excursionNumber}?`)) {
                              cancelExcursion(exc._id);
                            }
                          }}
                          style={{
                            backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fecaca',
                            padding: '0.38rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      )}

                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94a3b8' }}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail & Check-in Monitor */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #E2E8F0', padding: '1.25rem', backgroundColor: '#fcfcfd' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {/* Left: Mission Info */}
                        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem 0' }}>
                            Mission Parameters
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                            <div><span style={{ color: '#64748B' }}>Purpose:</span> <strong style={{ color: '#0F172A' }}>{exc.purpose}</strong></div>
                            <div><span style={{ color: '#64748B' }}>Destination:</span> <strong style={{ color: '#0F172A' }}>{exc.destination?.name}</strong> {exc.destination?.coordinates?.latitude ? `(${exc.destination.coordinates.latitude}, ${exc.destination.coordinates.longitude})` : ''}</div>
                            <div><span style={{ color: '#64748B' }}>Departure:</span> <strong style={{ color: '#0F172A' }}>{new Date(exc.departureTime).toLocaleString('en-IN')}</strong></div>
                            <div><span style={{ color: '#64748B' }}>Expected Return:</span> <strong style={{ color: '#0F172A' }}>{new Date(exc.expectedReturnTime).toLocaleString('en-IN')}</strong></div>
                            <div><span style={{ color: '#64748B' }}>Check-in Interval:</span> <strong style={{ color: '#005B7F' }}>Every {exc.checkInIntervalMinutes} minutes</strong></div>
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                              <div style={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Assigned Team</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>LEADER</span>
                                <strong>{exc.leaderId?.userId?.name || 'Leader'}</strong> <span style={{ color: '#64748B', fontSize: '0.75rem' }}>({exc.leaderId?.userId?.employeeId})</span>
                              </div>
                              {(exc.members || []).map((m) => (
                                <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', marginLeft: '0.2rem', marginBottom: '0.15rem' }}>
                                  <span style={{ color: '#94a3b8' }}>•</span>
                                  <span>{m.userId?.name || 'Member'}</span>
                                  <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({m.userId?.employeeId || 'ID'})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Check-In Monitor */}
                        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                              Team Check-In Monitor
                            </h4>
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              Interval: <strong>{exc.checkInIntervalMinutes}m</strong>
                            </span>
                          </div>

                          {/* Member Status Grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {latestCheckIns.length === 0 ? (
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                                Loading member statuses...
                              </div>
                            ) : (
                              latestCheckIns.map((mem) => {
                                const lci = mem.latestCheckIn;
                                const isDelayed = mem.isDelayed;

                                return (
                                  <div
                                    key={mem.personnelId}
                                    style={{
                                      padding: '0.65rem 0.85rem', borderRadius: '6px',
                                      border: `1px solid ${isDelayed ? '#fecaca' : '#E2E8F0'}`,
                                      backgroundColor: isDelayed ? '#fff5f5' : '#f8fafc',
                                      display: 'flex', flexDirection: 'column', gap: '0.3rem',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{mem.name}</strong>
                                        {mem.isLeader && (
                                          <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                            LEADER
                                          </span>
                                        )}
                                      </div>
                                      {isDelayed ? (
                                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>error</span>
                                          CHECK-IN DELAYED
                                        </span>
                                      ) : lci ? (
                                        <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
                                          ACTIVE
                                        </span>
                                      ) : (
                                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748B', fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
                                          AWAITING CHECK-IN
                                        </span>
                                      )}
                                    </div>

                                    {lci ? (
                                      <div style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <span>🕒 {new Date(lci.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {lci.batteryLevel !== null && (
                                          <span style={{ color: lci.batteryLevel < 25 ? '#dc2626' : 'inherit' }}>
                                            🔋 {lci.batteryLevel}%
                                          </span>
                                        )}
                                        {lci.temperature !== null && <span>🌡 {lci.temperature}°C</span>}
                                        {lci.location?.latitude ? <span>📍 {lci.location.latitude.toFixed(2)}, {lci.location.longitude.toFixed(2)}</span> : null}
                                        {lci.notes && <span style={{ color: '#475569', fontStyle: 'italic' }}>"{lci.notes}"</span>}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        No check-in received yet. Expected every {exc.checkInIntervalMinutes}m.
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Historical Check-ins Log */}
                          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                              All Check-Ins ({checkIns.length})
                            </div>
                            {checkIns.length === 0 ? (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No check-in entries logged yet.</div>
                            ) : (
                              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {checkIns.map((ci) => (
                                  <div
                                    key={ci._id}
                                    style={{
                                      padding: '0.35rem 0.6rem', backgroundColor: '#f8fafc', borderRadius: '4px',
                                      fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}
                                  >
                                    <div>
                                      <strong>{ci.personnelId?.userId?.name || 'Personnel'}</strong> · {ci.temperature !== null ? `${ci.temperature}°C` : ''} {ci.batteryLevel !== null ? `· 🔋${ci.batteryLevel}%` : ''} · <span style={{ color: '#475569' }}>{ci.notes || 'Status OK'}</span>
                                    </div>
                                    <div style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                      {new Date(ci.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: MY ACTIVE EXCURSIONS (PERSONNEL) ──────────────────── */}
      {activeTab === 'my_active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myActiveExcursions.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px dashed #cbd5e1', padding: '3rem', textAlign: 'center', borderRadius: '8px', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>person_pin</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginTop: '0.5rem' }}>No Assigned Active Excursions</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.25rem' }}>
                You are currently not assigned to any active field excursion. When a Station Operator assigns you to a field mission, it will appear here.
              </p>
            </div>
          ) : (
            myActiveExcursions.map((exc) => {
              const ss = STATUS_STYLE[exc.status] || STATUS_STYLE.ACTIVE;
              const isLeader = exc.leaderId?.userId?._id === user?.id || exc.leaderId?.userId === user?.id;

              return (
                <div
                  key={exc._id}
                  style={{
                    backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `5px solid ${ss.color}`,
                    borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '1rem' }}>
                        {exc.excursionNumber}
                      </span>
                      <span style={{ backgroundColor: ss.bg, color: ss.color, padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {ss.label}
                      </span>
                      {isLeader && (
                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          YOU ARE TEAM LEADER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#0F172A', fontWeight: 600 }}>
                      Destination: {exc.destination?.name} · Transport: {exc.transportMode?.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
                      Team Leader: <strong>{exc.leaderId?.userId?.name}</strong> · Interval: Every {exc.checkInIntervalMinutes} min
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCheckInFor(exc)}
                    style={{
                      backgroundColor: '#005B7F', color: '#fff', border: 'none',
                      borderRadius: '6px', padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pin_drop</span>
                    Submit Check-In
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 3: REGISTER EXCURSION (STATION OPERATOR) ──────────────── */}
      {isOperator && activeTab === 'create' && (
        <div style={{ maxWidth: '800px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>add_location_alt</span>
            Register New Field Excursion
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Plan a field research excursion, assign Team Leader and Members, and configure check-in interval.
          </p>

          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Station / Research Centre (Read-only for Station Operator) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Station / Research Centre *
              </label>
              <div
                id="station-operator-assigned-station"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: '#f8fafc',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005B7F' }}>location_on</span>
                  <span>{assignedStationName} {assignedStationCode ? `(${assignedStationCode})` : ''}</span>
                </span>
                <span title="Assigned station (read-only)" style={{ fontSize: '0.9rem', color: '#64748B', display: 'flex', alignItems: 'center' }}>
                  🔒
                </span>
              </div>
            </div>

            {/* Team Leader Select (Real Personnel from MongoDB) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Team Leader (Personnel) *
              </label>
              <select
                value={createForm.leaderId}
                onChange={(e) => setCreateForm((f) => ({ ...f, leaderId: e.target.value }))}
                required
                style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
              >
                <option value="">Select Team Leader...</option>
                {personnelList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.userId?.name || 'Unknown'} — {p.userId?.designation || 'Personnel'} ({p.userId?.employeeId})
                  </option>
                ))}
              </select>
            </div>

            {/* Team Members Multi-Select (Real Personnel) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>
                  Team Members ({createForm.members.length} selected)
                </label>
                <input
                  type="text"
                  placeholder="Filter personnel..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem', backgroundColor: '#fafafa' }}>
                {filteredPersonnel.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No personnel found</div>
                ) : (
                  filteredPersonnel
                    .filter((p) => p._id !== createForm.leaderId)
                    .map((p) => {
                      const isChecked = createForm.members.includes(p._id);
                      return (
                        <label
                          key={p._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.35rem 0.5rem', borderRadius: '4px', cursor: 'pointer',
                            backgroundColor: isChecked ? '#eff6ff' : 'transparent', fontSize: '0.82rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreateForm((f) => ({ ...f, members: [...f.members, p._id] }));
                              } else {
                                setCreateForm((f) => ({ ...f, members: f.members.filter((id) => id !== p._id) }));
                              }
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? 700 : 500, color: '#0F172A' }}>
                            {p.userId?.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            ({p.userId?.employeeId} · {p.userId?.designation || 'Field'})
                          </span>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Destination & Purpose */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Destination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schirmacher Oasis / Larsemann Hills"
                  value={createForm.destinationName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, destinationName: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="-70.77"
                  value={createForm.destinationLat}
                  onChange={(e) => setCreateForm((f) => ({ ...f, destinationLat: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="11.83"
                  value={createForm.destinationLng}
                  onChange={(e) => setCreateForm((f) => ({ ...f, destinationLng: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Purpose / Scientific Objective *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe scientific goals, equipment deployed, sampling protocol..."
                value={createForm.purpose}
                onChange={(e) => setCreateForm((f) => ({ ...f, purpose: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Transport, Interval & Risk */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Transport Mode *
                </label>
                <select
                  value={createForm.transportMode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, transportMode: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="SNOWMOBILE">Snowmobile</option>
                  <option value="TRACK_VEHICLE">Snow Cat / Track Vehicle</option>
                  <option value="HELICOPTER">Helicopter</option>
                  <option value="FOOT">Foot / Ski</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Check-in Interval (mins) *
                </label>
                <input
                  type="number"
                  min="15"
                  max="720"
                  required
                  value={createForm.checkInIntervalMinutes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, checkInIntervalMinutes: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Weather Risk *
                </label>
                <select
                  value={createForm.weatherRisk}
                  onChange={(e) => setCreateForm((f) => ({ ...f, weatherRisk: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="LOW">LOW Risk</option>
                  <option value="MEDIUM">MEDIUM Risk</option>
                  <option value="HIGH">HIGH Risk</option>
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Departure Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={createForm.departureTime}
                  onChange={(e) => setCreateForm((f) => ({ ...f, departureTime: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Expected Return Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={createForm.expectedReturnTime}
                  onChange={(e) => setCreateForm((f) => ({ ...f, expectedReturnTime: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: '#005B7F', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '0.75rem 1.75rem', fontSize: '0.9rem', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                {submitting ? 'Creating Excursion...' : 'Register Excursion (PLANNED)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 4: SUBMIT FIELD CHECK-IN (PERSONNEL) ──────────────────── */}
      {activeTab === 'checkin' && (
        <div style={{ maxWidth: '640px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>pin_drop</span>
            Submit Field Check-In
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
            Transmit your operational status, battery, temperature, and GPS coordinates back to Station Operations.
          </p>

          <div
            style={{
              padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8rem', fontWeight: 600,
              backgroundColor: !navigator.onLine ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${!navigator.onLine ? '#fed7aa' : '#bbf7d0'}`,
              color: !navigator.onLine ? '#c2410c' : '#15803D',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {!navigator.onLine ? 'wifi_off' : 'cloud_done'}
            </span>
            {!navigator.onLine
              ? 'OFFLINE MODE — Check-in will be saved locally in PouchDB and synced automatically when satellite link restores.'
              : 'ONLINE MODE — Check-in will be verified and delivered immediately to MongoDB.'}
          </div>

          <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Select Active Excursion *
              </label>
              <select
                value={checkInForm.excursionId}
                onChange={(e) => setCheckInForm((f) => ({ ...f, excursionId: e.target.value }))}
                required
                style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
              >
                <option value="">Choose excursion...</option>
                {availableExcursionsForCheckIn.map((exc) => (
                  <option key={exc._id} value={exc._id}>
                    {exc.excursionNumber} — {exc.destination?.name || 'Destination'} ({exc.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Read-only details from backend when excursion selected */}
            {currentSelectedForCheckIn && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Team Leader:</span>{' '}
                  <strong>{currentSelectedForCheckIn.leaderId?.userId?.name || 'Leader'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Destination:</span>{' '}
                  <strong>{currentSelectedForCheckIn.destination?.name}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Interval:</span>{' '}
                  <strong>Every {currentSelectedForCheckIn.checkInIntervalMinutes}m</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. -18"
                  value={checkInForm.temp}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, temp: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Battery Level (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 85"
                  value={checkInForm.battery}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, battery: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="-70.7700"
                  value={checkInForm.lat}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, lat: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="11.8300"
                  value={checkInForm.lng}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, lng: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Current Situation / Operational Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. All members safe. Reached sampling area. Equipment functioning normally."
                value={checkInForm.notes}
                onChange={(e) => setCheckInForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#005B7F', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {submitting ? 'Transmitting Check-In...' : 'Submit Field Check-In'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 5: EXCURSION HISTORY ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px dashed #cbd5e1', padding: '3rem', textAlign: 'center', borderRadius: '8px', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>history_toggle_off</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginTop: '0.5rem' }}>No Excursion History</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.25rem' }}>Completed and cancelled missions will be preserved here.</p>
            </div>
          ) : (
            history.map((exc) => {
              const ss = STATUS_STYLE[exc.status] || STATUS_STYLE.COMPLETED;
              const isExpanded = selectedExcursion?._id === exc._id;

              return (
                <div
                  key={exc._id}
                  style={{
                    backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `5px solid ${ss.color}`,
                    borderRadius: '8px', overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => handleToggleExpand(exc)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.95rem' }}>
                          {exc.excursionNumber}
                        </span>
                        <span style={{ backgroundColor: ss.bg, color: ss.color, padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {ss.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {exc.transportMode?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#1e293b' }}>
                        <strong>{exc.leaderId?.userId?.name || 'Leader'}</strong> <span style={{ color: '#94a3b8' }}>→</span> <strong>{exc.destination?.name}</strong> · {(exc.members?.length || 0) + 1} personnel
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                        {exc.actualReturnTime ? `Returned: ${new Date(exc.actualReturnTime).toLocaleString('en-IN')}` : `Departure: ${new Date(exc.departureTime).toLocaleDateString('en-IN')}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#005B7F' }}>
                        {isExpanded ? 'Hide Details' : 'View Details & Logs'}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94a3b8' }}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #E2E8F0', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            Historical Mission Details
                          </h4>
                          <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div><span style={{ color: '#64748B' }}>Purpose:</span> {exc.purpose}</div>
                            <div><span style={{ color: '#64748B' }}>Departure:</span> {new Date(exc.departureTime).toLocaleString('en-IN')}</div>
                            <div><span style={{ color: '#64748B' }}>Expected Return:</span> {new Date(exc.expectedReturnTime).toLocaleString('en-IN')}</div>
                            {exc.actualReturnTime && <div><span style={{ color: '#64748B' }}>Actual Return:</span> {new Date(exc.actualReturnTime).toLocaleString('en-IN')}</div>}
                            <div><span style={{ color: '#64748B' }}>Leader:</span> {exc.leaderId?.userId?.name}</div>
                            <div><span style={{ color: '#64748B' }}>Members:</span> {(exc.members || []).map((m) => m.userId?.name).join(', ') || 'None'}</div>
                          </div>
                        </div>

                        <div>
                          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            Logged Check-Ins ({checkIns.length})
                          </h4>
                          {checkIns.length === 0 ? (
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No check-in entries logged.</div>
                          ) : (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {checkIns.map((ci) => (
                                <div key={ci._id} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '0.75rem' }}>
                                  <strong>{ci.personnelId?.userId?.name}</strong> · {new Date(ci.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ci.notes || 'Status OK'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default FieldOpsDashboard;
