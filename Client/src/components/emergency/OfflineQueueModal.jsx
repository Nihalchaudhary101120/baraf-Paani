import React, { useState, useEffect } from 'react';
import { getAllOfflineSOS, getPendingSyncSOS } from '@/services/pouchdbService';
import offlineSyncService, { NETWORK_STATUS } from '@/services/offlineSyncService';
import { useToast } from '@/context/ToastContext';

const STATUS_TAGS = {
  PENDING_SYNC: { label: 'WAITING FOR CONNECTION', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', icon: 'cloud_off' },
  FAILED:       { label: 'RETRY SCHEDULED', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: 'sync_problem' },
  SYNCING:      { label: 'TRANSMITTING...', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: 'sync' },
  SYNCED:       { label: 'SYNCHRONIZED', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: 'cloud_done' }
};

const OfflineQueueModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [offlineRecords, setOfflineRecords] = useState([]);
  const [syncStatus, setSyncStatus] = useState(offlineSyncService.status);
  const [isSyncing, setIsSyncing] = useState(offlineSyncService.isSyncing);

  const loadRecords = async () => {
    try {
      const records = await getAllOfflineSOS();
      setOfflineRecords(records);
    } catch (e) {
      console.warn('[OfflineQueueModal] Load error:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((snapshot) => {
      setSyncStatus(snapshot.status);
      setIsSyncing(snapshot.isSyncing);
      loadRecords();
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const result = await offlineSyncService.syncNow();
    await loadRecords();
    setIsSyncing(false);

    if (result.syncedCount > 0) {
      toast?.showToast?.(`✓ Successfully synchronized ${result.syncedCount} SOS record(s) to Command database.`, 'success');
    }
  };

  const pendingCount = offlineRecords.filter(
    (r) => r.syncStatus === 'PENDING_SYNC' || r.syncStatus === 'FAILED'
  ).length;

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
          maxWidth: '620px',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35)',
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: pendingCount > 0 ? '#F97316' : '#10B981' }}>
              {pendingCount > 0 ? 'cloud_off' : 'cloud_done'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                OFFLINE SOS QUEUE & SYNC MANAGER
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                Local PouchDB Store · Polar Emergency Resilience Queue
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Connectivity Status Banner */}
        <div style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: syncStatus === NETWORK_STATUS.OFFLINE ? '#FFF7ED' : syncStatus === NETWORK_STATUS.SERVER_UNREACHABLE ? '#FEF2F2' : '#F0FDF4',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
            <span style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: syncStatus === NETWORK_STATUS.OFFLINE ? '#EA580C' : syncStatus === NETWORK_STATUS.SERVER_UNREACHABLE ? '#DC2626' : '#16A34A',
              boxShadow: `0 0 8px currentColor`
            }} />
            <strong style={{ color: '#0F172A' }}>NETWORK: {syncStatus}</strong>
            <span style={{ color: '#64748B' }}>
              · {pendingCount} Pending Sync / {offlineRecords.length} Stored Locally
            </span>
          </div>

          <button
            type="button"
            disabled={isSyncing || syncStatus === NETWORK_STATUS.OFFLINE}
            onClick={handleSyncNow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: isSyncing ? 'wait' : 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSyncing ? 'spin 1s infinite linear' : 'none' }}>
              sync
            </span>
            {isSyncing ? 'SYNCING...' : 'SYNC NOW'}
          </button>
        </div>

        {/* Records List */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {offlineRecords.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#64748B',
              fontSize: '0.84rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#10B981', marginBottom: '0.5rem' }}>verified</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>No Offline Records in Queue</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>All emergency alerts are synced or submitted directly to station servers.</p>
            </div>
          ) : (
            offlineRecords.map((rec) => {
              const tag = STATUS_TAGS[rec.syncStatus] || STATUS_TAGS.PENDING_SYNC;

              return (
                <div
                  key={rec._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${tag.border}`,
                    borderLeft: `4px solid ${tag.color}`,
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '0.84rem', color: '#0F172A' }}>
                        {rec.sosNumber || rec.clientIncidentId?.substring(0, 13) || rec._id}
                      </span>
                      <span style={{
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '0.62rem',
                        fontWeight: 800
                      }}>
                        {rec.emergencyType} · {rec.severity}
                      </span>
                    </div>

                    <span style={{
                      backgroundColor: tag.bg,
                      color: tag.color,
                      border: `1px solid ${tag.border}`,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{tag.icon}</span>
                      {tag.label}
                    </span>
                  </div>

                  <p style={{ margin: '0.25rem 0 0.45rem', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                    {rec.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.35rem' }}>
                    <span>
                      🕒 Captured: {new Date(rec.createdAt).toLocaleString()}
                    </span>
                    {rec.location?.latitude ? (
                      <span>📍 GPS: {rec.location.latitude.toFixed(4)}°, {rec.location.longitude.toFixed(4)}°</span>
                    ) : (
                      <span>📍 GPS: Location unavailable</span>
                    )}
                    {rec.syncAttempts > 0 && rec.syncStatus !== 'SYNCED' && (
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>
                        ⚠ Attempts: {rec.syncAttempts} {rec.lastSyncError ? `(${rec.lastSyncError})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            ℹ PouchDB provides automatic local persistence across reloads.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default OfflineQueueModal;
