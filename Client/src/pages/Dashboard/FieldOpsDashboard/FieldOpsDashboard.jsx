import React, { useState } from 'react';
import { queueEvent } from '@/services/syncServices/queueService';

// ── Demo data ───────────────────────────────────────────────────────
const DEMO_EXCURSIONS = [
  {
    _id: 'EX001', excursionNumber: 'EXC-2026-001',
    leader: 'Dr. Rajan Mehta', members: ['Dr. Priya S', 'Anish K', 'Rahul V'],
    destination: 'Schirmacher Oasis', purpose: 'Geological survey',
    transportMode: 'Snow Cat',
    departureTime: '2026-09-25T06:00:00Z',
    expectedReturnTime: '2026-09-25T18:00:00Z',
    checkInIntervalMinutes: 120,
    weatherRisk: 'MEDIUM',
    status: 'ACTIVE',
    checkIns: [
      { time: '08:00', battery: 85, temp: -18, notes: 'All good', lat: -70.77, lng: 11.83 },
      { time: '10:00', battery: 71, temp: -22, notes: 'Wind picking up', lat: -70.79, lng: 11.91 },
    ],
  },
  {
    _id: 'EX002', excursionNumber: 'EXC-2026-002',
    leader: 'Capt. Shinde', members: ['Dr. Kavya', 'Mohan G'],
    destination: 'Larsemann Hills', purpose: 'Weather sensor maintenance',
    transportMode: 'Helicopter',
    departureTime: '2026-09-24T09:00:00Z',
    expectedReturnTime: '2026-09-24T16:00:00Z',
    checkInIntervalMinutes: 60,
    weatherRisk: 'HIGH',
    status: 'OVERDUE',
    checkIns: [
      { time: '10:00', battery: 90, temp: -15, notes: 'Weather sensors located', lat: -69.38, lng: 76.37 },
    ],
  },
  {
    _id: 'EX003', excursionNumber: 'EXC-2026-003',
    leader: 'Dr. Ananya', members: ['Vikram P'],
    destination: 'Ice Core Site-7', purpose: 'Ice core sample collection',
    transportMode: 'Snowmobile',
    departureTime: '2026-09-27T07:00:00Z',
    expectedReturnTime: '2026-09-27T17:00:00Z',
    checkInIntervalMinutes: 90,
    weatherRisk: 'LOW',
    status: 'PLANNED',
    checkIns: [],
  },
];

const STATUS_STYLE = {
  ACTIVE:    { bg: '#ecfdf5', color: '#15803D', border: '#a7f3d0', label: 'ACTIVE', pulse: false },
  OVERDUE:   { bg: '#fef2f2', color: '#B91C1C', border: '#fecaca', label: '⚠ OVERDUE', pulse: true },
  PLANNED:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'PLANNED', pulse: false },
  COMPLETED: { bg: '#f8fafc', color: '#64748B', border: '#e2e8f0', label: 'COMPLETED', pulse: false },
  CANCELLED: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'CANCELLED', pulse: false },
};

const RISK_STYLE = {
  LOW:    { color: '#15803D', bg: '#f0fdf4' },
  MEDIUM: { color: '#854d0e', bg: '#fefce8' },
  HIGH:   { color: '#B91C1C', bg: '#fef2f2' },
};

const FieldOpsDashboard = () => {
  const [activeTab, setActiveTab] = useState('excursions');
  const [selectedExcursion, setSelectedExcursion] = useState(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ excursionId: '', notes: '', temp: '', battery: '', lat: '', lng: '' });
  const [startForm, setStartForm] = useState({ leader: '', destination: '', purpose: '', transportMode: 'Snow Cat', departureTime: '', expectedReturn: '', members: '', interval: 60, risk: 'LOW' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStartExcursion = async (e) => {
    e.preventDefault();
    try {
      await queueEvent({
        type: 'EXCURSION_START',
        excursionNumber: `EXC-${Date.now()}`,
        expeditionId: 'EXP-46',
        stationId: 'BHARATI',
        leaderId: startForm.leader,
        members: startForm.members.split(',').map(m => m.trim()),
        purpose: startForm.purpose,
        destination: startForm.destination,
        transportMode: startForm.transportMode,
        departureTime: startForm.departureTime,
        expectedReturnTime: startForm.expectedReturn,
        checkInIntervalMinutes: parseInt(startForm.interval, 10),
        weatherRisk: startForm.risk,
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ Excursion to ${startForm.destination} registered${!navigator.onLine ? ' (offline)' : ''}!`);
      setShowStartForm(false);
      setStartForm({ leader: '', destination: '', purpose: '', transportMode: 'Snow Cat', departureTime: '', expectedReturn: '', members: '', interval: 60, risk: 'LOW' });
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      await queueEvent({
        type: 'FIELD_CHECKIN',
        excursionId: checkInForm.excursionId,
        personnelId: 'current-user-id',
        location: { lat: parseFloat(checkInForm.lat), lng: parseFloat(checkInForm.lng) },
        temperature: parseFloat(checkInForm.temp),
        batteryLevel: parseInt(checkInForm.battery, 10),
        networkAvailable: navigator.onLine,
        notes: checkInForm.notes,
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ Check-in submitted${!navigator.onLine ? ' (offline — will sync)' : ''}!`);
      setCheckInForm({ excursionId: '', notes: '', temp: '', battery: '', lat: '', lng: '' });
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

  const handleEndExcursion = async (excursion) => {
    try {
      await queueEvent({
        type: 'EXCURSION_END',
        excursionId: excursion._id,
        returnTime: new Date().toISOString(),
        performedBy: 'current-user-id',
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ Excursion ${excursion.excursionNumber} marked as returned!`);
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

  const tabs = [
    { id: 'excursions', label: 'Active Excursions', icon: 'explore' },
    { id: 'checkin', label: 'Submit Check-in', icon: 'pin_drop' },
    { id: 'start', label: 'Start Excursion', icon: 'add_location_alt' },
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
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>FIELD OPERATIONS</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Excursion lifecycle, field check-ins, and overdue monitoring
          </p>
        </div>
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { label: 'Active', count: DEMO_EXCURSIONS.filter(e => e.status === 'ACTIVE').length, color: '#15803D' },
            { label: 'Overdue', count: DEMO_EXCURSIONS.filter(e => e.status === 'OVERDUE').length, color: '#B91C1C' },
            { label: 'Planned', count: DEMO_EXCURSIONS.filter(e => e.status === 'PLANNED').length, color: '#1d4ed8' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0' }}>
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              backgroundColor: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #005B7F' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.id ? '#005B7F' : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: EXCURSIONS LIST ───────────────────────────────────── */}
      {activeTab === 'excursions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {DEMO_EXCURSIONS.map(exc => {
            const ss = STATUS_STYLE[exc.status];
            const risk = RISK_STYLE[exc.weatherRisk];
            const isExpanded = selectedExcursion?._id === exc._id;

            return (
              <div key={exc._id} style={{
                backgroundColor: '#fff',
                border: `1px solid ${exc.status === 'OVERDUE' ? '#fecaca' : '#E2E8F0'}`,
                borderLeft: `4px solid ${ss.color}`,
                borderRadius: '8px', overflow: 'hidden',
              }}>
                <div
                  onClick={() => setSelectedExcursion(isExpanded ? null : exc)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 1.25rem', cursor: 'pointer',
                    backgroundColor: exc.status === 'OVERDUE' ? '#fff5f5' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.9rem' }}>{exc.excursionNumber}</span>
                        <span style={{
                          backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                          padding: '0.1rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700,
                          animation: ss.pulse ? 'pulse-red 1.5s infinite' : 'none',
                        }}>{ss.label}</span>
                        <span style={{ backgroundColor: risk.bg, color: risk.color, padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
                          {exc.weatherRisk} RISK
                        </span>
                      </div>
                      <div style={{ marginTop: '0.2rem', fontSize: '0.82rem', color: '#374151' }}>
                        <strong>{exc.leader}</strong> → <strong>{exc.destination}</strong> · {exc.members.length + 1} personnel · {exc.transportMode}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {exc.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleEndExcursion(exc); }}
                        style={{
                          backgroundColor: '#15803D', color: '#fff', border: 'none',
                          padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                        Mark Returned
                      </button>
                    )}
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #E2E8F0', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      {/* Details */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Excursion Details</div>
                        {[
                          ['Purpose', exc.purpose],
                          ['Departure', new Date(exc.departureTime).toLocaleString('en-IN')],
                          ['Expected Return', new Date(exc.expectedReturnTime).toLocaleString('en-IN')],
                          ['Check-in Interval', `Every ${exc.checkInIntervalMinutes} min`],
                          ['Team', [exc.leader, ...exc.members].join(', ')],
                        ].map(([label, val]) => (
                          <div key={label} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: '#64748B', minWidth: '140px' }}>{label}:</span>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      {/* Check-in Timeline */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Check-in History</div>
                        {exc.checkIns.length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No check-ins yet.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {exc.checkIns.map((ci, idx) => (
                              <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#fff', borderRadius: '6px',
                                border: '1px solid #E2E8F0', fontSize: '0.8rem',
                              }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', fontWeight: 700 }}>{ci.time}</span>
                                <span>🌡 {ci.temp}°C</span>
                                <span>🔋 {ci.battery}%</span>
                                <span style={{ color: '#64748B' }}>{ci.notes}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: CHECK-IN FORM ─────────────────────────────────────── */}
      {activeTab === 'checkin' && (
        <div style={{ maxWidth: '560px' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#005B7F', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pin_drop</span>
              Submit Field Check-In
            </h2>
            <div style={{ padding: '0.65rem 1rem', backgroundColor: !navigator.onLine ? '#fff7ed' : '#f0fdf4', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 600, color: !navigator.onLine ? '#c2410c' : '#15803D' }}>
              {!navigator.onLine ? '⚠ OFFLINE — Check-in will be queued and synced when internet returns' : '✅ Online — Check-in will sync immediately'}
            </div>

            <form onSubmit={handleCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Excursion *</label>
                <select
                  value={checkInForm.excursionId}
                  onChange={e => setCheckInForm(f => ({ ...f, excursionId: e.target.value }))}
                  required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">Select active excursion...</option>
                  {DEMO_EXCURSIONS.filter(e => e.status === 'ACTIVE' || e.status === 'OVERDUE').map(e => (
                    <option key={e._id} value={e._id}>{e.excursionNumber} — {e.destination}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Temperature (°C)</label>
                  <input type="number" value={checkInForm.temp}
                    onChange={e => setCheckInForm(f => ({ ...f, temp: e.target.value }))}
                    placeholder="-18"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Battery Level (%)</label>
                  <input type="number" min="0" max="100" value={checkInForm.battery}
                    onChange={e => setCheckInForm(f => ({ ...f, battery: e.target.value }))}
                    placeholder="75"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Latitude</label>
                  <input type="number" step="any" value={checkInForm.lat}
                    onChange={e => setCheckInForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="-70.77"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Longitude</label>
                  <input type="number" step="any" value={checkInForm.lng}
                    onChange={e => setCheckInForm(f => ({ ...f, lng: e.target.value }))}
                    placeholder="11.83"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Notes / Weather Observed</label>
                <textarea
                  value={checkInForm.notes}
                  onChange={e => setCheckInForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="All fine, mild wind..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit"
                style={{
                  backgroundColor: '#005B7F', color: '#fff', border: 'none',
                  padding: '0.7rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pin_drop</span>
                Submit Check-In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB: START EXCURSION FORM ─────────────────────────────── */}
      {activeTab === 'start' && (
        <div style={{ maxWidth: '700px' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#005B7F', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_location_alt</span>
              Register New Field Excursion
            </h2>
            <form onSubmit={handleStartExcursion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Team Leader *</label>
                  <input type="text" value={startForm.leader} onChange={e => setStartForm(f => ({ ...f, leader: e.target.value }))} required placeholder="Dr. Rajan Mehta"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Destination *</label>
                  <input type="text" value={startForm.destination} onChange={e => setStartForm(f => ({ ...f, destination: e.target.value }))} required placeholder="Schirmacher Oasis"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Team Members (comma separated)</label>
                <input type="text" value={startForm.members} onChange={e => setStartForm(f => ({ ...f, members: e.target.value }))} placeholder="Dr. Priya, Anish K, Rahul V"
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Purpose *</label>
                <input type="text" value={startForm.purpose} onChange={e => setStartForm(f => ({ ...f, purpose: e.target.value }))} required placeholder="Geological survey, ice sampling..."
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Transport Mode</label>
                  <select value={startForm.transportMode} onChange={e => setStartForm(f => ({ ...f, transportMode: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}>
                    {['Snow Cat', 'Snowmobile', 'Helicopter', 'On Foot'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Check-in (mins)</label>
                  <input type="number" min="30" value={startForm.interval} onChange={e => setStartForm(f => ({ ...f, interval: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Weather Risk</label>
                  <select value={startForm.risk} onChange={e => setStartForm(f => ({ ...f, risk: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}>
                    {['LOW', 'MEDIUM', 'HIGH'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Departure Time *</label>
                  <input type="datetime-local" value={startForm.departureTime} onChange={e => setStartForm(f => ({ ...f, departureTime: e.target.value }))} required
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Expected Return *</label>
                  <input type="datetime-local" value={startForm.expectedReturn} onChange={e => setStartForm(f => ({ ...f, expectedReturn: e.target.value }))} required
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button type="submit"
                style={{
                  backgroundColor: '#005B7F', color: '#fff', border: 'none',
                  padding: '0.7rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginTop: '0.5rem',
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location_alt</span>
                Register Excursion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldOpsDashboard;
