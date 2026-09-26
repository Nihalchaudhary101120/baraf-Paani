import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// ── Demo Data ──────────────────────────────────────────────────────────────────

const DEMO_SHIPMENTS = [
  {
    _id: 'S001', shipmentNumber: 'SHP-2026-001', origin: 'Goa', destination: 'Bharati',
    status: 'IN_TRANSIT', departureDate: '2026-09-10', eta: '2026-11-15',
    vessel: 'MV Bharati Express', manifestCount: 3, totalBoxes: 48, totalWeightKg: 2400,
    description: 'Scientific Equipment & Winter Supplies', createdAt: '2026-09-05',
  },
  {
    _id: 'S002', shipmentNumber: 'SHP-2026-002', origin: 'Cape Town', destination: 'Bharati',
    status: 'AT_PORT', departureDate: '2026-10-01', eta: '2026-11-20',
    vessel: 'SA Agulhas II', manifestCount: 2, totalBoxes: 30, totalWeightKg: 1800,
    description: 'Food Rations & Medical Supplies', createdAt: '2026-09-22',
  },
  {
    _id: 'S003', shipmentNumber: 'SHP-2025-009', origin: 'Goa', destination: 'Maitri',
    status: 'DELIVERED', departureDate: '2025-10-05', eta: '2025-12-01',
    vessel: 'MV Ocean Voyager', manifestCount: 5, totalBoxes: 120, totalWeightKg: 6000,
    description: 'Expedition EXP-46 Annual Resupply', createdAt: '2025-09-28',
  },
  {
    _id: 'S004', shipmentNumber: 'SHP-2026-003', origin: 'Goa', destination: 'Maitri',
    status: 'PREPARING', departureDate: '2026-11-01', eta: '2027-01-15',
    vessel: 'MV Bharati Express', manifestCount: 0, totalBoxes: 0, totalWeightKg: 0,
    description: 'EXP-47 Summer Season Resupply', createdAt: '2026-09-24',
  },
];

const DEMO_BOXES = [
  { _id: 'B001', boxCode: 'BOX-2026-001', description: 'Seismic Sensors Pack A', category: 'SCIENTIFIC', weightKg: 45, dimensions: '60×40×30cm', shipmentId: 'S001', manifestId: 'M001', qrGenerated: true, condition: 'GOOD' },
  { _id: 'B002', boxCode: 'BOX-2026-002', description: 'GPS Modules & Batteries', category: 'ELECTRONIC', weightKg: 12, dimensions: '40×30×20cm', shipmentId: 'S001', manifestId: 'M001', qrGenerated: true, condition: 'GOOD' },
  { _id: 'B003', boxCode: 'BOX-2026-003', description: 'Winter Clothing Set Alpha', category: 'CLOTHING', weightKg: 30, dimensions: '80×50×40cm', shipmentId: 'S001', manifestId: 'M002', qrGenerated: true, condition: 'GOOD' },
  { _id: 'B004', boxCode: 'BOX-2026-004', description: 'Emergency Medical Kit', category: 'MEDICAL', weightKg: 18, dimensions: '50×40×30cm', shipmentId: 'S002', manifestId: 'M003', qrGenerated: false, condition: 'GOOD' },
  { _id: 'B005', boxCode: 'BOX-2026-005', description: 'Fuel Canisters (Diesel)', category: 'FUEL', weightKg: 200, dimensions: '120×80×60cm', shipmentId: 'S001', manifestId: 'M002', qrGenerated: true, condition: 'GOOD' },
  { _id: 'B006', boxCode: 'BOX-2026-006', description: 'Atmospheric Sampling Equipment', category: 'SCIENTIFIC', weightKg: 55, dimensions: '70×50×40cm', shipmentId: 'S002', manifestId: 'M003', qrGenerated: false, condition: 'GOOD' },
];

const DEMO_MANIFESTS = [
  {
    _id: 'M001', manifestNumber: 'CGM-2026-001', shipmentId: 'S001',
    status: 'IN_TRANSIT', createdAt: '2026-09-06',
    description: 'Scientific Equipment Manifest',
    boxes: ['B001', 'B002'],
    totalWeight: 57, totalBoxes: 2,
  },
  {
    _id: 'M002', manifestNumber: 'CGM-2026-002', shipmentId: 'S001',
    status: 'IN_TRANSIT', createdAt: '2026-09-06',
    description: 'Clothing & Fuel Manifest',
    boxes: ['B003', 'B005'],
    totalWeight: 230, totalBoxes: 2,
  },
  {
    _id: 'M003', manifestNumber: 'CGM-2026-003', shipmentId: 'S002',
    status: 'AT_PORT', createdAt: '2026-09-23',
    description: 'Medical & Atmospheric Equipment',
    boxes: ['B004', 'B006'],
    totalWeight: 73, totalBoxes: 2,
  },
];

const DEMO_CHECKPOINTS = [
  { _id: 'CP001', boxCode: 'BOX-2026-001', boxDesc: 'Seismic Sensors Pack A', checkpointName: 'Goa Port Dispatch', checkpointType: 'PORT_DISPATCH', officerName: 'Lt. Ramesh Kumar', condition: 'GOOD', notes: 'All units packed securely', timestamp: '2026-09-10T08:00:00Z', shipmentNumber: 'SHP-2026-001' },
  { _id: 'CP002', boxCode: 'BOX-2026-002', boxDesc: 'GPS Modules & Batteries', checkpointName: 'Goa Port Dispatch', checkpointType: 'PORT_DISPATCH', officerName: 'Lt. Ramesh Kumar', condition: 'GOOD', notes: '', timestamp: '2026-09-10T08:30:00Z', shipmentNumber: 'SHP-2026-001' },
  { _id: 'CP003', boxCode: 'BOX-2026-001', boxDesc: 'Seismic Sensors Pack A', checkpointName: 'Cape Town Transit Hub', checkpointType: 'PORT_TRANSIT', officerName: 'Officer A. van Zyl', condition: 'GOOD', notes: 'Verified seal intact', timestamp: '2026-10-18T14:00:00Z', shipmentNumber: 'SHP-2026-001' },
  { _id: 'CP004', boxCode: 'BOX-2026-003', boxDesc: 'Winter Clothing Set Alpha', checkpointName: 'Goa Port Dispatch', checkpointType: 'PORT_DISPATCH', officerName: 'Lt. Ramesh Kumar', condition: 'GOOD', notes: '', timestamp: '2026-09-10T09:00:00Z', shipmentNumber: 'SHP-2026-001' },
  { _id: 'CP005', boxCode: 'BOX-2026-005', boxDesc: 'Fuel Canisters (Diesel)', checkpointName: 'Cape Town Transit Hub', checkpointType: 'PORT_TRANSIT', officerName: 'Officer A. van Zyl', condition: 'GOOD', notes: 'Pressure check passed', timestamp: '2026-10-19T10:00:00Z', shipmentNumber: 'SHP-2026-001' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  IN_TRANSIT: { bg: '#eff6ff', color: '#1d4ed8', label: 'In Transit', icon: 'directions_boat' },
  AT_PORT: { bg: '#fef9c3', color: '#854d0e', label: 'At Port', icon: 'anchor' },
  DELIVERED: { bg: '#f0fdf4', color: '#15803D', label: 'Delivered', icon: 'check_circle' },
  PARTIALLY_RECEIVED: { bg: '#fff7ed', color: '#c2410c', label: 'Partial', icon: 'pending' },
  RECEIVED: { bg: '#f0fdf4', color: '#15803D', label: 'Received', icon: 'done_all' },
  PREPARING: { bg: '#f5f3ff', color: '#7c3aed', label: 'Preparing', icon: 'inventory_2' },
  CREATED: { bg: '#f8fafc', color: '#475569', label: 'Created', icon: 'add_circle' },
};

const CATEGORY_COLOR = {
  SCIENTIFIC: { bg: '#eff6ff', color: '#1d4ed8' },
  ELECTRONIC: { bg: '#f0fdf4', color: '#166534' },
  CLOTHING: { bg: '#fdf4ff', color: '#7e22ce' },
  MEDICAL: { bg: '#fff0f0', color: '#b91c1c' },
  FUEL: { bg: '#fff7ed', color: '#c2410c' },
  FOOD: { bg: '#fefce8', color: '#854d0e' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { bg: '#f1f5f9', color: '#64748B', label: status, icon: 'help' };
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      padding: '0.2rem 0.65rem', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{s.icon}</span>
      {s.label}
    </span>
  );
};

const generateQRSVG = (text) => {
  // Simple deterministic SVG QR-like pattern for demo purposes
  const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = [];
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const isEdge = r < 2 || r > 8 || c < 2 || c > 8;
      const isBorderBox = (r < 2 && c < 2) || (r < 2 && c > 8) || (r > 8 && c < 2);
      const filled = isBorderBox || (!isEdge && ((hash * (r + 1) * (c + 1)) % 3 === 0));
      if (filled) {
        cells.push(<rect key={`${r}-${c}`} x={c * 6} y={r * 6} width={5} height={5} fill="#0F172A" />);
      }
    }
  }
  return (
    <svg width="66" height="66" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <rect width="66" height="66" fill="white" />
      {cells}
    </svg>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CargoOfficerDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => setSearchParams({ tab });

  // ── Shipment Create Modal State
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [shipments, setShipments] = useState(DEMO_SHIPMENTS);
  const [shipmentForm, setShipmentForm] = useState({
    shipmentNumber: '', origin: 'Goa', destination: 'Bharati',
    vessel: '', departureDate: '', eta: '', description: '',
  });

  // ── Manifest State
  const [manifests, setManifests] = useState(DEMO_MANIFESTS);
  const [isCreateManifestOpen, setIsCreateManifestOpen] = useState(false);
  const [manifestForm, setManifestForm] = useState({
    manifestNumber: '', shipmentId: '', description: '',
  });

  // ── Box / QR State
  const [boxes, setBoxes] = useState(DEMO_BOXES);
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [boxForm, setBoxForm] = useState({
    boxCode: '', description: '', category: 'SCIENTIFIC', weightKg: '', dimensions: '', shipmentId: '', manifestId: '',
  });
  const [qrPreviewBox, setQrPreviewBox] = useState(null);
  const [generatingQR, setGeneratingQR] = useState(null);

  // ── Assign Box Modal
  const [isAssignBoxOpen, setIsAssignBoxOpen] = useState(false);
  const [assignBoxId, setAssignBoxId] = useState('');
  const [assignManifestId, setAssignManifestId] = useState('');

  // ── Checkpoints
  const [checkpoints] = useState(DEMO_CHECKPOINTS);
  const [cpFilter, setCpFilter] = useState('ALL');

  // ── Tracking
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackedShipment, setTrackedShipment] = useState(null);

  // ── Search / Filters
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ── Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Computed Stats
  const stats = useMemo(() => ({
    totalShipments: shipments.length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    delivered: shipments.filter(s => s.status === 'DELIVERED').length,
    atPort: shipments.filter(s => s.status === 'AT_PORT').length,
    preparing: shipments.filter(s => s.status === 'PREPARING').length,
    totalManifests: manifests.length,
    totalBoxes: boxes.length,
    qrGenerated: boxes.filter(b => b.qrGenerated).length,
    pendingQR: boxes.filter(b => !b.qrGenerated).length,
  }), [shipments, manifests, boxes]);

  // ── Filtered Shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchSearch = !shipmentSearch ||
        s.shipmentNumber.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.vessel?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(shipmentSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [shipments, shipmentSearch, statusFilter]);

  // ── Handlers
  const handleCreateShipment = (e) => {
    e.preventDefault();
    const newShipment = {
      _id: `S${Date.now()}`,
      ...shipmentForm,
      status: 'PREPARING',
      manifestCount: 0, totalBoxes: 0, totalWeightKg: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setShipments(prev => [newShipment, ...prev]);
    setShipmentForm({ shipmentNumber: '', origin: 'Goa', destination: 'Bharati', vessel: '', departureDate: '', eta: '', description: '' });
    setIsCreateShipmentOpen(false);
    showToast(`✅ Shipment ${newShipment.shipmentNumber} created successfully!`);
  };

  const handleCreateManifest = (e) => {
    e.preventDefault();
    const newManifest = {
      _id: `M${Date.now()}`,
      ...manifestForm,
      status: 'CREATED',
      boxes: [], totalWeight: 0, totalBoxes: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setManifests(prev => [newManifest, ...prev]);
    setManifestForm({ manifestNumber: '', shipmentId: '', description: '' });
    setIsCreateManifestOpen(false);
    showToast(`✅ Cargo Manifest ${newManifest.manifestNumber} created!`);
  };

  const handleAddBox = (e) => {
    e.preventDefault();
    const newBox = {
      _id: `B${Date.now()}`,
      ...boxForm,
      weightKg: parseFloat(boxForm.weightKg),
      qrGenerated: false,
      condition: 'GOOD',
    };
    setBoxes(prev => [newBox, ...prev]);
    setBoxForm({ boxCode: '', description: '', category: 'SCIENTIFIC', weightKg: '', dimensions: '', shipmentId: '', manifestId: '' });
    setIsAddBoxOpen(false);
    showToast(`📦 Box ${newBox.boxCode} added successfully!`);
  };

  const handleGenerateQR = (box) => {
    setGeneratingQR(box._id);
    setTimeout(() => {
      setBoxes(prev => prev.map(b => b._id === box._id ? { ...b, qrGenerated: true } : b));
      setGeneratingQR(null);
      setQrPreviewBox({ ...box, qrGenerated: true });
      showToast(`🔲 QR Code generated for ${box.boxCode}!`);
    }, 1200);
  };

  const handleAssignBox = (e) => {
    e.preventDefault();
    setBoxes(prev => prev.map(b => b._id === assignBoxId ? { ...b, manifestId: assignManifestId } : b));
    setManifests(prev => prev.map(m => {
      if (m._id === assignManifestId) {
        const box = boxes.find(b => b._id === assignBoxId);
        return {
          ...m,
          boxes: [...(m.boxes || []), assignBoxId],
          totalBoxes: (m.totalBoxes || 0) + 1,
          totalWeight: (m.totalWeight || 0) + (box?.weightKg || 0),
        };
      }
      return m;
    }));
    setIsAssignBoxOpen(false);
    showToast('📎 Box assigned to manifest successfully!');
  };

  const handleTrackShipment = () => {
    const found = shipments.find(s =>
      s.shipmentNumber.toLowerCase().includes(trackingQuery.toLowerCase())
    );
    if (found) {
      setTrackedShipment(found);
    } else {
      setTrackedShipment(null);
      showToast('❌ No shipment found for that number.', 'error');
    }
  };

  const getTrackingSteps = (status) => {
    const steps = [
      { key: 'PREPARING', label: 'Preparing', icon: 'inventory_2', desc: 'Shipment is being prepared at origin.' },
      { key: 'AT_PORT', label: 'At Port', icon: 'anchor', desc: 'Shipment arrived at departure port.' },
      { key: 'IN_TRANSIT', label: 'In Transit', icon: 'directions_boat', desc: 'Vessel is en route to destination.' },
      { key: 'PARTIALLY_RECEIVED', label: 'Partially Received', icon: 'pending', desc: 'Some cargo received at station.' },
      { key: 'DELIVERED', label: 'Delivered', icon: 'check_circle', desc: 'All cargo delivered to station.' },
    ];
    const statusOrder = ['PREPARING', 'AT_PORT', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'DELIVERED'];
    const currentIdx = statusOrder.indexOf(status);
    return steps.map((step, idx) => ({ ...step, done: idx <= currentIdx, current: idx === currentIdx }));
  };

  const filteredCheckpoints = useMemo(() => {
    if (cpFilter === 'ALL') return checkpoints;
    return checkpoints.filter(cp => cp.checkpointType === cpFilter);
  }, [checkpoints, cpFilter]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: toast.type === 'error' ? '#B91C1C' : '#15803D',
          borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px',
        padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            backgroundColor: '#7c3aed', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>inventory_2</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', margin: 0 }}>
                CARGO OFFICER PORTAL
              </h1>
              <span style={{
                backgroundColor: '#f5f3ff', color: '#7c3aed',
                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                NCPOR LOGISTICS
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Shipment Management · Cargo Manifests · QR Tracking · Checkpoint Monitoring
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Pipeline visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600 }}>
            {['Goa', '→', 'Cape Town', '→', 'Station'].map((s, i) => (
              <span key={i} style={{ color: s === '→' ? '#94a3b8' : '#7c3aed' }}>{s}</span>
            ))}
          </div>

          <button
            onClick={() => setIsCreateShipmentOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.95rem', backgroundColor: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(124,58,237,0.25)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
            New Shipment
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.9rem' }}>
        {[
          { label: 'Total Shipments', value: stats.totalShipments, color: '#7c3aed', border: '#7c3aed', sub: 'All expeditions' },
          { label: 'In Transit', value: stats.inTransit, color: '#1d4ed8', border: '#3b82f6', sub: 'En route to station' },
          { label: 'Delivered', value: stats.delivered, color: '#059669', border: '#10b981', sub: 'Station received' },
          { label: 'QR Generated', value: stats.qrGenerated, color: '#0891b2', border: '#06b6d4', sub: `${stats.pendingQR} pending` },
          { label: 'Cargo Manifests', value: stats.totalManifests, color: '#d97706', border: '#f59e0b', sub: `${stats.totalBoxes} total boxes` },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
            borderLeft: `4px solid ${stat.border}`,
            padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase' }}>{stat.label}</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #CBD5E1', paddingBottom: '0.25rem', overflowX: 'auto' }}>
        {[
          { key: 'overview', label: 'Dashboard', icon: 'dashboard' },
          { key: 'shipments', label: 'Shipments', icon: 'local_shipping' },
          { key: 'manifests', label: 'Cargo Manifests', icon: 'assignment' },
          { key: 'qr', label: 'QR Generation', icon: 'qr_code_2', badge: stats.pendingQR },
          { key: 'tracking', label: 'Shipment Tracking', icon: 'gps_fixed' },
          { key: 'checkpoints', label: 'Checkpoint History', icon: 'route' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1rem', borderRadius: '6px', border: 'none',
              backgroundColor: activeTab === tab.key ? '#7c3aed' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#475569',
              fontWeight: activeTab === tab.key ? 700 : 600,
              fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                backgroundColor: activeTab === tab.key ? '#fff' : '#f59e0b',
                color: activeTab === tab.key ? '#7c3aed' : '#fff',
                fontSize: '0.65rem', fontWeight: 800,
                padding: '0.1rem 0.4rem', borderRadius: '9999px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW / DASHBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>

          {/* Left: Active Shipments Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Active Shipments Quick Table */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '20px' }}>directions_boat</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Active Shipments</span>
                </div>
                <button onClick={() => setActiveTab('shipments')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  View All →
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #E2E8F0' }}>
                    {['Shipment No.', 'Route', 'Vessel', 'ETA', 'Boxes', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shipments.filter(s => s.status !== 'DELIVERED').map((s, i) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{s.shipmentNumber}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{s.origin} <span style={{ color: '#94a3b8' }}>→</span> {s.destination}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>{s.vessel || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.78rem' }}>{s.eta}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{s.totalBoxes}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Boxes Awaiting QR */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '20px' }}>qr_code_2</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Boxes Awaiting QR Generation ({stats.pendingQR})</span>
                </div>
                <button onClick={() => setActiveTab('qr')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Generate QRs →
                </button>
              </div>
              {boxes.filter(b => !b.qrGenerated).length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#10b981', display: 'block', marginBottom: '0.5rem' }}>check_circle</span>
                  All boxes have QR codes generated!
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #E2E8F0' }}>
                      {['Box Code', 'Description', 'Category', 'Shipment', 'Action'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.filter(b => !b.qrGenerated).map(box => (
                      <tr key={box._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.7rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{box.boxCode}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#0F172A' }}>{box.description}</td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <span style={{ ...(CATEGORY_COLOR[box.category] || { bg: '#f1f5f9', color: '#475569' }), padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: (CATEGORY_COLOR[box.category] || {}).bg }}>
                            {box.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontFamily: 'monospace', fontSize: '0.78rem' }}>{box.shipmentId || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <button
                            onClick={() => handleGenerateQR(box)}
                            disabled={generatingQR === box._id}
                            style={{
                              backgroundColor: '#7c3aed', color: '#fff', border: 'none',
                              padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: generatingQR === box._id ? 0.6 : 1,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>qr_code_2</span>
                            {generatingQR === box._id ? 'Generating...' : 'Generate QR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Recent Checkpoints & Manifest Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Recent Checkpoint Updates */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: '20px' }}>route</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Recent Checkpoint Updates</span>
                </div>
                <button onClick={() => setActiveTab('checkpoints')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  View All →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {checkpoints.slice(0, 4).map(cp => (
                  <div key={cp._id} style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f0f9ff',
                    borderLeft: '3px solid #0891b2',
                    borderRadius: '4px', fontSize: '0.78rem',
                  }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{cp.checkpointName}</div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      <strong style={{ color: '#7c3aed' }}>{cp.boxCode}</strong> · {cp.boxDesc} · <span style={{ color: '#059669', fontWeight: 600 }}>{cp.condition}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px' }}>
                      {new Date(cp.timestamp).toLocaleDateString('en-IN')} · {cp.officerName}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manifest Status Summary */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '20px' }}>assignment</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Manifest Status</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {manifests.map(m => (
                  <div key={m._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem', backgroundColor: '#fafaf9', borderRadius: '6px',
                    border: '1px solid #e7e5e4',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: '0.85rem' }}>{m.manifestNumber}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>{m.totalBoxes} boxes · {m.totalWeight} kg</div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: SHIPMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'shipments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Filter Bar */}
          <div style={{
            backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
            padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', backgroundColor: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Search by shipment number, vessel, description..."
                value={shipmentSearch}
                onChange={e => setShipmentSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Status:</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <option value="ALL">All Statuses</option>
                <option value="PREPARING">Preparing</option>
                <option value="AT_PORT">At Port</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
            <button onClick={() => setIsCreateShipmentOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.9rem', backgroundColor: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
              Create Shipment
            </button>
          </div>

          {/* Shipments Table */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                  {['Shipment No.', 'Origin → Destination', 'Vessel', 'Departure', 'ETA', 'Manifests', 'Boxes', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{s.shipmentNumber}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>
                      {s.origin} <span style={{ color: '#94a3b8' }}>→</span> {s.destination}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{s.vessel || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{s.departureDate}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{s.eta}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{s.manifestCount}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{s.totalBoxes}</td>
                    <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={s.status} /></td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => { setTrackingQuery(s.shipmentNumber); setActiveTab('tracking'); }}
                          style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff', padding: '0.3rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>gps_fixed</span>
                          Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredShipments.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>No shipments match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: CARGO MANIFESTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'manifests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Cargo Manifests ({manifests.length})</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setIsAssignBoxOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.9rem', backgroundColor: '#0891b2', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
                Assign Box to Manifest
              </button>
              <button onClick={() => setIsAddBoxOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.9rem', backgroundColor: '#059669', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_box</span>
                Add Cargo Box
              </button>
              <button onClick={() => setIsCreateManifestOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.9rem', backgroundColor: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                Create Manifest
              </button>
            </div>
          </div>

          {manifests.map(manifest => {
            const manifestBoxes = boxes.filter(b => b.manifestId === manifest._id);
            return (
              <div key={manifest._id} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#7c3aed' }}>assignment</span>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: '0.95rem' }}>{manifest.manifestNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{manifest.description} · Shipment: {manifest.shipmentId}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{manifest.totalBoxes} boxes · {manifest.totalWeight} kg</span>
                    <StatusBadge status={manifest.status} />
                  </div>
                </div>

                {manifestBoxes.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #E2E8F0' }}>
                        {['Box Code', 'Description', 'Category', 'Weight', 'Dimensions', 'QR Status', 'Condition'].map(h => (
                          <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {manifestBoxes.map(box => (
                        <tr key={box._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{box.boxCode}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#0F172A' }}>{box.description}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ ...(CATEGORY_COLOR[box.category] || {}), padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: (CATEGORY_COLOR[box.category] || { bg: '#f1f5f9' }).bg }}>
                              {box.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{box.weightKg} kg</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontFamily: 'monospace', fontSize: '0.78rem' }}>{box.dimensions}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {box.qrGenerated ? (
                              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span> Generated
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>pending</span> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>{box.condition}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    No boxes assigned to this manifest yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: QR GENERATION
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Left: QR Generation Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '20px' }}>qr_code_2</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>All Cargo Boxes · QR Status</span>
                </div>
                <button onClick={() => setIsAddBoxOpen(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.8rem', backgroundColor: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_box</span>
                  Add Box
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {boxes.map((box, idx) => (
                  <div key={box._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: idx < boxes.length - 1 ? '1px solid #f1f5f9' : 'none',
                    backgroundColor: qrPreviewBox?._id === box._id ? '#f5f3ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: '0.85rem' }}>{box.boxCode}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{box.description} · {box.weightKg} kg</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {box.qrGenerated ? (
                        <>
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>✓ QR Ready</span>
                          <button
                            onClick={() => setQrPreviewBox(box)}
                            style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Preview
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleGenerateQR(box)}
                          disabled={generatingQR === box._id}
                          style={{
                            backgroundColor: '#7c3aed', color: '#fff', border: 'none',
                            padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            opacity: generatingQR === box._id ? 0.7 : 1,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>qr_code_2</span>
                          {generatingQR === box._id ? 'Generating...' : 'Generate QR'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: QR Preview Panel */}
          <div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#7c3aed' }}>qr_code_scanner</span>
                QR Code Preview
              </h2>

              {qrPreviewBox ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{
                    border: '2px solid #e9d5ff', borderRadius: '12px', padding: '1.5rem',
                    backgroundColor: '#fafaf9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                    width: '100%',
                  }}>
                    {generateQRSVG(qrPreviewBox.boxCode)}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', fontSize: '0.95rem' }}>{qrPreviewBox.boxCode}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px' }}>{qrPreviewBox.description}</div>
                    </div>
                  </div>

                  <div style={{ width: '100%', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                    {[
                      ['Box Code', qrPreviewBox.boxCode],
                      ['Category', qrPreviewBox.category],
                      ['Weight', `${qrPreviewBox.weightKg} kg`],
                      ['Dimensions', qrPreviewBox.dimensions],
                      ['Manifest', qrPreviewBox.manifestId || '—'],
                      ['Condition', qrPreviewBox.condition],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: label === 'Box Code' || label === 'Manifest' ? 'monospace' : 'inherit' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button style={{
                    width: '100%', backgroundColor: '#7c3aed', color: '#fff',
                    border: 'none', padding: '0.65rem', borderRadius: '6px',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
                    Print QR Label
                  </button>
                </div>
              ) : (
                <div style={{ border: '2px dashed #e9d5ff', borderRadius: '12px', padding: '4rem 1rem', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#d8b4fe', display: 'block', marginBottom: '0.75rem' }}>qr_code_2</span>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#64748B' }}>Select a box to preview QR</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Click "Preview" on any generated QR code</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5: SHIPMENT TRACKING
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Search Bar */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#7c3aed' }}>gps_fixed</span>
              Track Shipment Progress
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>search</span>
                <input
                  type="text"
                  placeholder="Enter Shipment Number (e.g. SHP-2026-001)..."
                  value={trackingQuery}
                  onChange={e => setTrackingQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrackShipment()}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
                />
              </div>
              <button onClick={handleTrackShipment} style={{
                backgroundColor: '#7c3aed', color: '#fff', border: 'none',
                padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>gps_fixed</span>
                Track
              </button>
            </div>
          </div>

          {/* Quick Links to all shipments */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {shipments.map(s => (
              <button
                key={s._id}
                onClick={() => { setTrackingQuery(s.shipmentNumber); setTrackedShipment(s); }}
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: '6px',
                  border: trackedShipment?._id === s._id ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  backgroundColor: trackedShipment?._id === s._id ? '#f5f3ff' : '#fff',
                  color: trackedShipment?._id === s._id ? '#7c3aed' : '#475569',
                  fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                {s.shipmentNumber}
              </button>
            ))}
          </div>

          {trackedShipment && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>

              {/* Shipment Info Card */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#7c3aed' }}>directions_boat</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', fontSize: '1rem' }}>{trackedShipment.shipmentNumber}</div>
                    <StatusBadge status={trackedShipment.status} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                  {[
                    ['Vessel', trackedShipment.vessel || '—'],
                    ['Route', `${trackedShipment.origin} → ${trackedShipment.destination}`],
                    ['Departure', trackedShipment.departureDate],
                    ['ETA', trackedShipment.eta],
                    ['Manifests', trackedShipment.manifestCount],
                    ['Total Boxes', trackedShipment.totalBoxes],
                    ['Total Weight', `${trackedShipment.totalWeightKg} kg`],
                    ['Description', trackedShipment.description],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#0F172A', fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Timeline */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7c3aed' }}>route</span>
                  Shipment Progress Timeline
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {getTrackingSteps(trackedShipment.status).map((step, idx, arr) => (
                    <div key={step.key} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      {/* Timeline dot & line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          backgroundColor: step.current ? '#7c3aed' : step.done ? '#dcfce7' : '#f1f5f9',
                          border: `2px solid ${step.current ? '#7c3aed' : step.done ? '#10b981' : '#e2e8f0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: step.current ? '#fff' : step.done ? '#15803d' : '#94a3b8' }}>
                            {step.done && !step.current ? 'check' : step.icon}
                          </span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div style={{ width: '2px', height: '40px', backgroundColor: step.done ? '#10b981' : '#e2e8f0' }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ paddingBottom: idx < arr.length - 1 ? '0.75rem' : 0 }}>
                        <div style={{ fontWeight: 700, color: step.current ? '#7c3aed' : step.done ? '#0F172A' : '#94a3b8', fontSize: '0.85rem' }}>{step.label}</div>
                        <div style={{ fontSize: '0.75rem', color: step.done ? '#64748B' : '#cbd5e1', marginTop: '2px' }}>{step.desc}</div>
                        {step.current && (
                          <span style={{ display: 'inline-block', marginTop: '4px', backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT STATUS</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkpoints for this shipment */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Checkpoint Scans for this Shipment</h4>
                  {checkpoints.filter(cp => cp.shipmentNumber === trackedShipment.shipmentNumber).length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No checkpoint scans recorded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {checkpoints.filter(cp => cp.shipmentNumber === trackedShipment.shipmentNumber).map(cp => (
                        <div key={cp._id} style={{ padding: '0.6rem 0.85rem', backgroundColor: '#f0f9ff', borderLeft: '3px solid #0891b2', borderRadius: '4px', fontSize: '0.78rem' }}>
                          <strong style={{ color: '#0F172A' }}>{cp.checkpointName}</strong> · {cp.boxCode}
                          <span style={{ float: 'right', color: '#94a3b8' }}>{new Date(cp.timestamp).toLocaleDateString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!trackedShipment && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '4rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#d8b4fe', display: 'block', marginBottom: '1rem' }}>gps_off</span>
              <p style={{ fontWeight: 600, color: '#64748B', fontSize: '0.9rem' }}>Enter a shipment number to track progress</p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Use the search bar above or click a shipment button</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 6: CHECKPOINT HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'checkpoints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Filter */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#7c3aed' }}>route</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Checkpoint Scan History ({filteredCheckpoints.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Filter by type:</span>
              <select value={cpFilter} onChange={e => setCpFilter(e.target.value)} style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <option value="ALL">All Checkpoints</option>
                <option value="PORT_DISPATCH">Port Dispatch</option>
                <option value="PORT_TRANSIT">Port Transit</option>
                <option value="STATION">Station Delivery</option>
              </select>
            </div>
          </div>

          {/* Timeline List */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            {filteredCheckpoints.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>No checkpoint scans found.</div>
            ) : (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredCheckpoints.map((cp, idx) => (
                  <div key={cp._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Timeline decoration */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0891b2' }}>location_on</span>
                      </div>
                      {idx < filteredCheckpoints.length - 1 && (
                        <div style={{ width: '2px', height: '24px', backgroundColor: '#e0f2fe' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '0.85rem 1rem', border: '1px solid #bae6fd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>{cp.checkpointName}</span>
                          <span style={{
                            marginLeft: '0.5rem', backgroundColor: '#eff6ff', color: '#1d4ed8',
                            padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                          }}>
                            {cp.checkpointType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {new Date(cp.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span><strong style={{ color: '#7c3aed' }}>{cp.boxCode}</strong> · {cp.boxDesc}</span>
                        <span>Condition: <strong style={{ color: '#059669' }}>{cp.condition}</strong></span>
                        <span>Officer: <strong>{cp.officerName}</strong></span>
                        {cp.notes && <span style={{ color: '#64748B' }}>Note: {cp.notes}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Create Shipment Modal */}
      {isCreateShipmentOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '22px' }}>local_shipping</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Create New Shipment</h2>
              </div>
              <button onClick={() => setIsCreateShipmentOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <form onSubmit={handleCreateShipment} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Shipment Number *', key: 'shipmentNumber', placeholder: 'e.g. SHP-2026-004', type: 'text' },
                { label: 'Vessel Name', key: 'vessel', placeholder: 'e.g. MV Bharati Express', type: 'text' },
                { label: 'Departure Date *', key: 'departureDate', placeholder: '', type: 'date' },
                { label: 'ETA *', key: 'eta', placeholder: '', type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={shipmentForm[field.key]}
                    onChange={e => setShipmentForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.label.includes('*')}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Origin *', key: 'origin', options: ['Goa', 'Cape Town', 'Mumbai'] },
                  { label: 'Destination *', key: 'destination', options: ['Bharati', 'Maitri'] },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>{field.label}</label>
                    <select
                      value={shipmentForm[field.key]}
                      onChange={e => setShipmentForm(f => ({ ...f, [field.key]: e.target.value }))}
                      style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                    >
                      {field.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Description</label>
                <textarea
                  value={shipmentForm.description}
                  onChange={e => setShipmentForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of cargo..."
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button type="button" onClick={() => setIsCreateShipmentOpen(false)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 2, backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Create Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manifest Modal */}
      {isCreateManifestOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '22px' }}>assignment</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Create Cargo Manifest</h2>
              </div>
              <button onClick={() => setIsCreateManifestOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <form onSubmit={handleCreateManifest} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Manifest Number *</label>
                <input type="text" value={manifestForm.manifestNumber} onChange={e => setManifestForm(f => ({ ...f, manifestNumber: e.target.value }))} placeholder="e.g. CGM-2026-004" required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Assign to Shipment *</label>
                <select value={manifestForm.shipmentId} onChange={e => setManifestForm(f => ({ ...f, shipmentId: e.target.value }))} required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}>
                  <option value="">Select shipment...</option>
                  {shipments.map(s => <option key={s._id} value={s._id}>{s.shipmentNumber} ({s.origin} → {s.destination})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Description</label>
                <textarea value={manifestForm.description} onChange={e => setManifestForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Scientific Equipment Manifest" rows={2} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsCreateManifestOpen(false)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Create Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Box Modal */}
      {isAddBoxOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '22px' }}>add_box</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Cargo Box</h2>
              </div>
              <button onClick={() => setIsAddBoxOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <form onSubmit={handleAddBox} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Box Code *</label>
                  <input type="text" value={boxForm.boxCode} onChange={e => setBoxForm(f => ({ ...f, boxCode: e.target.value }))} placeholder="e.g. BOX-2026-007" required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Category *</label>
                  <select value={boxForm.category} onChange={e => setBoxForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}>
                    {Object.keys(CATEGORY_COLOR).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Description *</label>
                <input type="text" value={boxForm.description} onChange={e => setBoxForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Seismic monitoring sensors" required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Weight (kg) *</label>
                  <input type="number" min="0.1" step="0.1" value={boxForm.weightKg} onChange={e => setBoxForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="e.g. 25" required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Dimensions</label>
                  <input type="text" value={boxForm.dimensions} onChange={e => setBoxForm(f => ({ ...f, dimensions: e.target.value }))} placeholder="e.g. 60×40×30cm" style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Assign to Shipment</label>
                <select value={boxForm.shipmentId} onChange={e => setBoxForm(f => ({ ...f, shipmentId: e.target.value }))} style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}>
                  <option value="">None (assign later)</option>
                  {shipments.map(s => <option key={s._id} value={s._id}>{s.shipmentNumber}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsAddBoxOpen(false)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_box</span>
                  Add Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Box to Manifest Modal */}
      {isAssignBoxOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#0891b2', fontSize: '22px' }}>link</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Assign Box to Manifest</h2>
              </div>
              <button onClick={() => setIsAssignBoxOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <form onSubmit={handleAssignBox} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Box *</label>
                <select value={assignBoxId} onChange={e => setAssignBoxId(e.target.value)} required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}>
                  <option value="">Choose box...</option>
                  {boxes.map(b => <option key={b._id} value={b._id}>{b.boxCode} — {b.description}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Assign to Manifest *</label>
                <select value={assignManifestId} onChange={e => setAssignManifestId(e.target.value)} required style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}>
                  <option value="">Choose manifest...</option>
                  {manifests.map(m => <option key={m._id} value={m._id}>{m.manifestNumber} — {m.description}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsAssignBoxOpen(false)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#374151', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
                  Assign Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
