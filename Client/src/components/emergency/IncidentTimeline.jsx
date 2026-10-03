import React from 'react';

const STATUS_STEPS = [
  { key: 'TRIGGERED', label: 'Triggered', icon: 'emergency' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged', icon: 'mark_email_read' },
  { key: 'ASSESSING', label: 'Assessing', icon: 'radar' },
  { key: 'RESPONSE_ASSIGNED', label: 'Assigned', icon: 'assignment_ind' },
  { key: 'RESPONDER_DISPATCHED', label: 'Dispatched', icon: 'near_me' },
  { key: 'ON_SITE', label: 'On-Site', icon: 'pin_drop' },
  { key: 'STABILIZED', label: 'Stabilized', icon: 'health_and_safety' },
  { key: 'RESOLVED', label: 'Resolved', icon: 'check_circle' }
];

const EVENT_ICONS = {
  SOS_TRIGGERED: { icon: 'crisis_alert', color: '#DC2626' },
  SOS_ACKNOWLEDGED: { icon: 'verified', color: '#2563EB' },
  ASSESSMENT_STARTED: { icon: 'radar', color: '#D97706' },
  RESPONDER_VOLUNTEERED: { icon: 'volunteer_activism', color: '#059669' },
  RESPONDER_ACCEPTED: { icon: 'how_to_reg', color: '#16A34A' },
  VOLUNTEER_DECLINED: { icon: 'person_off', color: '#64748B' },
  RESPONDER_ASSIGNED_BY_COMMAND: { icon: 'assignment_turned_in', color: '#7C3AED' },
  STATUS_RESPONDER_DISPATCHED: { icon: 'directions_run', color: '#0284C7' },
  STATUS_ON_SITE: { icon: 'place', color: '#16A34A' },
  STATUS_STABILIZED: { icon: 'favorite', color: '#059669' },
  INCIDENT_RESOLVED: { icon: 'task_alt', color: '#15803D' },
  STATUS_CANCELLED: { icon: 'cancel', color: '#64748B' }
};

const IncidentTimeline = ({ timeline = [], currentStatus = 'TRIGGERED' }) => {
  // Normalize legacy status names
  const normalizedCurrent = currentStatus === 'OPEN' ? 'TRIGGERED' : currentStatus === 'RESPONDING' ? 'RESPONDER_DISPATCHED' : currentStatus;
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === normalizedCurrent);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Visual Lifecycle Step Pipeline */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        overflowX: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: '600px'
        }}>
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = currentStepIdx > idx || normalizedCurrent === 'RESOLVED';
            const isCurrent = currentStepIdx === idx && normalizedCurrent !== 'RESOLVED';
            const isPending = currentStepIdx < idx && normalizedCurrent !== 'RESOLVED';

            const circleColor = isCurrent
              ? '#DC2626'
              : isCompleted
              ? '#16A34A'
              : '#94A3B8';

            const circleBg = isCurrent
              ? '#FEE2E2'
              : isCompleted
              ? '#DCFCE7'
              : '#F1F5F9';

            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: circleBg,
                    border: `2px solid ${circleColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: circleColor,
                    boxShadow: isCurrent ? '0 0 10px rgba(220, 38, 38, 0.4)' : 'none',
                    animation: isCurrent ? 'pulse 2s infinite' : 'none'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{step.icon}</span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: isCurrent ? 800 : isCompleted ? 700 : 500,
                    color: isCurrent ? '#DC2626' : isCompleted ? '#166534' : '#64748B',
                    marginTop: '0.25rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: isCompleted ? '#16A34A' : '#CBD5E1',
                    margin: '0 4px',
                    marginBottom: '16px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. Audit Trail Events List */}
      <div>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '0.75rem'
        }}>
          Incident Audit Log & Chronological Events ({timeline.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {timeline.length === 0 ? (
            <div style={{ padding: '1rem', color: '#94A3B8', fontSize: '0.8rem', textAlign: 'center' }}>
              No timeline events recorded yet.
            </div>
          ) : (
            timeline.map((event, idx) => {
              const cfg = EVENT_ICONS[event.event] || { icon: 'info', color: '#0284C7' };
              const isLast = idx === timeline.length - 1;

              return (
                <div key={event._id || idx} style={{ display: 'flex', gap: '0.85rem' }}>
                  {/* Spine */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px', flexShrink: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: `2px solid ${cfg.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cfg.color
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cfg.icon}</span>
                    </div>
                    {!isLast && (
                      <div style={{ width: '2px', flex: 1, minHeight: '28px', backgroundColor: '#E2E8F0' }} />
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ paddingBottom: !isLast ? '1rem' : 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#0284C7'
                      }}>
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                        {event.event?.replace(/_/g, ' ')}
                      </span>
                      {event.performedByName && (
                        <span style={{
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 600
                        }}>
                          {event.performedByType === 'COMMANDER' ? '🎖 ' : '👤 '}
                          {event.performedByName}
                        </span>
                      )}
                    </div>
                    {event.notes && (
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.4 }}>
                        {event.notes}
                      </div>
                    )}
                    {event.location?.coordinates && (
                      <div style={{ fontSize: '0.7rem', color: '#059669', fontFamily: "'JetBrains Mono', monospace", marginTop: '0.15rem' }}>
                        📍 Fix: {event.location.coordinates[1]?.toFixed(4)}°, {event.location.coordinates[0]?.toFixed(4)}°
                        {event.location.accuracy && ` (±${Math.round(event.location.accuracy)}m)`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentTimeline;
