import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSOSContext } from '@/context/SOSContext';
import { useAuth } from '@/context/AuthContext';
import RespondingPersonnelModal from './RespondingPersonnelModal';

const ActiveSOSAlertBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    activeSosList,
    volunteerForSOS,
    updateResponseStatus,
    actionLoading
  } = useSOSContext();

  const [personnelModalSos, setPersonnelModalSos] = useState(null);

  if (!activeSosList || activeSosList.length === 0) return null;

  // Show the highest severity active incident first
  const highestSos = activeSosList[0];

  const isMyIncident =
    (highestSos.userId?._id || highestSos.userId)?.toString() === (user?._id || user?.id)?.toString();

  const isAssignedToMe =
    (highestSos.assignedResponder?.userId?._id || highestSos.assignedResponder?.userId)?.toString() === (user?._id || user?.id)?.toString();

  const userRespondingRecord = (highestSos.responders || highestSos.volunteers || []).find(
    (v) =>
      (v.userId?._id || v.userId)?.toString() === (user?._id || user?.id)?.toString() &&
      v.status !== 'STOOD_DOWN' &&
      v.status !== 'DECLINED'
  );

  const didIVolunteer = Boolean(userRespondingRecord);
  const myVolunteerStatus = userRespondingRecord ? userRespondingRecord.status : null;
  const isCritical = highestSos.severity === 'CRITICAL';
  const responderCount = highestSos.responderCount || (highestSos.responders?.length) || (highestSos.volunteers?.filter(v => v.status !== 'STOOD_DOWN' && v.status !== 'DECLINED').length) || 0;

  return (
    <>
      <div style={{
        backgroundColor: isCritical ? '#DC2626' : '#EA580C',
        color: '#FFFFFF',
        padding: '0.65rem 1.25rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(220, 38, 38, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        animation: isCritical ? 'pulse-red 2.5s infinite' : 'none',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Left: Indicator & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>emergency</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.02em' }}>
                🚨 ACTIVE {highestSos.severity} SOS: {highestSos.emergencyType?.replace('_', ' ')}
              </span>
              <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {highestSos.stationId?.name || highestSos.stationId?.code || 'Antarctic Station'}
              </span>
              <span style={{
                backgroundColor: '#0F172A',
                color: '#38BDF8',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700
              }}>
                {highestSos.sosNumber}
              </span>

              {/* Clickable Responder Count */}
              <button
                type="button"
                onClick={() => setPersonnelModalSos(highestSos)}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1px 7px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                👥 {responderCount} Responding
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#FEE2E2', marginTop: '0.15rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>Status: <strong>{highestSos.status?.replace('_', ' ')}</strong></span>
              {highestSos.distanceToUserKm != null && (
                <span>📍 <strong>{highestSos.distanceToUserKm} km</strong> from your position</span>
              )}
              {highestSos.location?.addressOrDesc && (
                <span>Sector: {highestSos.location.addressOrDesc}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isAssignedToMe ? (
            <span style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sensors</span>
              YOU ARE DISPATCHED RESPONDER
            </span>
          ) : didIVolunteer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 800 }}>
                ✓ YOU ARE RESPONDING
              </span>
              <select
                value={myVolunteerStatus || 'RESPONDING'}
                onChange={(e) => updateResponseStatus(highestSos._id, e.target.value)}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: 'none',
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
            </div>
          ) : !isMyIncident && highestSos.status !== 'RESOLVED' ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => volunteerForSOS(highestSos._id)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>near_me</span>
              I'M RESPONDING
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => navigate('/dashboard/sos')}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.4)',
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
            COMMAND CENTER →
          </button>
        </div>
      </div>

      {personnelModalSos && (
        <RespondingPersonnelModal
          isOpen={Boolean(personnelModalSos)}
          onClose={() => setPersonnelModalSos(null)}
          sos={personnelModalSos}
          onViewOnMap={() => {
            navigate('/dashboard/sos');
          }}
        />
      )}
    </>
  );
};

export default ActiveSOSAlertBanner;
