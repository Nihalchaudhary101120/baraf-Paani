import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

/**
 * OfflineWidget — always-visible floating indicator showing sync state.
 * This is the demo showpiece for judges to see offline-first in action.
 */
const OfflineWidget = () => {
  const { isOnline, pendingCount, lastSyncTime, isSyncing, manualSync } = useOfflineSync();

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (isOnline && pendingCount === 0) {
    // Minimal indicator when fully synced
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.65rem',
        backgroundColor: 'rgba(21, 128, 61, 0.08)',
        border: '1px solid rgba(21, 128, 61, 0.2)',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        color: '#15803D',
        fontWeight: 600,
      }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          backgroundColor: '#15803D',
          animation: 'pulse-green 2s infinite'
        }} />
        Synced
        {lastSyncTime && (
          <span style={{ color: '#64748B', fontWeight: 400 }}>
            · {formatTime(lastSyncTime)}
          </span>
        )}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.3rem 0.75rem',
        backgroundColor: '#FFC000',
        border: '1px solid #f59e0b',
        borderRadius: '6px',
        fontSize: '0.75rem',
        color: '#0F172A',
        fontWeight: 700,
        cursor: 'default',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: '#b45309',
          animation: 'pulse-amber 1s infinite'
        }} />
        <span>⚠ OFFLINE</span>
        {pendingCount > 0 && (
          <span style={{
            backgroundColor: '#0F172A',
            color: '#FFC000',
            borderRadius: '9999px',
            padding: '0.05rem 0.45rem',
            fontSize: '0.65rem',
            fontWeight: 800,
          }}>
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // Online but has pending events
  return (
    <button
      type="button"
      onClick={manualSync}
      disabled={isSyncing}
      title={`${pendingCount} events queued. Click to sync now.`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.3rem 0.75rem',
        backgroundColor: isSyncing ? '#eff6ff' : '#fff7ed',
        border: `1px solid ${isSyncing ? '#93c5fd' : '#fed7aa'}`,
        borderRadius: '6px',
        fontSize: '0.75rem',
        color: isSyncing ? '#1d4ed8' : '#c2410c',
        fontWeight: 700,
        cursor: isSyncing ? 'wait' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        backgroundColor: isSyncing ? '#3b82f6' : '#E65A28',
        animation: isSyncing ? 'pulse-blue 0.8s infinite' : 'none',
      }} />
      {isSyncing ? (
        <>Syncing...</>
      ) : (
        <>
          <span>{pendingCount} Queued</span>
          <span style={{
            backgroundColor: '#E65A28',
            color: '#fff',
            borderRadius: '3px',
            padding: '0.05rem 0.4rem',
            fontSize: '0.65rem',
          }}>
            SYNC NOW
          </span>
        </>
      )}
    </button>
  );
};

export default OfflineWidget;
