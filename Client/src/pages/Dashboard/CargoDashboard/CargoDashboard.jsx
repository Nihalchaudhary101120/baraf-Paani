import React, { useState } from 'react';
import { queueEvent } from '@/services/syncServices/queueService';

// ── Demo data ───────────────────────────────────────────────────────
const DEMO_SHIPMENTS = [
  { _id: 'S001', shipmentNumber: 'SHP-2026-001', origin: 'Goa', destination: 'Bharati', status: 'IN_TRANSIT', departureDate: '2026-09-10', eta: '2026-11-15', manifestCount: 3 },
  { _id: 'S002', shipmentNumber: 'SHP-2026-002', origin: 'Cape Town', destination: 'Bharati', status: 'AT_PORT', departureDate: '2026-10-01', eta: '2026-11-20', manifestCount: 2 },
  { _id: 'S003', shipmentNumber: 'SHP-2025-009', origin: 'Goa', destination: 'Maitri', status: 'DELIVERED', departureDate: '2025-10-05', eta: '2025-12-01', manifestCount: 5 },
];

const DEMO_MANIFESTS = [
  { _id: 'M001', manifestNumber: 'MAN-001', shipmentId: 'S001', itemCount: 24, status: 'IN_TRANSIT', items: [
    { itemCode: 'QR-001', name: 'Medical Supplies', qty: 10 },
    { itemCode: 'QR-002', name: 'Food Rations', qty: 100 },
    { itemCode: 'QR-003', name: 'Scientific Equipment', qty: 3 },
  ]},
  { _id: 'M002', manifestNumber: 'MAN-002', shipmentId: 'S001', itemCount: 12, status: 'IN_TRANSIT', items: [
    { itemCode: 'QR-004', name: 'Fuel Canisters', qty: 20 },
    { itemCode: 'QR-005', name: 'Communication Equipment', qty: 2 },
  ]},
  { _id: 'M003', manifestNumber: 'MAN-003', shipmentId: 'S002', itemCount: 8, status: 'PARTIALLY_RECEIVED', items: [
    { itemCode: 'QR-006', name: 'GPS Units', qty: 5 },
  ]},
];

const DEMO_CHECKPOINTS = [
  { _id: 'C001', itemCode: 'QR-001', checkpoint: { name: 'Goa Port', type: 'PORT' }, scannedQuantity: 10, condition: 'GOOD', createdAt: '2026-09-10T08:00:00Z' },
  { _id: 'C002', itemCode: 'QR-001', checkpoint: { name: 'Cape Town Port', type: 'PORT' }, scannedQuantity: 10, condition: 'GOOD', createdAt: '2026-10-20T14:00:00Z' },
  { _id: 'C003', itemCode: 'QR-002', checkpoint: { name: 'Goa Port', type: 'PORT' }, scannedQuantity: 100, condition: 'GOOD', createdAt: '2026-09-10T08:30:00Z' },
];

const StatusBadge = ({ status }) => {
  const map = {
    IN_TRANSIT:         { bg: '#eff6ff', color: '#1d4ed8', label: 'In Transit' },
    AT_PORT:            { bg: '#fef9c3', color: '#854d0e', label: 'At Port' },
    DELIVERED:          { bg: '#f0fdf4', color: '#15803D', label: 'Delivered' },
    PARTIALLY_RECEIVED: { bg: '#fff7ed', color: '#c2410c', label: 'Partial' },
    RECEIVED:           { bg: '#f0fdf4', color: '#15803D', label: 'Received' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#64748B', label: status };
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      padding: '0.15rem 0.6rem', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: 700,
    }}>{s.label}</span>
  );
};

const CargoDashboard = () => {
  const [activeTab, setActiveTab] = useState('shipments');
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [receiveForm, setReceiveForm] = useState({ manifestId: '', itemCode: '', acceptedQty: '', remarks: '' });
  const [scanItem, setScanItem] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReceiveCargo = async (e) => {
    e.preventDefault();
    const manifest = DEMO_MANIFESTS.find(m => m._id === receiveForm.manifestId);
    if (!manifest) return;

    try {
      await queueEvent({
        type: 'CARGO_RECEIVE',
        manifestId: receiveForm.manifestId,
        itemCode: receiveForm.itemCode,
        acceptedQuantity: parseInt(receiveForm.acceptedQty, 10),
        stationId: 'BHARATI',
        performedBy: 'current-user-id',
        remarks: receiveForm.remarks,
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ Cargo receipt queued${!navigator.onLine ? ' (offline — will sync)' : ' and synced'}!`);
      setReceiveForm({ manifestId: '', itemCode: '', acceptedQty: '', remarks: '' });
    } catch (err) {
      showToast('❌ Failed to queue event: ' + err.message, 'error');
    }
  };

  const handleQRScan = async (item) => {
    try {
      await queueEvent({
        type: 'CHECKPOINT_SCAN',
        manifestId: selectedManifest?._id || 'M001',
        itemCode: item.itemCode,
        checkpoint: { name: 'Bharati Station', type: 'STATION' },
        scannedQuantity: item.qty,
        condition: 'GOOD',
        scannedBy: 'current-user-id',
        offlineCreated: !navigator.onLine,
      });
      showToast(`📦 QR Scan for ${item.name} queued${!navigator.onLine ? ' (offline)' : ''}!`);
    } catch (err) {
      showToast('❌ Scan failed', 'error');
    }
  };

  const tabs = [
    { id: 'shipments', label: 'Shipments', icon: 'local_shipping' },
    { id: 'manifests', label: 'Manifests', icon: 'assignment' },
    { id: 'receive', label: 'Receive Cargo', icon: 'move_to_inbox' },
    { id: 'checkpoints', label: 'Checkpoint History', icon: 'route' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: toast.type === 'error' ? '#B91C1C' : '#15803D',
          borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>CARGO LOGISTICS</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Track shipments from Goa → Cape Town → Bharati Station
          </p>
        </div>
        {/* Pipeline visual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
          {['Goa', '→', 'Cape Town', '→', 'Bharati'].map((s, i) => (
            <span key={i} style={{ color: s === '→' ? '#94a3b8' : (i >= 4 ? '#15803D' : '#005B7F') }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Shipments', value: DEMO_SHIPMENTS.length, icon: 'local_shipping', color: '#005B7F' },
          { label: 'In Transit', value: DEMO_SHIPMENTS.filter(s => s.status === 'IN_TRANSIT').length, icon: 'directions_boat', color: '#1d4ed8' },
          { label: 'Manifests', value: DEMO_MANIFESTS.length, icon: 'assignment', color: '#7c3aed' },
          { label: 'Delivered', value: DEMO_SHIPMENTS.filter(s => s.status === 'DELIVERED').length, icon: 'check_circle', color: '#15803D' },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
            padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              backgroundColor: `${stat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: stat.color }}>{stat.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E2E8F0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #005B7F' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.id ? '#005B7F' : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: SHIPMENTS ──────────────────────────────────────── */}
      {activeTab === 'shipments' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                {['Shipment No.', 'Route', 'Departure', 'ETA', 'Manifests', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_SHIPMENTS.map((s, i) => (
                <tr key={s._id} style={{ borderBottom: i < DEMO_SHIPMENTS.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F' }}>{s.shipmentNumber}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>
                    {s.origin} <span style={{ color: '#94a3b8' }}>→</span> {s.destination}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{s.departureDate}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{s.eta}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#0F172A', fontWeight: 600 }}>{s.manifestCount}</td>
                  <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: MANIFESTS ──────────────────────────────────────── */}
      {activeTab === 'manifests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {DEMO_MANIFESTS.map(manifest => (
            <div key={manifest._id} style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden',
            }}>
              <div
                onClick={() => setSelectedManifest(selectedManifest?._id === manifest._id ? null : manifest)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  backgroundColor: selectedManifest?._id === manifest._id ? '#f0fdfa' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#005B7F' }}>assignment</span>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.9rem' }}>{manifest.manifestNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{manifest.itemCount} items</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <StatusBadge status={manifest.status} />
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>
                    {selectedManifest?._id === manifest._id ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {selectedManifest?._id === manifest._id && (
                <div style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.4rem 0', textAlign: 'left' }}>Item Code</th>
                        <th style={{ padding: '0.4rem 0', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '0.4rem 0', textAlign: 'left' }}>Qty</th>
                        <th style={{ padding: '0.4rem 0', textAlign: 'left' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifest.items.map(item => (
                        <tr key={item.itemCode} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0', fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', fontWeight: 600 }}>{item.itemCode}</td>
                          <td style={{ padding: '0.5rem 0', color: '#0F172A' }}>{item.name}</td>
                          <td style={{ padding: '0.5rem 0', color: '#0F172A', fontWeight: 600 }}>{item.qty}</td>
                          <td style={{ padding: '0.5rem 0' }}>
                            <button
                              type="button"
                              onClick={() => handleQRScan(item)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                backgroundColor: '#005B7F', color: '#fff',
                                border: 'none', borderRadius: '4px',
                                padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>qr_code_scanner</span>
                              Scan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: RECEIVE CARGO ──────────────────────────────────── */}
      {activeTab === 'receive' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#005B7F', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>move_to_inbox</span>
              Accept Cargo at Bharati
            </h2>

            <form onSubmit={handleReceiveCargo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Manifest *</label>
                <select
                  value={receiveForm.manifestId}
                  onChange={e => setReceiveForm(f => ({ ...f, manifestId: e.target.value }))}
                  required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">Choose manifest...</option>
                  {DEMO_MANIFESTS.map(m => (
                    <option key={m._id} value={m._id}>{m.manifestNumber}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Item Code *</label>
                <select
                  value={receiveForm.itemCode}
                  onChange={e => setReceiveForm(f => ({ ...f, itemCode: e.target.value }))}
                  required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">Choose item...</option>
                  {(DEMO_MANIFESTS.find(m => m._id === receiveForm.manifestId)?.items || []).map(item => (
                    <option key={item.itemCode} value={item.itemCode}>{item.itemCode} — {item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Accepted Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={receiveForm.acceptedQty}
                  onChange={e => setReceiveForm(f => ({ ...f, acceptedQty: e.target.value }))}
                  required
                  placeholder="e.g. 10"
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Remarks / Inspection Notes</label>
                <textarea
                  value={receiveForm.remarks}
                  onChange={e => setReceiveForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Any damage or notes..."
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, backgroundColor: '#005B7F', color: '#fff',
                    border: 'none', padding: '0.65rem', borderRadius: '6px',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Accept Cargo
                </button>
              </div>
            </form>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#005B7F', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>qr_code_2</span>
              QR Scanner
            </h2>
            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: '8px',
              padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#cbd5e1' }}>qr_code_scanner</span>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.75rem', color: '#64748B' }}>
                Point camera at QR code
              </p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Works offline — queued automatically
              </p>
              <button
                type="button"
                onClick={() => {
                  const items = DEMO_MANIFESTS.flatMap(m => m.items);
                  const random = items[Math.floor(Math.random() * items.length)];
                  handleQRScan(random);
                }}
                style={{
                  marginTop: '1.25rem',
                  backgroundColor: '#005B7F', color: '#fff',
                  border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
                Simulate QR Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CHECKPOINTS ────────────────────────────────────── */}
      {activeTab === 'checkpoints' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#005B7F' }}>route</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Checkpoint Scan History</span>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DEMO_CHECKPOINTS.map(cp => (
              <div key={cp._id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.85rem', backgroundColor: '#f8fafc',
                borderRadius: '6px', border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: '#005B7F15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005B7F' }}>location_on</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                    {cp.checkpoint.name}
                    <span style={{
                      marginLeft: '0.5rem',
                      backgroundColor: '#eff6ff', color: '#1d4ed8',
                      padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
                    }}>
                      {cp.checkpoint.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    Item: <strong>{cp.itemCode}</strong> · Qty: <strong>{cp.scannedQuantity}</strong> · Condition: <strong>{cp.condition}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {new Date(cp.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoDashboard;
