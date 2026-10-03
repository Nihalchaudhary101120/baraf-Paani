import React, { useState, useEffect } from 'react';
import { useLocationContext } from '@/context/LocationContext';
import { useSOSContext } from '@/context/SOSContext';
import { useAuth } from '@/context/AuthContext';

const VolunteerResponseModal = ({ isOpen, onClose, sos }) => {
  const { user } = useAuth();
  const { location, accuracy, isLoading: isLocLoading, getCurrentLocation } = useLocationContext();
  const { volunteerResponse, actionLoading } = useSOSContext();

  const [notes, setNotes] = useState('');
  const [locData, setLocData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      getCurrentLocation({ enableHighAccuracy: true }).then((res) => {
        if (res && res.isAvailable) {
          setLocData(res);
        }
      });
    }
  }, [isOpen, getCurrentLocation]);

  if (!isOpen || !sos) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalLocation = locData || location || {};
    const res = await volunteerResponse(sos._id, finalLocation, notes);
    if (res.success) {
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          zIndex: 9998
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '2px solid #0284C7',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#0284C7',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>support_agent</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>VOLUNTEER RESPONSE</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#E0F2FE' }}>
                Incident: {sos.sosNumber} · {sos.emergencyType?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Incident brief */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: '#334155'
          }}>
            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
              Situation Reported by {sos.triggeredByName || 'Personnel'}
            </div>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>{sos.description}</p>
          </div>

          {/* Location Acquisition */}
          <div style={{
            backgroundColor: locData || location ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${locData || location ? '#BBF7D0' : '#FDE68A'}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: locData || location ? '#166534' : '#92400E' }}>
                {isLocLoading ? 'Acquiring GPS fix...' : locData || location ? 'Your Current Location Detected' : 'GPS Signal Pending'}
              </span>
              <button
                type="button"
                onClick={() => getCurrentLocation({ enableHighAccuracy: true }).then((r) => r?.isAvailable && setLocData(r))}
                style={{
                  background: 'none',
                  border: '1px solid currentColor',
                  borderRadius: '4px',
                  color: '#0284C7',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  cursor: 'pointer'
                }}
              >
                Refresh GPS
              </button>
            </div>
            {(locData || location) && (
              <div style={{ fontSize: '0.75rem', color: '#166534', fontFamily: "'JetBrains Mono', monospace" }}>
                LAT: {(locData || location)?.latitude?.toFixed(5)}° / LON: {(locData || location)?.longitude?.toFixed(5)}°
                {accuracy && ` (±${Math.round(accuracy)}m)`}
              </div>
            )}
          </div>

          {/* Responder Readiness Note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.3rem' }}>
              Response Notes / Equipment Ready (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Equipped with first aid kit and snowcat vehicle; 5 minutes away..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
            ℹ Clicking below registers you as an available volunteer for this incident. The Station Commander will immediately review and confirm response dispatch.
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              style={{
                flex: 2,
                padding: '0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: actionLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>near_me</span>
              {actionLoading ? 'SUBMITTING...' : "CONFIRM: I'M RESPONDING"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default VolunteerResponseModal;
