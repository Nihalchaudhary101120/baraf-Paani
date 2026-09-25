import React, { useState, useEffect } from 'react';
import { useAdminData } from '@/context/AdminContext';

const AdminCargoView = () => {
  const { cargoData, fetchCargoData, loading: contextLoading, isInitialized } = useAdminData();
  const [tab, setTab] = useState('checkpoints');

  useEffect(() => {
    fetchCargoData(true);
  }, [fetchCargoData]);

  const data = cargoData;
  const loading = !isInitialized && !data && contextLoading.cargo;

  const summary = data?.summary || {};
  const manifests = data?.manifests || [];
  const checkpoints = data?.checkpoints || [];
  const shipments = data?.shipments || [];

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#0369a1' }}>local_shipping</span>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Cargo & Checkpoint Scanner Data</h1>
            <span style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>READ ONLY</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            View scanned barcode checkpoints, cargo manifests, and active shipments. Data is sourced live from station operators.
          </p>
        </div>
        <button onClick={() => fetchCargoData(false)} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#0369a1', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Cargo Manifests', value: summary.totalManifests ?? manifests.length, color: '#0369a1', icon: 'description' },
          { label: 'Scanned Checkpoints', value: summary.totalCheckpoints ?? checkpoints.length, color: '#0891b2', icon: 'qr_code_scanner' },
          { label: 'Active Shipments', value: summary.totalShipments ?? shipments.length, color: '#7c3aed', icon: 'inventory' },
          { label: 'Recent Scans (Last 10)', value: summary.recentScans?.length ?? 0, color: '#16a34a', icon: 'barcode_reader' },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `4px solid ${s.color}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginTop: '0.25rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Scans Feed */}
      {(summary.recentScans || checkpoints.slice(0, 10)).length > 0 && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0369a1', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
            Live Checkpoint Scan Feed
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(summary.recentScans || checkpoints.slice(0, 10)).map((cp, i) => (
              <div key={cp._id || i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px',
                borderLeft: '3px solid #0369a1', fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0369a1' }}>barcode_reader</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{cp.cargoBarcode || cp.checkpointName || `Checkpoint #${i + 1}`}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{cp.location || cp.checkpointType || ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{cp.scannedAt ? new Date(cp.scannedAt).toLocaleString('en-IN') : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #E2E8F0' }}>
        {[['checkpoints', 'All Checkpoints'], ['manifests', 'Cargo Manifests'], ['shipments', 'Shipments']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '0.5rem 1.25rem', background: 'none', border: 'none',
            borderBottom: tab === key ? '2px solid #0369a1' : '2px solid transparent',
            marginBottom: '-2px', color: tab === key ? '#0369a1' : '#64748B',
            fontWeight: tab === key ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748B' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '30px', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ marginLeft: '0.75rem' }}>Loading cargo data...</span>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {tab === 'checkpoints' && (
            checkpoints.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>qr_code_scanner</span>
                No checkpoint scans recorded yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                    {['Barcode / ID', 'Type', 'Location', 'Scanned At', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkpoints.map((cp, i) => (
                    <tr key={cp._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace', color: '#0369a1' }}>{cp.cargoBarcode || `—`}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{cp.checkpointType || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{cp.location || cp.checkpointName || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{cp.scannedAt ? new Date(cp.scannedAt).toLocaleString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#16a34a' }}>SCANNED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === 'manifests' && (
            manifests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>description</span>
                No cargo manifests found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                    {['Manifest Code', 'Expedition', 'Destination', 'Total Items', 'Created', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manifests.map((m, i) => (
                    <tr key={m._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{m.manifestCode || m.code || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{m.expedition?.expeditionCode || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{m.destination || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{m.items?.length ?? 0}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#0369a1' }}>{m.status || 'CREATED'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === 'shipments' && (
            shipments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>inventory</span>
                No shipments found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                    {['Shipment ID', 'Type', 'Origin → Destination', 'Departure', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, i) => (
                    <tr key={s._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{s.shipmentCode || s._id?.toString().slice(-8).toUpperCase()}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{s.shipmentType || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{s.origin || '—'} → {s.destination || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{s.departureDate ? new Date(s.departureDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fff7ed', color: '#d97706' }}>{s.status || 'IN_TRANSIT'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCargoView;
