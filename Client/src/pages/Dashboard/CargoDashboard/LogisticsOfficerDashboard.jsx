import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getAllCheckpoints,
  createCheckpoint,
  lookupBoxByQR,
  getManifests,
  getShipments,
} from '@/api/cargo.api';
import { createSos } from '@/api/sos.api';
import { queueEvent, markEventSynced } from '@/services/syncServices/queueService';
import offlineDB from '@/services/syncServices/pouchService';

// ── Helpers ─────────────────────────────────────────────────────────────────

const CONDITION_CONFIG = {
  GOOD:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: 'check_circle' },
  DAMAGED: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: 'broken_image' },
  SEALED:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'lock' },
  OPENED:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: 'lock_open' },
};

const SYNC_STATUS_CONFIG = {
  LOCAL:   { bg: '#fef9c3', color: '#854d0e', label: 'LOCAL',   icon: 'cloud_off' },
  PENDING: { bg: '#fff7ed', color: '#c2410c', label: 'PENDING', icon: 'sync' },
  SYNCED:  { bg: '#f0fdf4', color: '#15803d', label: 'SYNCED',  icon: 'cloud_done' },
};

const SyncBadge = ({ status }) => {
  const s = SYNC_STATUS_CONFIG[status] || SYNC_STATUS_CONFIG.LOCAL;
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      padding: '0.15rem 0.55rem', borderRadius: '9999px',
      fontSize: '0.68rem', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{s.icon}</span>
      {s.label}
    </span>
  );
};

const CondBadge = ({ cond }) => {
  const c = CONDITION_CONFIG[cond] || CONDITION_CONFIG.GOOD;
  return (
    <span style={{
      backgroundColor: c.bg, color: c.color,
      padding: '0.15rem 0.55rem', borderRadius: '9999px',
      fontSize: '0.68rem', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{c.icon}</span>
      {cond}
    </span>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function LogisticsOfficerDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [checkpoints, setCheckpoints] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);

  const [qrInput, setQrInput] = useState('');
  const [scannedBox, setScannedBox] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanLookingUp, setScanLookingUp] = useState(false);

  const [condition, setCondition] = useState('GOOD');
  const [scannedQty, setScannedQty] = useState(1);
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointType, setCheckpointType] = useState('PORT');
  const [checkpointLocation, setCheckpointLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filterShipment, setFilterShipment] = useState('ALL');
  const [filterManifest, setFilterManifest] = useState('ALL');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  const [sosForm, setSosForm] = useState({ type: 'MEDICAL', description: '', location: '' });
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadOfflineQueue = useCallback(async () => {
    try {
      const docs = await offlineDB.allDocs({ include_docs: true });
      const pending = docs.rows.map(r => r.doc).filter(d => d.syncStatus === 'LOCAL' && d.type === 'CHECKPOINT_SCAN');
      setOfflineQueue(pending);
    } catch (e) { console.warn('PouchDB read error:', e); }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [cpRes, mnRes, shRes] = await Promise.all([
        getAllCheckpoints({ limit: 200 }).catch(() => ({ checkpoints: [] })),
        getManifests().catch(() => ({ manifests: [] })),
        getShipments().catch(() => ({ shipments: [] })),
      ]);
      setCheckpoints(cpRes?.checkpoints || cpRes?.data?.checkpoints || []);
      setManifests(mnRes?.manifests || mnRes?.data?.manifests || []);
      setShipments(shRes?.shipments || shRes?.data?.shipments || []);
    } catch (e) { console.error('Fetch error:', e); }
    await loadOfflineQueue();
  }, [loadOfflineQueue]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const scannedToday = checkpoints.filter(cp => (cp.createdAt || '').startsWith(today)).length;
  const pendingSync  = offlineQueue.length;
  const syncedToday  = checkpoints.filter(cp => cp.syncStatus === 'SYNCED' && (cp.createdAt || '').startsWith(today)).length;
  const damagedCount = checkpoints.filter(cp => cp.condition === 'DAMAGED').length;

  const syncIndicator = !isOnline
    ? { color: '#dc2626', bg: '#fef2f2', label: 'Offline',      icon: 'cloud_off' }
    : offlineQueue.length > 0
    ? { color: '#d97706', bg: '#fffbeb', label: `${offlineQueue.length} Pending`, icon: 'sync' }
    : { color: '#15803d', bg: '#f0fdf4', label: 'Synced',       icon: 'cloud_done' };

  const handleQRLookup = useCallback(async (code) => {
    const val = (code || qrInput).trim();
    if (!val) return;
    setScanLookingUp(true);
    setScanError('');
    setScannedBox(null);
    try {
      if (isOnline) {
        const result = await lookupBoxByQR(val);
        if (result) {
          const { manifest, item } = result;
          const shipment = shipments.find(s => s._id === manifest.shipmentId?._id || s._id === manifest.shipmentId);
          setScannedBox({ item, manifest, shipment });
          setScannedQty(item.packageCount || 1);
        } else {
          setScanError(`No box found for: ${val}`);
        }
      } else {
        setScannedBox({
          item: { itemCode: val, description: 'Offline Scan', category: 'GENERAL', packageCount: 1 },
          manifest: null, shipment: null,
        });
      }
    } catch (e) { setScanError('QR lookup failed.'); }
    finally { setScanLookingUp(false); }
  }, [qrInput, isOnline, shipments]);

  const handleCreateCheckpoint = async (e) => {
    e.preventDefault();
    if (!scannedBox) { showToast('Scan a QR code first.', 'error'); return; }
    if (!checkpointName.trim()) { showToast('Checkpoint name is required.', 'error'); return; }
    setSubmitting(true);
    const payload = {
      type: 'CHECKPOINT_SCAN',
      manifestId: scannedBox.manifest?._id || null,
      shipmentId: scannedBox.shipment?._id || scannedBox.manifest?.shipmentId || null,
      itemCode: scannedBox.item.itemCode,
      checkpoint: { name: checkpointName.trim(), type: checkpointType, location: checkpointLocation.trim() },
      scannedQuantity: Number(scannedQty),
      condition,
      offlineCreated: !isOnline,
      remarks: remarks.trim(),
      deviceId: navigator.userAgent.slice(0, 32),
    };
    try {
      if (isOnline && payload.manifestId) {
        await createCheckpoint(payload);
        showToast(`✅ Checkpoint recorded for ${payload.itemCode}`);
      } else {
        await queueEvent(payload);
        showToast(`📶 Saved offline for ${payload.itemCode}`, 'warn');
      }
      setScannedBox(null); setQrInput(''); setCondition('GOOD'); setScannedQty(1);
      setCheckpointName(''); setCheckpointLocation(''); setRemarks('');
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record checkpoint', 'error');
    } finally { setSubmitting(false); }
  };

  const handleSync = useCallback(async () => {
    if (!isOnline) { showToast('No internet.', 'error'); return; }
    if (offlineQueue.length === 0) { showToast('Nothing to sync.'); return; }
    let synced = 0;
    for (const doc of offlineQueue) {
      try {
        if (doc.manifestId) await createCheckpoint({ ...doc, offlineCreated: true });
        await markEventSynced(doc);
        synced++;
      } catch (e) { console.warn('Sync failed for', doc._id); }
    }
    showToast(`☁️ Synced ${synced} / ${offlineQueue.length}`);
    await fetchData();
  }, [isOnline, offlineQueue, fetchData, showToast]);

  const handleSOS = async (e) => {
    e.preventDefault();
    setSosSubmitting(true);
    try {
      await createSos({ type: sosForm.type, description: sosForm.description, location: sosForm.location, raisedBy: user?._id || user?.userId });
      showToast('🚨 SOS raised!');
      setSosForm({ type: 'MEDICAL', description: '', location: '' });
    } catch (err) { showToast(err.response?.data?.message || 'SOS failed', 'error'); }
    finally { setSosSubmitting(false); }
  };

  const filteredCheckpoints = checkpoints.filter(cp => {
    if (filterShipment !== 'ALL' && (cp.shipmentId?._id || cp.shipmentId) !== filterShipment) return false;
    if (filterManifest !== 'ALL' && (cp.manifestId?._id || cp.manifestId) !== filterManifest) return false;
    if (filterCondition !== 'ALL' && cp.condition !== filterCondition) return false;
    if (filterDate && !(cp.createdAt || '').startsWith(filterDate)) return false;
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : toast.type === 'warn' ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'warn' ? '#fde68a' : '#bbf7d0'}`,
          color: toast.type === 'error' ? '#B91C1C' : toast.type === 'warn' ? '#b45309' : '#15803D',
          borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px',
        padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#0891b2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>qr_code_scanner</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0891b2', margin: 0 }}>LOGISTICS OFFICER PORTAL</h1>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0891b2', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>NCPOR</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              QR Scan · Checkpoint Recording · Offline Queue · Sync Management
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
            backgroundColor: syncIndicator.bg, color: syncIndicator.color,
            padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
          }} onClick={handleSync}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{syncIndicator.icon}</span>
            {syncIndicator.label}
          </div>
          <button onClick={() => setActiveTab('sos')} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.95rem', backgroundColor: '#dc2626', color: '#fff',
            border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>emergency</span>
            SOS
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.9rem' }}>
        {[
          { label: 'Scanned Today', value: scannedToday, color: '#0891b2', border: '#06b6d4', sub: 'Checkpoints today', icon: 'qr_code_scanner' },
          { label: 'Pending Sync',  value: pendingSync,  color: '#d97706', border: '#f59e0b', sub: 'LOCAL offline queue', icon: 'cloud_off' },
          { label: 'Synced Today',  value: syncedToday,  color: '#15803d', border: '#10b981', sub: 'Uploaded to server',  icon: 'cloud_done' },
          { label: 'Damaged Cargo', value: damagedCount, color: '#be123c', border: '#f43f5e', sub: 'Condition = DAMAGED',  icon: 'broken_image' },
          { label: 'My Station',    value: user?.stationId?.code || user?.station || '—', color: '#7c3aed', border: '#8b5cf6', sub: user?.stationId?.name || 'Assigned station', icon: 'location_on' },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: '#fff',
            borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0', borderLeft: `4px solid ${stat.border}`,
            borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase' }}>{stat.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: stat.color, opacity: 0.5 }}>{stat.icon}</span>
            </div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #CBD5E1', paddingBottom: '0.25rem', overflowX: 'auto' }}>
        {[
          { key: 'dashboard', label: 'Dashboard',          icon: 'dashboard' },
          { key: 'scanner',   label: 'QR Scanner',         icon: 'qr_code_scanner' },
          { key: 'today',     label: "Today's Scans",      icon: 'today', badge: scannedToday },
          { key: 'history',   label: 'Checkpoint History', icon: 'route' },
          { key: 'offline',   label: 'Offline Queue',      icon: 'cloud_off', badge: pendingSync },
          { key: 'sos',       label: 'Emergency SOS',      icon: 'emergency', danger: true },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.6rem 1rem', borderRadius: '6px', border: 'none',
            backgroundColor: activeTab === tab.key ? (tab.danger ? '#dc2626' : '#0891b2') : 'transparent',
            color: activeTab === tab.key ? '#ffffff' : (tab.danger ? '#dc2626' : '#475569'),
            fontWeight: activeTab === tab.key ? 700 : 600,
            fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                backgroundColor: activeTab === tab.key ? '#fff' : '#0891b2',
                color: activeTab === tab.key ? '#0891b2' : '#fff',
                fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px',
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Today scans table */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: '20px' }}>today</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Today's Checkpoint Scans</span>
                </div>
                <button onClick={() => setActiveTab('scanner')} style={{ background: 'none', border: 'none', color: '#0891b2', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  + New Scan →
                </button>
              </div>
              {checkpoints.filter(cp => (cp.createdAt || '').startsWith(today)).length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>qr_code_scanner</span>
                  No scans today. Start scanning!
                </div>
              ) : (
                checkpoints.filter(cp => (cp.createdAt || '').startsWith(today)).slice(0, 8).map((cp, idx, arr) => (
                  <div key={cp._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1.25rem', borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0891b2' }}>qr_code_2</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0891b2', fontSize: '0.85rem' }}>{cp.itemCode}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{cp.checkpoint?.name || '—'} · {cp.scannedQuantity} units</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CondBadge cond={cp.condition} />
                      <SyncBadge status={cp.syncStatus} />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {new Date(cp.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Offline pending banner */}
            {offlineQueue.length > 0 && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#b45309', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud_off</span>
                  {offlineQueue.length} offline checkpoint{offlineQueue.length > 1 ? 's' : ''} waiting to sync
                </div>
                <button onClick={handleSync} disabled={!isOnline} style={{
                  backgroundColor: '#d97706', color: '#fff', border: 'none',
                  padding: '0.35rem 0.85rem', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700,
                  cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sync</span>
                  Sync Now
                </button>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick scan card */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0891b2', display: 'block', marginBottom: '0.75rem' }}>qr_code_scanner</span>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.5rem' }}>Ready to Scan?</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 1rem' }}>Record cargo checkpoints online or offline.</p>
              <button onClick={() => setActiveTab('scanner')} style={{
                backgroundColor: '#0891b2', color: '#fff', border: 'none',
                padding: '0.65rem 1.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
                Open QR Scanner
              </button>
              <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                {isOnline ? '🟢 Online — syncs immediately' : '🔴 Offline — queued in PouchDB'}
              </div>
            </div>

            {/* Condition breakdown */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0891b2' }}>analytics</span>
                Condition Breakdown (All Time)
              </div>
              {['GOOD', 'DAMAGED', 'SEALED', 'OPENED'].map(cond => {
                const count = checkpoints.filter(cp => cp.condition === cond).length;
                const total = checkpoints.length || 1;
                const pct = Math.round((count / total) * 100);
                const c = CONDITION_CONFIG[cond];
                return (
                  <div key={cond} style={{ marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span style={{ color: c.color }}>{cond}</span>
                      <span style={{ color: '#64748B' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: QR SCANNER ── */}
      {activeTab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
          {/* Left: Input + Condition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#0891b2' }}>qr_code_scanner</span>
                Scan / Enter QR Code
              </h2>
              <div style={{ border: '2px dashed #bae6fd', borderRadius: '12px', padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#f0f9ff', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '52px', color: '#0891b2', display: 'block', marginBottom: '0.5rem' }}>qr_code_2</span>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0c4a6e', margin: '0 0 0.25rem' }}>Point camera at QR Code</p>
                <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>Or enter the code manually below</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text" value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQRLookup()}
                  placeholder="Enter Box Code (e.g. BOX-2026-001)..."
                  autoFocus
                  style={{ flex: 1, height: '42px', padding: '0 0.85rem', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600 }}
                />
                <button onClick={() => handleQRLookup()} disabled={scanLookingUp || !qrInput.trim()} style={{
                  backgroundColor: '#0891b2', color: '#fff', border: 'none',
                  padding: '0 1.1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  opacity: (!qrInput.trim() || scanLookingUp) ? 0.6 : 1,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{scanLookingUp ? 'sync' : 'search'}</span>
                  {scanLookingUp ? 'Looking...' : 'Lookup'}
                </button>
              </div>
              {scanError && (
                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600 }}>
                  ❌ {scanError}
                </div>
              )}
            </div>

            {/* Condition buttons — show only after scan */}
            {scannedBox && (
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.85rem' }}>Select Cargo Condition</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {['GOOD', 'DAMAGED', 'SEALED', 'OPENED'].map(cond => {
                    const c = CONDITION_CONFIG[cond];
                    return (
                      <button key={cond} type="button" onClick={() => setCondition(cond)} style={{
                        padding: '0.75rem 0.5rem',
                        backgroundColor: condition === cond ? c.bg : '#f8fafc',
                        border: `2px solid ${condition === cond ? c.color : '#e2e8f0'}`,
                        borderRadius: '8px', color: condition === cond ? c.color : '#64748B',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        transition: 'all 0.15s',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{c.icon}</span>
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Box Info + Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0891b2' }}>inventory_2</span>
                Scanned Box Information
              </h2>
              {!scannedBox ? (
                <div style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '3rem 1rem', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1', display: 'block', marginBottom: '0.75rem' }}>search</span>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#64748B' }}>No box scanned yet</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Enter a box code or scan QR to begin</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.83rem' }}>
                  {[
                    ['Box Number',    scannedBox.item.itemCode],
                    ['Description',   scannedBox.item.description || '—'],
                    ['Category',      scannedBox.item.category || '—'],
                    ['Package Count', scannedBox.item.packageCount || 1],
                    ['Manifest',      scannedBox.manifest?.manifestNumber || '—'],
                    ['Shipment',      scannedBox.shipment?.shipmentNumber || (typeof scannedBox.manifest?.shipmentId === 'string' ? scannedBox.manifest.shipmentId : '—')],
                    ['Route',         scannedBox.shipment ? `${scannedBox.shipment.origin} → ${scannedBox.shipment.destination}` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: ['Box Number','Manifest','Shipment'].includes(label) ? 'monospace' : 'inherit' }}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkpoint Form */}
            {scannedBox && (
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0891b2' }}>add_location_alt</span>
                  Record Checkpoint
                </h2>
                <form onSubmit={handleCreateCheckpoint} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Checkpoint Name *</label>
                      <input type="text" value={checkpointName} required onChange={e => setCheckpointName(e.target.value)} placeholder="e.g. Goa Port Gate 3"
                        style={{ width: '100%', height: '36px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Type</label>
                      <select value={checkpointType} onChange={e => setCheckpointType(e.target.value)}
                        style={{ width: '100%', height: '36px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {['WAREHOUSE', 'PORT', 'SHIP', 'STATION', 'FIELD'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Location</label>
                      <input type="text" value={checkpointLocation} onChange={e => setCheckpointLocation(e.target.value)} placeholder="e.g. Cape Town"
                        style={{ width: '100%', height: '36px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Scanned Qty</label>
                      <input type="number" min="1" value={scannedQty} onChange={e => setScannedQty(e.target.value)}
                        style={{ width: '100%', height: '36px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Remarks</label>
                    <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any observations, damage notes..." rows={2}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: CONDITION_CONFIG[condition].bg, borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: CONDITION_CONFIG[condition].color }}>Condition: {condition}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{isOnline ? '🟢 Online sync' : '🔴 Offline queue'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" onClick={() => { setScannedBox(null); setQrInput(''); setScanError(''); }}
                      style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={submitting} style={{
                      flex: 2, backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      opacity: submitting ? 0.7 : 1,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location_alt</span>
                      {submitting ? 'Saving...' : 'Record Checkpoint'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: TODAY'S SCANS ── */}
      {activeTab === 'today' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: '20px' }}>today</span>
              <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                Today's Scans — {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} ({scannedToday})
              </span>
            </div>
            <button onClick={() => setActiveTab('scanner')} style={{
              backgroundColor: '#0891b2', color: '#fff', border: 'none',
              padding: '0.4rem 0.85rem', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>New Scan
            </button>
          </div>
          {checkpoints.filter(cp => (cp.createdAt || '').startsWith(today)).length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1', display: 'block', marginBottom: '0.75rem' }}>calendar_today</span>
              No scans recorded today.
            </div>
          ) : (
            checkpoints.filter(cp => (cp.createdAt || '').startsWith(today))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((cp, idx, arr) => (
                <div key={cp._id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.9rem 1.25rem', borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0891b2' }}>qr_code_2</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0891b2', fontSize: '0.9rem' }}>{cp.itemCode}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                      {cp.checkpoint?.name || '—'} · {cp.checkpoint?.type || '—'} · {cp.scannedQuantity} units
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CondBadge cond={cp.condition} />
                    <SyncBadge status={cp.syncStatus} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {new Date(cp.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ── TAB: CHECKPOINT HISTORY ── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {[
              { label: 'Shipment', value: filterShipment, setter: setFilterShipment, options: [{ value: 'ALL', label: 'All Shipments' }, ...shipments.map(s => ({ value: s._id, label: s.shipmentNumber }))] },
              { label: 'Manifest', value: filterManifest, setter: setFilterManifest, options: [{ value: 'ALL', label: 'All Manifests' }, ...manifests.map(m => ({ value: m._id, label: m.manifestNumber }))] },
              { label: 'Condition', value: filterCondition, setter: setFilterCondition, options: [{ value: 'ALL', label: 'All' }, ...['GOOD','DAMAGED','SEALED','OPENED'].map(c => ({ value: c, label: c }))] },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>{f.label}:</span>
                <select value={f.value} onChange={e => f.setter(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Date:</span>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
            </div>
            {(filterShipment !== 'ALL' || filterManifest !== 'ALL' || filterCondition !== 'ALL' || filterDate) && (
              <button onClick={() => { setFilterShipment('ALL'); setFilterManifest('ALL'); setFilterCondition('ALL'); setFilterDate(''); }}
                style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                Clear Filters
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{filteredCheckpoints.length} records</span>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                  {['Box Code', 'Checkpoint', 'Type', 'Condition', 'Qty', 'Officer', 'Time', 'Sync'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCheckpoints.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>No records match the filters.</td></tr>
                ) : (
                  filteredCheckpoints.map(cp => (
                    <tr key={cp._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#0891b2' }}>{cp.itemCode}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0F172A' }}>{cp.checkpoint?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.12rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>{cp.checkpoint?.type || '—'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><CondBadge cond={cp.condition} /></td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{cp.scannedQuantity}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>{cp.scannedBy?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {new Date(cp.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><SyncBadge status={cp.syncStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: OFFLINE QUEUE ── */}
      {activeTab === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d97706' }}>cloud_off</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Offline Queue ({offlineQueue.length} pending)</span>
              <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: isOnline ? '#f0fdf4' : '#fef2f2', color: isOnline ? '#15803d' : '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={fetchData} style={{ backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>Refresh
              </button>
              <button onClick={handleSync} disabled={!isOnline || offlineQueue.length === 0} style={{
                backgroundColor: '#0891b2', color: '#fff', border: 'none',
                padding: '0.4rem 0.85rem', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700,
                cursor: (!isOnline || offlineQueue.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (!isOnline || offlineQueue.length === 0) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>sync</span>Sync All
              </button>
            </div>
          </div>

          {offlineQueue.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '4rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#10b981', display: 'block', marginBottom: '1rem' }}>cloud_done</span>
              <p style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9rem' }}>All synced! No pending offline records.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {offlineQueue.map(doc => (
                <div key={doc._id} style={{
                  backgroundColor: '#fff', border: '1px solid #fde68a', borderRadius: '8px',
                  padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d97706' }}>cloud_off</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{doc.itemCode || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{doc.checkpoint?.name || '—'} · {doc.condition || '—'} · Qty {doc.scannedQuantity || 1}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>{new Date(doc.createdAt).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SyncBadge status={doc.syncStatus} />
                    <button onClick={async () => {
                      if (!isOnline) { showToast('No internet.', 'error'); return; }
                      try {
                        if (doc.manifestId) await createCheckpoint({ ...doc, offlineCreated: true });
                        await markEventSynced(doc);
                        showToast(`☁️ Synced ${doc.itemCode}`);
                        await fetchData();
                      } catch (e) { showToast('Sync failed', 'error'); }
                    }} disabled={!isOnline} style={{
                      backgroundColor: '#0891b2', color: '#fff', border: 'none',
                      padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                      cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>sync</span>Retry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SOS ── */}
      {activeTab === 'sos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#fff', border: '2px solid #fca5a5', borderRadius: '8px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#b91c1c', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>emergency</span>
              Raise Emergency SOS
            </h2>
            <form onSubmit={handleSOS} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Emergency Type *</label>
                <select value={sosForm.type} onChange={e => setSosForm(f => ({ ...f, type: e.target.value }))} required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {['MEDICAL', 'FIRE', 'STRUCTURAL', 'WEATHER', 'EQUIPMENT', 'SECURITY', 'OTHER'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Location *</label>
                <input type="text" value={sosForm.location} onChange={e => setSosForm(f => ({ ...f, location: e.target.value }))} required placeholder="e.g. Cargo Bay 3, Goa Port"
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Description *</label>
                <textarea value={sosForm.description} onChange={e => setSosForm(f => ({ ...f, description: e.target.value }))} required placeholder="Describe the emergency..." rows={4}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={sosSubmitting} style={{
                backgroundColor: '#dc2626', color: '#fff', border: 'none',
                padding: '0.75rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(220,38,38,0.3)', opacity: sosSubmitting ? 0.7 : 1,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>emergency</span>
                {sosSubmitting ? 'Sending...' : 'RAISE SOS ALERT'}
              </button>
            </form>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626' }}>info</span>
              SOS Guidelines
            </h2>
            {[
              { icon: 'medical_services',       color: '#b91c1c', title: 'Medical Emergency',  desc: 'Injury, illness, or health crisis.' },
              { icon: 'local_fire_department',  color: '#d97706', title: 'Fire Emergency',      desc: 'Fire or smoke in cargo area.' },
              { icon: 'storm',                  color: '#1d4ed8', title: 'Weather Emergency',   desc: 'Severe weather threatening cargo.' },
              { icon: 'security',               color: '#7c3aed', title: 'Security Incident',   desc: 'Unauthorized access or tampering.' },
            ].map(g => (
              <div key={g.title} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${g.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: g.color }}>{g.icon}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{g.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
