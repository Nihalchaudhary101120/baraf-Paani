import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSOSContext } from '@/context/SOSContext';
import { useLocationContext } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import TacticalPolarMap from '@/components/emergency/TacticalPolarMap';
import TriggerSOSModal from '@/components/emergency/TriggerSOSModal';
import VolunteerResponseModal from '@/components/emergency/VolunteerResponseModal';
import ResolveSOSModal from '@/components/emergency/ResolveSOSModal';
import RespondingPersonnelModal from '@/components/emergency/RespondingPersonnelModal';
import AssignTeamModal from '@/components/emergency/AssignTeamModal';
import IncidentTimeline from '@/components/emergency/IncidentTimeline';
import OfflineStatusBadge from '@/components/emergency/OfflineStatusBadge';

const SEVERITY_CONFIG = {
  CRITICAL: { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5', label: 'CRITICAL', pulse: true },
  HIGH:     { bg: '#FFF7ED', color: '#EA580C', border: '#FDBA74', label: 'HIGH', pulse: false },
  MEDIUM:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: 'MEDIUM', pulse: false },
  LOW:      { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'LOW', pulse: false }
};

const STATUS_CONFIG = {
  TRIGGERED:            { bg: '#FEF2F2', color: '#DC2626', label: '🔴 TRIGGERED' },
  ACKNOWLEDGED:         { bg: '#EFF6FF', color: '#2563EB', label: '🔵 ACKNOWLEDGED' },
  ASSESSING:            { bg: '#FFFBEB', color: '#D97706', label: '🟡 ASSESSING' },
  RESPONSE_ASSIGNED:    { bg: '#F5F3FF', color: '#7C3AED', label: '🟣 ASSIGNED' },
  RESPONDER_DISPATCHED: { bg: '#ECFDF5', color: '#059669', label: '🟢 DISPATCHED' },
  ON_SITE:              { bg: '#F0FDF4', color: '#16A34A', label: '📍 ON-SITE' },
  STABILIZED:           { bg: '#F0FDF4', color: '#15803D', label: '🛡 STABILIZED' },
  RESOLVED:             { bg: '#F1F5F9', color: '#475569', label: '✅ RESOLVED' },
  CANCELLED:            { bg: '#F1F5F9', color: '#94A3B8', label: '⚪ CANCELLED' },
  OPEN:                 { bg: '#FEF2F2', color: '#DC2626', label: '🔴 OPEN' },
  RESPONDING:           { bg: '#ECFDF5', color: '#059669', label: '🟢 RESPONDING' }
};

const QUALIFICATION_BADGES = {
  HIGHLY_QUALIFIED: { bg: '#DCFCE7', color: '#15803D', text: 'DIRECTLY QUALIFIED' },
  QUALIFIED:        { bg: '#E0F2FE', color: '#0369A1', text: 'QUALIFIED' },
  GENERAL:          { bg: '#F1F5F9', color: '#475569', text: 'GENERAL RESPONDER' }
};

const SOSDashboard = () => {
  const { user } = useAuth();
  const {
    activeSosList,
    currentSos,
    setCurrentSos,
    responders,
    myResponseStatus,
    candidates,
    loading,
    actionLoading,
    pendingSyncCount,
    syncNow,
    fetchActiveSOS,
    fetchSOSById,
    fetchSOSResponders,
    acknowledgeSOS,
    assessSOS,
    volunteerForSOS,
    standDownVolunteer,
    updateResponseStatus,
    assignResponseTeam,
    acceptResponder,
    declineVolunteer,
    assignResponder,
    updateStatus,
    fetchCandidates
  } = useSOSContext();

  const { location, getCurrentLocation } = useLocationContext();

  // Modals state
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [volunteerTargetSos, setVolunteerTargetSos] = useState(null);
  const [resolveTargetSos, setResolveTargetSos] = useState(null);
  const [personnelModalSos, setPersonnelModalSos] = useState(null);
  const [assignTeamModalTarget, setAssignTeamModalTarget] = useState(null);
  const [standDownConfirmSos, setStandDownConfirmSos] = useState(null);

  // Manual assignment panel
  const [selectedCandidateUserId, setSelectedCandidateUserId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [showManualAssignPanel, setShowManualAssignPanel] = useState(false);

  // Role permissions
  const isCommanderOrOperator =
    user?.role === 'STATION_COMMANDER' ||
    user?.role === 'STATION_OPERATOR' ||
    user?.role === 'HQ_COMMAND' ||
    user?.role === 'HQ_ADMIN';

  // Ref to map container for smooth scrolling
  const mapContainerRef = useRef(null);

  // Select initial SOS if none selected
  useEffect(() => {
    if (activeSosList.length > 0 && !currentSos) {
      setCurrentSos(activeSosList[0]);
    }
  }, [activeSosList, currentSos, setCurrentSos]);

  // Load full timeline and candidates when currentSos changes
  useEffect(() => {
    if (currentSos?._id) {
      fetchSOSById(currentSos._id);
      if (isCommanderOrOperator) {
        fetchCandidates(currentSos._id);
      }
    }
  }, [currentSos?._id, fetchSOSById, fetchCandidates, isCommanderOrOperator]);

  // Status counters
  const openCount = activeSosList.filter(
    (s) => s.status === 'TRIGGERED' || s.status === 'OPEN' || s.status === 'ACKNOWLEDGED'
  ).length;
  const assessingCount = activeSosList.filter((s) => s.status === 'ASSESSING').length;
  const respondingCount = activeSosList.filter(
    (s) => s.status === 'RESPONSE_ASSIGNED' || s.status === 'RESPONDER_DISPATCHED' || s.status === 'ON_SITE' || s.status === 'RESPONDING'
  ).length;
  const stabilizedCount = activeSosList.filter((s) => s.status === 'STABILIZED').length;

  const handleManualAssignSubmit = async (e) => {
    e.preventDefault();
    if (!currentSos || !selectedCandidateUserId) return;
    const res = await assignResponder(currentSos._id, {
      userId: selectedCandidateUserId,
      notes: assignmentNote
    });
    if (res.success) {
      setSelectedCandidateUserId('');
      setAssignmentNote('');
      setShowManualAssignPanel(false);
    }
  };

  // Helper to check if current user is responding to an incident
  const checkUserResponding = (sos) => {
    if (!user || !sos) return false;
    const all = sos.responders || sos.volunteers || [];
    return all.some(
      (r) =>
        (r.userId?._id || r.userId)?.toString() === (user._id || user.id)?.toString() &&
        r.status !== 'STOOD_DOWN' &&
        r.status !== 'DECLINED'
    );
  };

  const getUserStatusInSos = (sos) => {
    if (!user || !sos) return null;
    const all = sos.responders || sos.volunteers || [];
    const found = all.find(
      (r) =>
        (r.userId?._id || r.userId)?.toString() === (user._id || user.id)?.toString() &&
        r.status !== 'STOOD_DOWN'
    );
    return found ? found.status : null;
  };

  // Responders list for current incident
  const activeRespondersList = useMemo(() => {
    if (!currentSos) return [];
    const source = (currentSos.responders && currentSos.responders.length > 0)
      ? currentSos.responders
      : (currentSos.volunteers || []);
    return source.filter((r) => r.status !== 'STOOD_DOWN' && r.status !== 'DECLINED');
  }, [currentSos]);

  // Compute Intelligence metrics
  const intelligenceStats = useMemo(() => {
    const list = activeRespondersList;
    let closest = null;
    let closestTrained = null;

    list.forEach((r) => {
      if (r.distanceKm != null) {
        if (!closest || r.distanceKm < closest.distanceKm) {
          closest = r;
        }
        if (r.qualificationMatch === 'HIGHLY_QUALIFIED' || r.qualificationMatch === 'QUALIFIED') {
          if (!closestTrained || r.distanceKm < closestTrained.distanceKm) {
            closestTrained = r;
          }
        }
      }
    });

    const assignedCount = list.filter((r) => r.assigned).length;

    return {
      total: list.length,
      closest,
      closestTrained,
      assignedCount
    };
  }, [activeRespondersList]);

  const isCurrentSosMyIncident =
    (currentSos?.userId?._id || currentSos?.userId)?.toString() === (user?._id || user?.id)?.toString();

  const isCurrentSosResponding = checkUserResponding(currentSos);
  const currentSosUserStatus = getUserStatusInSos(currentSos);

  const scrollToMap = () => {
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: "'Inter', sans-serif" }}>

      {/* ── 1. Page Header with Status & Deliberate Trigger Button ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1rem',
        borderBottom: '2px solid #E2E8F0',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#0F172A',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#DC2626' }}>emergency</span>
            NIRANTRA EMERGENCY SOS & RAPID RESPONSE SYSTEM
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
            Station-Wide Voluntary Emergency Response & Command Coordination Grid · Live Telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OfflineStatusBadge />

          <button
            type="button"
            onClick={() => fetchActiveSOS(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: loading ? 'spin 1s infinite linear' : 'none' }}>sync</span>
            Refresh Feed
          </button>

          {/* HIGH VISIBILITY SOS BUTTON */}
          <button
            type="button"
            id="trigger-sos-main-btn"
            onClick={() => setShowTriggerModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              animation: openCount > 0 ? 'pulse-red-btn 2s infinite' : 'none'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>crisis_alert</span>
            TRIGGER SOS
          </button>
        </div>
      </div>

      {/* ── Offline Queue Notification Banner ── */}
      {pendingSyncCount > 0 && (
        <div style={{
          backgroundColor: '#FFF7ED',
          border: '1.5px solid #FDBA74',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#9A3412',
          fontSize: '0.82rem',
          fontWeight: 700,
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#EA580C' }}>cloud_off</span>
            <span><strong>OFFLINE QUEUE ACTIVE:</strong> {pendingSyncCount} SOS incident(s) stored locally in PouchDB awaiting transmission to Station Command.</span>
          </div>
          <button
            type="button"
            onClick={syncNow}
            style={{
              backgroundColor: '#EA580C',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.4rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
            SYNC NOW
          </button>
        </div>
      )}

      {/* ── 2. Metric Counters Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Active Incidents', value: openCount, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: 'emergency' },
          { label: 'Assessing Situation', value: assessingCount, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: 'radar' },
          { label: 'Responders Dispatched', value: respondingCount, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: 'near_me' },
          { label: 'Stabilized / Securing', value: stabilizedCount, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: 'health_and_safety' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{card.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.72rem', color: card.color, fontWeight: 700, textTransform: 'uppercase', marginTop: '0.15rem' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Main Split Console: Incident Feed (Left) & Command Center (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '370px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ACTIVE INCIDENTS FEED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Station SOS Feed ({activeSosList.length})
            </span>
            <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} /> Live Synced
            </span>
          </div>

          {activeSosList.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#10B981', marginBottom: '0.5rem' }}>verified_user</span>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>No Active Emergencies</div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem' }}>All station personnel and field teams report safe status.</p>
            </div>
          ) : (
            activeSosList.map((sos) => {
              const sev = SEVERITY_CONFIG[sos.severity] || SEVERITY_CONFIG.HIGH;
              const stat = STATUS_CONFIG[sos.status] || STATUS_CONFIG.TRIGGERED;
              const isSelected = currentSos?._id === sos._id;
              const isResponding = checkUserResponding(sos);
              const myStatus = getUserStatusInSos(sos);
              const rCount = sos.responderCount || (sos.responders?.length) || (sos.volunteers?.filter(v => v.status !== 'STOOD_DOWN' && v.status !== 'DECLINED').length) || 0;

              return (
                <div
                  key={sos._id}
                  onClick={() => setCurrentSos(sos)}
                  style={{
                    backgroundColor: isSelected ? '#FEF2F2' : '#FFFFFF',
                    border: `1.5px solid ${isSelected ? '#F87171' : '#E2E8F0'}`,
                    borderLeft: `5px solid ${sev.color}`,
                    borderRadius: '8px',
                    padding: '0.9rem 1rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(220, 38, 38, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#DC2626', fontSize: '0.85rem' }}>
                      {sos.sosNumber}
                    </span>
                    <span style={{
                      backgroundColor: stat.bg,
                      color: stat.color,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.65rem',
                      fontWeight: 800
                    }}>
                      {stat.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                      {sos.emergencyType?.replace('_', ' ')}
                    </span>
                    <span style={{
                      backgroundColor: sev.bg,
                      color: sev.color,
                      border: `1px solid ${sev.border}`,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '0.62rem',
                      fontWeight: 800
                    }}>
                      {sev.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div>👤 Reported by {sos.triggeredByName || 'Personnel'}</div>
                    {sos.location?.addressOrDesc && (
                      <div>📍 {sos.location.addressOrDesc}</div>
                    )}
                    {sos.distanceToUserKm != null && (
                      <div style={{ color: '#0284C7', fontWeight: 600 }}>
                        📏 {sos.distanceToUserKm} km from you
                      </div>
                    )}
                  </div>

                  {/* Live Responder Count Badge */}
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPersonnelModalSos(sos);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#0284C7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>group</span>
                      {rCount} {rCount === 1 ? 'Personnel' : 'Personnel'} Responding
                    </button>
                  </div>

                  {/* ── CARD VOLUNTEER RESPONSE ACTION BAR ── */}
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                    {sos.status === 'RESOLVED' ? (
                      <div style={{ color: '#16A34A', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>task_alt</span>
                        ✓ RESOLVED · Incident Closed
                      </div>
                    ) : isResponding ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          ✓ YOU ARE RESPONDING
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <select
                            onClick={(e) => e.stopPropagation()}
                            value={myStatus || 'RESPONDING'}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateResponseStatus(sos._id, e.target.value);
                            }}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 4px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="RESPONDING">RESPONDING</option>
                            <option value="ON_THE_WAY">ON THE WAY</option>
                            <option value="ON_SITE">ON SITE</option>
                            <option value="ASSISTING">ASSISTING</option>
                          </select>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStandDownConfirmSos(sos);
                            }}
                            title="I'm no longer responding"
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Stand Down
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            volunteerForSOS(sos._id);
                          }}
                          style={{
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>near_me</span>
                          I'M RESPONDING
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED INCIDENT OPERATIONS CENTER */}
        {currentSos ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Incident Header Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#DC2626' }}>emergency</span>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                      {currentSos.sosNumber} · {currentSos.emergencyType?.replace('_', ' ')}
                    </h2>
                    <span style={{
                      backgroundColor: (SEVERITY_CONFIG[currentSos.severity] || SEVERITY_CONFIG.HIGH).bg,
                      color: (SEVERITY_CONFIG[currentSos.severity] || SEVERITY_CONFIG.HIGH).color,
                      border: `1px solid ${(SEVERITY_CONFIG[currentSos.severity] || SEVERITY_CONFIG.HIGH).border}`,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {currentSos.severity} SEVERITY
                    </span>
                  </div>

                  <p style={{ margin: '0.5rem 0 0', color: '#334155', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {currentSos.description}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748B' }}>
                    <span>📍 Station: <strong>{currentSos.stationId?.name || currentSos.stationId?.code || 'Base'}</strong></span>
                    <span>👤 Personnel: <strong>{currentSos.triggeredByName || currentSos.userId?.name} ({currentSos.triggeredByRole || currentSos.userId?.role})</strong></span>
                    <span>🕒 Triggered: <strong>{new Date(currentSos.createdAt).toLocaleString()}</strong></span>
                    {currentSos.location?.accuracy && (
                      <span style={{ color: '#059669', fontWeight: 600 }}>🛰 GPS Accuracy: ±{Math.round(currentSos.location.accuracy)}m</span>
                    )}
                  </div>
                </div>

                {/* Status Badge & Responders Quick Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{
                    backgroundColor: (STATUS_CONFIG[currentSos.status] || STATUS_CONFIG.TRIGGERED).bg,
                    color: (STATUS_CONFIG[currentSos.status] || STATUS_CONFIG.TRIGGERED).color,
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    border: '1px solid currentColor'
                  }}>
                    {(STATUS_CONFIG[currentSos.status] || STATUS_CONFIG.TRIGGERED).label}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPersonnelModalSos(currentSos)}
                    style={{
                      backgroundColor: '#F0F9FF',
                      color: '#0284C7',
                      border: '1px solid #BAE6FD',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    👥 {activeRespondersList.length} PERSONNEL RESPONDING
                  </button>
                </div>
              </div>

              {/* ── RESPONDER & COMMAND TOOLBAR ── */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                gap: '0.65rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {/* Left: Volunteer Response Controls for logged in personnel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {currentSos.status === 'RESOLVED' ? (
                    <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>task_alt</span>
                      INCIDENT RESOLVED · Location tracking disabled
                    </span>
                  ) : isCurrentSosResponding ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ YOU ARE RESPONDING
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 600 }}>Status:</span>
                        <select
                          disabled={actionLoading}
                          value={currentSosUserStatus || 'RESPONDING'}
                          onChange={(e) => updateResponseStatus(currentSos._id, e.target.value)}
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #6EE7B7',
                            backgroundColor: '#FFFFFF',
                            color: '#065F46',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="RESPONDING">RESPONDING</option>
                          <option value="ON_THE_WAY">ON THE WAY</option>
                          <option value="ON_SITE">ON SITE</option>
                          <option value="ASSISTING">ASSISTING</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setStandDownConfirmSos(currentSos)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          I'M NO LONGER RESPONDING
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => volunteerForSOS(currentSos._id)}
                      style={{
                        backgroundColor: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.5rem 1.1rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>near_me</span>
                      I'M RESPONDING
                    </button>
                  )}

                  {/* Commander/Operator Coordination Shortcuts */}
                  {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPersonnelModalSos(currentSos)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#334155',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                        VIEW RESPONDERS ({activeRespondersList.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignTeamModalTarget(activeRespondersList[0] || null)}
                        style={{
                          backgroundColor: '#7C3AED',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.95rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
                        ASSIGN RESPONSE TEAM
                      </button>
                    </>
                  )}
                </div>

                {/* Right: Commander Lifecycle Progression Actions */}
                {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {currentSos.status === 'TRIGGERED' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => acknowledgeSOS(currentSos._id)}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        Acknowledge SOS
                      </button>
                    )}

                    {(currentSos.status === 'TRIGGERED' || currentSos.status === 'ACKNOWLEDGED') && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => assessSOS(currentSos._id)}
                        style={{
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>radar</span>
                        Start Assessment
                      </button>
                    )}

                    {currentSos.status === 'RESPONSE_ASSIGNED' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => updateStatus(currentSos._id, 'RESPONDER_DISPATCHED', 'Responders formally dispatched by Station Commander')}
                        style={{
                          backgroundColor: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>near_me</span>
                        Mark Dispatched
                      </button>
                    )}

                    {currentSos.status === 'RESPONDER_DISPATCHED' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => updateStatus(currentSos._id, 'ON_SITE', 'Responder team arrived on-site')}
                        style={{
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pin_drop</span>
                        Mark On-Site
                      </button>
                    )}

                    {currentSos.status === 'ON_SITE' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => updateStatus(currentSos._id, 'STABILIZED', 'Incident secured and situation stabilized')}
                        style={{
                          backgroundColor: '#0D9488',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>health_and_safety</span>
                        Mark Stabilized
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setResolveTargetSos(currentSos)}
                      style={{
                        backgroundColor: '#15803D',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>task_alt</span>
                      Resolve Incident
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── TACTICAL POLAR MAP DISPLAY (SECTION 6) ── */}
            <div ref={mapContainerRef}>
              <TacticalPolarMap
                sosLocation={currentSos.location}
                emergencyType={currentSos.emergencyType}
                responders={activeRespondersList}
                stationLocation={currentSos.stationId?.location}
                stationName={currentSos.stationId?.name || currentSos.stationId?.code || 'Base Station'}
                sosNumber={currentSos.sosNumber}
                distanceKm={currentSos.assignedResponder?.distanceKm || (activeRespondersList[0]?.distanceKm)}
              />
            </div>

            {/* ── COMMAND RESPONSE STATUS & INTELLIGENCE PANEL (SECTION 15 & 16) ── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#0284C7' }}>vital_signs</span>
                    SOS RESPONSE STATUS & COORDINATION
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                    Voluntary responders & formal command assignment overview · Incident {currentSos.sosNumber}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={scrollToMap}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>radar</span>
                    VIEW ALL ON MAP
                  </button>

                  {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => setAssignTeamModalTarget(activeRespondersList[0] || null)}
                      style={{
                        backgroundColor: '#7C3AED',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
                      ASSIGN RESPONSE TEAM
                    </button>
                  )}
                </div>
              </div>

              {/* Automatic Response Intelligence Box (Section 16) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
                marginBottom: '1.25rem',
                padding: '0.9rem 1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Active Volunteers
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                    👥 {intelligenceStats.total} {intelligenceStats.total === 1 ? 'personnel' : 'personnel'} responding
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Closest Responder
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0284C7', marginTop: '0.2rem' }}>
                    {intelligenceStats.closest
                      ? `${intelligenceStats.closest.name} — ${intelligenceStats.closest.distanceKm != null ? `${intelligenceStats.closest.distanceKm} km` : 'Detected'}`
                      : 'Pending coordinates'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Closest Trained Responder
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#16A34A', marginTop: '0.2rem' }}>
                    {intelligenceStats.closestTrained
                      ? `${intelligenceStats.closestTrained.name} — ${intelligenceStats.closestTrained.distanceKm != null ? `${intelligenceStats.closestTrained.distanceKm} km` : 'En route'}`
                      : 'None directly qualified yet'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Formal Response Team
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: intelligenceStats.assignedCount > 0 ? '#7C3AED' : '#D97706', marginTop: '0.2rem' }}>
                    {intelligenceStats.assignedCount > 0 ? `${intelligenceStats.assignedCount} Assigned to Formal Team` : 'Not Formally Assigned'}
                  </div>
                </div>
              </div>

              {/* Table of Responding Personnel (Section 15) */}
              {activeRespondersList.length === 0 ? (
                <div style={{
                  padding: '1.75rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '0.82rem'
                }}>
                  No station personnel have volunteered for this SOS yet. Station Commander can assign responders manually below.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>PERSONNEL</th>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>ROLE</th>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>DISTANCE</th>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>VOLUNTEER STATUS</th>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>COMMAND ASSIGNMENT</th>
                        {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRespondersList.map((resp) => {
                        const uId = resp.userId?._id || resp.userId;
                        const isCurrentUser = (user?._id || user?.id)?.toString() === uId?.toString();
                        const qBadge = QUALIFICATION_BADGES[resp.qualificationMatch] || QUALIFICATION_BADGES.GENERAL;

                        return (
                          <tr key={resp._id || uId} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: isCurrentUser ? '#F0F9FF' : '#FFFFFF' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />
                                <span>{resp.name}</span>
                                {isCurrentUser && (
                                  <span style={{ fontSize: '0.65rem', backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                    YOU
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <span style={{ fontWeight: 600, color: '#334155' }}>{resp.role}</span>
                              <span style={{
                                marginLeft: '0.4rem',
                                backgroundColor: qBadge.bg,
                                color: qBadge.color,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                fontWeight: 800
                              }}>
                                {qBadge.text}
                              </span>
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0284C7' }}>
                              {resp.distanceKm != null ? `${resp.distanceKm} km` : 'Location unavailable'}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <span style={{
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800
                              }}>
                                {resp.status?.replace(/_/g, ' ') || 'RESPONDING'}
                              </span>
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              {resp.assigned ? (
                                <span style={{
                                  backgroundColor: '#F5F3FF',
                                  color: '#7C3AED',
                                  border: '1px solid #DDD6FE',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}>
                                  🛡 {resp.teamName || 'Team Alpha'}
                                </span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 600 }}>
                                  Not Formally Assigned
                                </span>
                              )}
                            </td>

                            {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                  {!resp.assigned && (
                                    <button
                                      type="button"
                                      onClick={() => setAssignTeamModalTarget(resp)}
                                      style={{
                                        backgroundColor: '#7C3AED',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Assign Team
                                    </button>
                                  )}

                                  <select
                                    disabled={actionLoading}
                                    value={resp.status || 'RESPONDING'}
                                    onChange={(e) => updateResponseStatus(currentSos._id, e.target.value, '', uId, resp._id)}
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #CBD5E1',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="RESPONDING">RESPONDING</option>
                                    <option value="ON_THE_WAY">ON THE WAY</option>
                                    <option value="ON_SITE">ON SITE</option>
                                    <option value="ASSISTING">ASSISTING</option>
                                    <option value="STOOD_DOWN">STAND DOWN</option>
                                  </select>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Manual Command Dispatch Override Button */}
              {isCommanderOrOperator && currentSos.status !== 'RESOLVED' && (
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualAssignPanel((prev) => !prev)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {showManualAssignPanel ? 'Hide Manual Override' : '+ Manual Commander Override'}
                  </button>
                </div>
              )}

              {/* Manual Assign Panel */}
              {showManualAssignPanel && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.4rem' }}>
                    Manual Responder Assignment (Command Force Dispatch)
                  </div>
                  <form onSubmit={handleManualAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <select
                        required
                        value={selectedCandidateUserId}
                        onChange={(e) => setSelectedCandidateUserId(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.82rem'
                        }}
                      >
                        <option value="">Select available station personnel...</option>
                        {candidates.map((cand) => (
                          <option key={cand._id} value={cand._id}>
                            {cand.name} — {cand.role} ({cand.qualificationMatch.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={assignmentNote}
                        onChange={(e) => setAssignmentNote(e.target.value)}
                        placeholder="Direct instructions or equipment orders..."
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowManualAssignPanel(false)}
                        style={{ padding: '0.4rem 0.8rem', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedCandidateUserId || actionLoading}
                        style={{
                          padding: '0.4rem 0.9rem',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: '#0F172A',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Confirm Assignment
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* ── INCIDENT TIMELINE & AUDIT ── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <IncidentTimeline
                timeline={currentSos.timeline || []}
                currentStatus={currentSos.status}
              />
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#64748B'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94A3B8', marginBottom: '0.75rem' }}>emergency_share</span>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A' }}>Select an Incident from the Feed</h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
              Choose an active SOS from the left panel to inspect GPS telemetry, volunteer responders, and command dispatch controls.
            </p>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <TriggerSOSModal
        isOpen={showTriggerModal}
        onClose={() => setShowTriggerModal(false)}
      />

      {volunteerTargetSos && (
        <VolunteerResponseModal
          isOpen={Boolean(volunteerTargetSos)}
          onClose={() => setVolunteerTargetSos(null)}
          sos={volunteerTargetSos}
        />
      )}

      {resolveTargetSos && (
        <ResolveSOSModal
          isOpen={Boolean(resolveTargetSos)}
          onClose={() => setResolveTargetSos(null)}
          sos={resolveTargetSos}
        />
      )}

      {personnelModalSos && (
        <RespondingPersonnelModal
          isOpen={Boolean(personnelModalSos)}
          onClose={() => setPersonnelModalSos(null)}
          sos={personnelModalSos}
          onViewOnMap={() => {
            setCurrentSos(personnelModalSos);
            scrollToMap();
          }}
          onOpenAssignTeam={(resp) => {
            setPersonnelModalSos(null);
            setAssignTeamModalTarget(resp);
          }}
        />
      )}

      {assignTeamModalTarget && (
        <AssignTeamModal
          isOpen={Boolean(assignTeamModalTarget)}
          onClose={() => setAssignTeamModalTarget(null)}
          sos={currentSos}
          initialResponder={assignTeamModalTarget}
        />
      )}

      {/* Confirmation Modal for Standing Down */}
      {standDownConfirmSos && (
        <>
          <div
            onClick={() => setStandDownConfirmSos(null)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9998 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              zIndex: 9999,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              Confirm Stand Down
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
              Are you sure you want to stop responding to <strong>{standDownConfirmSos.sosNumber}</strong>? Station Command will be notified that you are standing down.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStandDownConfirmSos(null)}
                style={{ padding: '0.45rem 0.85rem', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Keep Responding
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  const target = standDownConfirmSos;
                  setStandDownConfirmSos(null);
                  await standDownVolunteer(target._id);
                }}
                style={{ padding: '0.45rem 0.95rem', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Yes, Stand Down
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SOSDashboard;
