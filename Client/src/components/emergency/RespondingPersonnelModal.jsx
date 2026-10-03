import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSOSContext } from '@/context/SOSContext';

const STATUS_PILLS = {
  RESPONDING: { bg: '#ECFDF5', color: '#059669', label: 'RESPONDING' },
  ON_THE_WAY: { bg: '#EFF6FF', color: '#2563EB', label: 'ON THE WAY' },
  ON_SITE:    { bg: '#F0FDF4', color: '#16A34A', label: 'ON SITE' },
  ASSISTING:  { bg: '#FAF5FF', color: '#7C3AED', label: 'ASSISTING' },
  STOOD_DOWN: { bg: '#F1F5F9', color: '#64748B', label: 'STOOD DOWN' }
};

const RespondingPersonnelModal = ({
  isOpen,
  onClose,
  sos,
  onViewOnMap = null,
  onOpenAssignTeam = null
}) => {
  const { user } = useAuth();
  const { updateResponseStatus, actionLoading } = useSOSContext();

  if (!isOpen || !sos) return null;

  const responders = (sos.responders && sos.responders.length > 0)
    ? sos.responders
    : (sos.volunteers || []).filter((v) => v.status !== 'STOOD_DOWN' && v.status !== 'DECLINED');

  const isCommanderOrOperator =
    user?.role === 'STATION_COMMANDER' ||
    user?.role === 'STATION_OPERATOR' ||
    user?.role === 'HQ_COMMAND' ||
    user?.role === 'HQ_ADMIN';

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          width: '94%',
          maxWidth: '560px',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #CBD5E1',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#10B981' }}>group</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                RESPONDING PERSONNEL ({responders.length})
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                Incident {sos.sosNumber} · {sos.emergencyType?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Responders List */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {responders.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#64748B',
              fontSize: '0.85rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#CBD5E1', marginBottom: '0.4rem' }}>person_search</span>
              <p style={{ margin: 0, fontWeight: 600 }}>No personnel have volunteered for this SOS yet.</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Any active personnel can click "I'M RESPONDING" to assist.</p>
            </div>
          ) : (
            responders.map((resp, idx) => {
              const uId = resp.userId?._id || resp.userId;
              const isCurrentUser = (user?._id || user?.id)?.toString() === uId?.toString();
              const statusKey = resp.status || 'RESPONDING';
              const pill = STATUS_PILLS[statusKey] || STATUS_PILLS.RESPONDING;

              return (
                <div
                  key={resp._id || idx}
                  style={{
                    border: `1.5px solid ${isCurrentUser ? '#93C5FD' : '#E2E8F0'}`,
                    backgroundColor: isCurrentUser ? '#F0F9FF' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        boxShadow: '0 0 6px #10B981',
                        flexShrink: 0
                      }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {resp.name || resp.userId?.name || 'Personnel'}
                          {isCurrentUser && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                          {resp.role || resp.userId?.role || 'PERSONNEL'}
                          {resp.designation ? ` · ${resp.designation}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span style={{
                        backgroundColor: pill.bg,
                        color: pill.color,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>
                        {pill.label}
                      </span>
                      {resp.assigned ? (
                        <span style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: 700 }}>
                          🛡 {resp.teamName || 'Team Assigned'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                          Command: Not Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', paddingTop: '0.35rem', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', gap: '0.85rem' }}>
                      <span>
                        📍 {resp.distanceKm != null ? (
                          <strong style={{ color: '#0284C7' }}>{resp.distanceKm} km away</strong>
                        ) : (
                          'Location unavailable'
                        )}
                      </span>
                      <span>
                        🕒 Responding since <strong>{formatTime(resp.volunteeredAt || resp.createdAt)}</strong>
                      </span>
                    </div>

                    {/* Progress Status Change Dropdown if current responder or Commander */}
                    {(isCurrentUser || isCommanderOrOperator) && sos.status !== 'RESOLVED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <select
                          disabled={actionLoading}
                          value={resp.status || 'RESPONDING'}
                          onChange={(e) => updateResponseStatus(sos._id, e.target.value, '', uId, resp._id)}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
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
                          <option value="STOOD_DOWN">STOOD DOWN</option>
                        </select>

                        {isCommanderOrOperator && !resp.assigned && onOpenAssignTeam && (
                          <button
                            type="button"
                            onClick={() => onOpenAssignTeam(resp)}
                            style={{
                              backgroundColor: '#7C3AED',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Team
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          {onViewOnMap && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewOnMap();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 1rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>radar</span>
              VIEW ON MAP
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default RespondingPersonnelModal;
