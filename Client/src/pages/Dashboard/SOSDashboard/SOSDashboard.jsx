import React, { useState } from 'react';
import { queueEvent } from '@/services/syncServices/queueService';

const DEMO_SOS = [
  {
    _id: 'SOS001', sosNumber: 'SOS-2026-001',
    emergencyType: 'MEDICAL', severity: 'HIGH',
    personnelId: 'P1023', personnelName: 'Dr. Priya Sharma',
    excursionId: 'EX001', excursionNumber: 'EXC-2026-001',
    location: { lat: -70.77, lng: 11.83, description: 'Schirmacher Oasis, 4km from base' },
    description: 'Severe chest pain and difficulty breathing. Possible high-altitude pulmonary edema. Requesting immediate medical evacuation.',
    status: 'OPEN',
    createdAt: '2026-09-25T12:00:00Z',
    timeline: [
      { time: '12:00', type: 'SOS_RECEIVED', description: 'Emergency SOS received via satellite phone.', icon: 'emergency' },
      { time: '12:02', type: 'TEAM_NOTIFIED', description: 'Station Commander and Medical Officer alerted.', icon: 'notifications_active' },
      { time: '12:08', type: 'VEHICLE_DISPATCHED', description: 'Snow Cat and medical team dispatched from Bharati.', icon: 'local_shipping' },
    ],
  },
  {
    _id: 'SOS002', sosNumber: 'SOS-2026-002',
    emergencyType: 'WEATHER', severity: 'MEDIUM',
    personnelId: null, personnelName: 'Team EXC-2026-002',
    excursionId: 'EX002', excursionNumber: 'EXC-2026-002',
    location: { lat: -69.38, lng: 76.37, description: 'Larsemann Hills weather station' },
    description: 'Blizzard conditions deteriorating rapidly. Helicopter extraction requested before visibility drops to zero.',
    status: 'RESPONDING',
    createdAt: '2026-09-24T14:30:00Z',
    timeline: [
      { time: '14:30', type: 'SOS_RECEIVED', description: 'SOS received — blizzard conditions.', icon: 'emergency' },
      { time: '14:35', type: 'TEAM_NOTIFIED', description: 'Helicopter pilot and rescue team alerted.', icon: 'notifications_active' },
      { time: '14:45', type: 'VEHICLE_DISPATCHED', description: 'Helicopter departed from Bharati.', icon: 'flight' },
      { time: '15:20', type: 'ON_SCENE', description: 'Helicopter on scene. Extraction in progress.', icon: 'person_search' },
    ],
  },
  {
    _id: 'SOS003', sosNumber: 'SOS-2026-003',
    emergencyType: 'EQUIPMENT_FAILURE', severity: 'LOW',
    personnelId: 'P1031', personnelName: 'Anish Kumar',
    excursionId: null,
    location: { description: 'Bharati Station, Generator Room' },
    description: 'Primary generator failure. Running on backup. Need engineering support.',
    status: 'RESOLVED',
    createdAt: '2026-09-23T08:00:00Z',
    timeline: [
      { time: '08:00', type: 'SOS_RECEIVED', description: 'Equipment failure SOS.', icon: 'warning' },
      { time: '08:10', type: 'TEAM_NOTIFIED', description: 'Station engineer dispatched.', icon: 'engineering' },
      { time: '09:30', type: 'RESOLVED', description: 'Generator repaired. Systems back online.', icon: 'check_circle' },
    ],
  },
];

const SEVERITY_CONFIG = {
  HIGH:   { bg: '#fef2f2', color: '#B91C1C', border: '#fecaca', label: 'HIGH' },
  MEDIUM: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'MEDIUM' },
  LOW:    { bg: '#fefce8', color: '#854d0e', border: '#fef08a', label: 'LOW' },
};

const STATUS_CONFIG = {
  OPEN:       { bg: '#fef2f2', color: '#B91C1C', label: '🔴 OPEN' },
  RESPONDING: { bg: '#fff7ed', color: '#c2410c', label: '🟠 RESPONDING' },
  RESOLVED:   { bg: '#f0fdf4', color: '#15803D', label: '✅ RESOLVED' },
};

const EMERGENCY_TYPES = ['MEDICAL', 'WEATHER', 'EQUIPMENT_FAILURE', 'PERSONAL_INJURY', 'FIRE', 'OTHER'];

const SOSDashboard = () => {
  const [selectedSOS, setSelectedSOS] = useState(DEMO_SOS[0]);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [sosForm, setSosForm] = useState({ type: 'MEDICAL', severity: 'HIGH', description: '', lat: '', lng: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTriggerSOS = async (e) => {
    e.preventDefault();
    try {
      await queueEvent({
        type: 'SOS_ALERT',
        sosNumber: `SOS-${Date.now()}`,
        emergencyType: sosForm.type,
        severity: sosForm.severity,
        location: { lat: parseFloat(sosForm.lat), lng: parseFloat(sosForm.lng), description: 'Current position' },
        description: sosForm.description,
        personnelId: 'current-user-id',
        expeditionId: 'EXP-46',
        stationId: 'BHARATI',
        offlineCreated: !navigator.onLine,
      });
      showToast('🆘 SOS Alert transmitted! All stations notified.');
      setShowTriggerForm(false);
    } catch (err) {
      showToast('❌ SOS Failed: ' + err.message, 'error');
    }
  };

  const openCount = DEMO_SOS.filter(s => s.status === 'OPEN').length;
  const respondingCount = DEMO_SOS.filter(s => s.status === 'RESPONDING').length;
  const resolvedCount = DEMO_SOS.filter(s => s.status === 'RESOLVED').length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#fef2f2',
          border: '1px solid #fecaca',
          color: '#B91C1C',
          borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 4px 16px rgba(185,28,28,0.2)',
          animation: 'pulse-red 2s infinite',
        }}>{toast.msg}</div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '2px solid #fecaca' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#B91C1C', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>emergency</span>
            SOS & EMERGENCY CENTER
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Active SOS alerts, incident timeline, and rescue coordination
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTriggerForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: '#B91C1C', color: '#fff',
            border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px',
            fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer',
            animation: openCount > 0 ? 'pulse-red-btn 2s infinite' : 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>emergency</span>
          TRIGGER SOS
        </button>
      </div>

      {/* Trigger SOS Modal */}
      {showTriggerForm && (
        <>
          <div onClick={() => setShowTriggerForm(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', borderRadius: '10px', padding: '2rem', width: '500px',
            boxShadow: '0 20px 50px rgba(185,28,28,0.3)',
            border: '2px solid #fecaca', zIndex: 1001,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#B91C1C' }}>emergency</span>
              <h3 style={{ fontWeight: 800, color: '#B91C1C', margin: 0 }}>TRIGGER EMERGENCY SOS</h3>
            </div>
            <div style={{ padding: '0.65rem 1rem', backgroundColor: '#fef2f2', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600, borderLeft: '3px solid #B91C1C' }}>
              ⚠ This will immediately alert all station personnel and initiate emergency protocols.
            </div>
            <form onSubmit={handleTriggerSOS} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Emergency Type *</label>
                  <select value={sosForm.type} onChange={e => setSosForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}>
                    {EMERGENCY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Severity *</label>
                  <select value={sosForm.severity} onChange={e => setSosForm(f => ({ ...f, severity: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}>
                    {['HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Situation Description *</label>
                <textarea value={sosForm.description} onChange={e => setSosForm(f => ({ ...f, description: e.target.value }))} required
                  rows={4} placeholder="Describe the emergency situation in detail..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Latitude</label>
                  <input type="number" step="any" value={sosForm.lat} onChange={e => setSosForm(f => ({ ...f, lat: e.target.value }))} placeholder="-70.77"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Longitude</label>
                  <input type="number" step="any" value={sosForm.lng} onChange={e => setSosForm(f => ({ ...f, lng: e.target.value }))} placeholder="11.83"
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowTriggerForm(false)}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit"
                  style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '6px', backgroundColor: '#B91C1C', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}>
                  🆘 SEND SOS
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Open SOS', value: openCount, color: '#B91C1C', bg: '#fef2f2', border: '#fecaca', icon: 'emergency' },
          { label: 'Responding', value: respondingCount, color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: 'directions_car' },
          { label: 'Resolved', value: resolvedCount, color: '#15803D', bg: '#f0fdf4', border: '#bbf7d0', icon: 'check_circle' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Split view: SOS list + Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* SOS List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>All Incidents</div>
          {DEMO_SOS.map(sos => {
            const sev = SEVERITY_CONFIG[sos.severity];
            const stat = STATUS_CONFIG[sos.status];
            const isSelected = selectedSOS?._id === sos._id;
            return (
              <div
                key={sos._id}
                onClick={() => setSelectedSOS(sos)}
                style={{
                  backgroundColor: isSelected ? '#fef2f2' : '#fff',
                  border: `1px solid ${isSelected ? '#fecaca' : '#E2E8F0'}`,
                  borderLeft: `4px solid ${sos.status === 'RESOLVED' ? '#15803D' : '#B91C1C'}`,
                  borderRadius: '8px', padding: '1rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#B91C1C', fontSize: '0.82rem' }}>{sos.sosNumber}</span>
                  <span style={{ backgroundColor: stat.bg, color: stat.color, padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700 }}>{stat.label}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>
                  {sos.emergencyType.replace('_', ' ')}
                  <span style={{ marginLeft: '0.5rem', backgroundColor: sev.bg, color: sev.color, padding: '0.05rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{sev.label}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                  {sos.personnelName} · {sos.location.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident Timeline */}
        {selectedSOS && (
          <div style={{ backgroundColor: '#fff', border: `2px solid ${selectedSOS.status === 'RESOLVED' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: selectedSOS.status === 'RESOLVED' ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#B91C1C' }}>emergency</span>
                <span style={{ fontWeight: 800, color: '#B91C1C', fontSize: '0.95rem' }}>
                  {selectedSOS.sosNumber} · {selectedSOS.emergencyType.replace('_', ' ')}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{selectedSOS.description}</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748B' }}>
                <span>👤 {selectedSOS.personnelName}</span>
                <span>📍 {selectedSOS.location.description}</span>
                <span>🕐 {new Date(selectedSOS.createdAt).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '1rem' }}>Incident Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {selectedSOS.timeline.map((event, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
                    {/* Timeline connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', flexShrink: 0 }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: idx === selectedSOS.timeline.length - 1 ? '#005B7F' : '#f8fafc',
                        border: `2px solid ${idx === selectedSOS.timeline.length - 1 ? '#005B7F' : '#E2E8F0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: idx === selectedSOS.timeline.length - 1 ? '#fff' : '#64748B' }}>
                          {event.icon}
                        </span>
                      </div>
                      {idx < selectedSOS.timeline.length - 1 && (
                        <div style={{ width: '2px', flex: 1, minHeight: '24px', backgroundColor: '#E2E8F0' }} />
                      )}
                    </div>
                    {/* Event details */}
                    <div style={{ paddingBottom: idx < selectedSOS.timeline.length - 1 ? '1rem' : 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.82rem' }}>{event.time}</span>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{event.type.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSOS.status !== 'RESOLVED' && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '0.75rem' }}>
                  <button type="button"
                    style={{ flex: 1, backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                    Mark Resolved
                  </button>
                  <button type="button"
                    style={{ flex: 1, backgroundColor: '#fff', color: '#B91C1C', border: '1px solid #fecaca', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                    Request MEDEVAC
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSDashboard;
