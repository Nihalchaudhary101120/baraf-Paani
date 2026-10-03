import React, { useState, useEffect } from 'react';
import offlineSyncService, { NETWORK_STATUS } from '@/services/offlineSyncService';
import OfflineQueueModal from './OfflineQueueModal';

const OfflineStatusBadge = () => {
  const [snapshot, setSnapshot] = useState({
    status: offlineSyncService.status,
    pendingCount: 0,
    isSyncing: false
  });
  const [showQueueModal, setShowQueueModal] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((data) => {
      setSnapshot(data);
    });
    return unsubscribe;
  }, []);

  const { status, pendingCount, isSyncing } = snapshot;

  // Render warning pill if pending records exist
  if (pendingCount > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowQueueModal(true)}
          title="Click to view offline queue and sync records"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#FFF7ED',
            color: '#EA580C',
            border: '1.5px solid #FDBA74',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)',
            animation: 'pulse-amber 2s infinite'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#EA580C' }}>
            {isSyncing ? 'sync' : 'cloud_off'}
          </span>
          <span>
            {isSyncing
              ? 'SYNCING SOS...'
              : `⚠ ${pendingCount} SOS ${pendingCount === 1 ? 'RECORD' : 'RECORDS'} WAITING FOR SYNC`}
          </span>
        </button>

        <OfflineQueueModal
          isOpen={showQueueModal}
          onClose={() => setShowQueueModal(false)}
        />
      </>
    );
  }

  // Normal connectivity status indicator
  const isOffline = status === NETWORK_STATUS.OFFLINE;
  const isUnreachable = status === NETWORK_STATUS.SERVER_UNREACHABLE;

  const bg = isOffline || isUnreachable ? '#FEF2F2' : '#F0FDF4';
  const color = isOffline || isUnreachable ? '#DC2626' : '#16A34A';
  const border = isOffline || isUnreachable ? '#FECACA' : '#BBF7D0';
  const dotColor = isOffline ? '#EA580C' : isUnreachable ? '#DC2626' : '#10B981';
  const label = isOffline ? 'OFFLINE' : isUnreachable ? 'SERVER UNREACHABLE' : 'ONLINE · SYNCED';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowQueueModal(true)}
        title="Offline queue & telemetry sync status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
          display: 'inline-block'
        }} />
        <span>{label}</span>
      </button>

      <OfflineQueueModal
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
      />
    </>
  );
};

export default OfflineStatusBadge;
