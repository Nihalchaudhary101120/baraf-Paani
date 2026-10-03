import React, { useState } from 'react';
import { useSOSContext } from '@/context/SOSContext';

const OUTCOME_OPTIONS = [
  { value: 'STABILIZED_AND_SAFE', label: 'Patient/Site Stabilized & Safe' },
  { value: 'EVACUATED_TO_BASE', label: 'Personnel Evacuated to Station Base' },
  { value: 'EQUIPMENT_RESTORED', label: 'Systems & Life-Support Restored' },
  { value: 'EXTERNAL_TRANSFER', label: 'Transferred to Ship/Air MEDEVAC' },
  { value: 'FALSE_ALARM', label: 'Resolved / False Alarm' }
];

const ResolveSOSModal = ({ isOpen, onClose, sos }) => {
  const { resolveSOS, actionLoading } = useSOSContext();
  const [outcome, setOutcome] = useState('STABILIZED_AND_SAFE');
  const [resolutionNotes, setResolutionNotes] = useState('');

  if (!isOpen || !sos) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;

    const res = await resolveSOS(sos._id, resolutionNotes.trim(), outcome);
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
          border: '2px solid #16A34A',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <div style={{
          backgroundColor: '#16A34A',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>task_alt</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>CLOSE & RESOLVE EMERGENCY SOS</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#DCFCE7' }}>
                Incident {sos.sosNumber} · {sos.emergencyType?.replace('_', ' ')}
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

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.3rem' }}>
              Incident Outcome *
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem'
              }}
            >
              {OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.3rem' }}>
              Final Resolution Report & Medical/Logistical Actions Taken *
            </label>
            <textarea
              required
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail the rescue actions, personnel involved, medical condition upon arrival, repairs completed, or safe return to station..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
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
              disabled={actionLoading || !resolutionNotes.trim()}
              style={{
                flex: 2,
                padding: '0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: actionLoading || !resolutionNotes.trim() ? '#94A3B8' : '#16A34A',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: actionLoading || !resolutionNotes.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {actionLoading ? 'CLOSING INCIDENT...' : 'MARK INCIDENT RESOLVED'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ResolveSOSModal;
