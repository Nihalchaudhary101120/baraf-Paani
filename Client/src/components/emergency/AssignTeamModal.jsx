import React, { useState, useEffect } from 'react';
import { useSOSContext } from '@/context/SOSContext';

const PRESET_TEAMS = [
  { id: 'TEAM_ALPHA', name: 'Team Alpha — Primary Rapid Response' },
  { id: 'TEAM_BRAVO', name: 'Team Bravo — Medical & Trauma Evac' },
  { id: 'TEAM_CHARLIE', name: 'Team Charlie — Technical & Equipment Fix' },
  { id: 'TEAM_DELTA', name: 'Team Delta — Search, Rescue & Perimeter' }
];

const AssignTeamModal = ({
  isOpen,
  onClose,
  sos,
  initialResponder = null
}) => {
  const { assignResponseTeam, actionLoading } = useSOSContext();

  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [selectedTeamPreset, setSelectedTeamPreset] = useState(PRESET_TEAMS[0].id);
  const [customTeamName, setCustomTeamName] = useState('');
  const [notes, setNotes] = useState('');

  const responders = (sos?.responders && sos.responders.length > 0)
    ? sos.responders
    : (sos?.volunteers || []).filter((v) => v.status !== 'STOOD_DOWN' && v.status !== 'DECLINED');

  useEffect(() => {
    if (initialResponder) {
      setSelectedResponderId(initialResponder._id || initialResponder.userId?._id || initialResponder.userId);
    } else if (responders.length > 0) {
      setSelectedResponderId(responders[0]._id || responders[0].userId?._id || responders[0].userId);
    }
  }, [initialResponder, responders]);

  if (!isOpen || !sos) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResponderId) return;

    let finalTeamName = '';
    let finalTeamId = selectedTeamPreset;

    if (selectedTeamPreset === 'CUSTOM') {
      finalTeamName = customTeamName.trim() || 'Tactical Response Team';
      finalTeamId = 'CUSTOM_TEAM';
    } else {
      const found = PRESET_TEAMS.find((t) => t.id === selectedTeamPreset);
      finalTeamName = found ? found.name : 'Team Alpha';
    }

    const targetResponder = responders.find(
      (r) => (r._id || r.userId?._id || r.userId) === selectedResponderId
    );

    const res = await assignResponseTeam(sos._id, {
      responderId: targetResponder?._id,
      userId: targetResponder?.userId?._id || targetResponder?.userId,
      teamName: finalTeamName,
      teamId: finalTeamId,
      notes
    });

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
          maxWidth: '500px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #7C3AED',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#7C3AED',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>badge</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>ASSIGN RESPONSE TEAM</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#EDE9FE' }}>
                Incident {sos.sosNumber} · Command Response Structuring
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{
            backgroundColor: '#F5F3FF',
            border: '1px solid #DDD6FE',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.78rem',
            color: '#5B21B6',
            lineHeight: 1.4
          }}>
            <strong>Command Notice:</strong> Voluntary responders act independently ("I am going to help"). Assigning them here elevates them to a formally designated Command Response Team.
          </div>

          {/* Select Responder */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
              Select Responding Personnel
            </label>
            <select
              required
              value={selectedResponderId}
              onChange={(e) => setSelectedResponderId(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              {responders.length === 0 ? (
                <option value="">No volunteers available yet</option>
              ) : (
                responders.map((r) => (
                  <option key={r._id || r.userId?._id || r.userId} value={r._id || r.userId?._id || r.userId}>
                    {r.name || r.userId?.name} — {r.role || r.userId?.role} {r.distanceKm != null ? `(${r.distanceKm} km away)` : ''} {r.assigned ? `[Assigned: ${r.teamName}]` : '[Unassigned]'}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Team Designation */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
              Response Team Assignment
            </label>
            <select
              value={selectedTeamPreset}
              onChange={(e) => setSelectedTeamPreset(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              {PRESET_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="CUSTOM">Custom Team Name...</option>
            </select>
          </div>

          {selectedTeamPreset === 'CUSTOM' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Enter Custom Team Name
              </label>
              <input
                type="text"
                required
                value={customTeamName}
                onChange={(e) => setCustomTeamName(e.target.value)}
                placeholder="e.g. Hazardous Materials Task Force 1"
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
          )}

          {/* Directives Note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
              Operational Directives & Equipment Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring defibrillator and trauma kit. Rendezvous at Sector 4."
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

          {/* Action Buttons */}
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
              disabled={actionLoading || !selectedResponderId}
              style={{
                flex: 2,
                padding: '0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#7C3AED',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: actionLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              {actionLoading ? 'Assigning...' : 'Confirm Team Assignment'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AssignTeamModal;
