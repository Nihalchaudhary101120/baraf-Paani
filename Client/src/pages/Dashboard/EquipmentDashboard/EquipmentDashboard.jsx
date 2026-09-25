import React, { useState } from 'react';
import { queueEvent } from '@/services/syncServices/queueService';

const DEMO_EQUIPMENT = [
  { _id: 'EQ001', excursionNumber: 'EXC-2026-001', destination: 'Schirmacher Oasis', itemName: 'GPS Unit', inventoryItemId: 'I007', quantityIssued: 2, quantityReturned: 0, issuedAt: '2026-09-25T05:50:00Z', status: 'ISSUED' },
  { _id: 'EQ002', excursionNumber: 'EXC-2026-001', destination: 'Schirmacher Oasis', itemName: 'VHF Radio', inventoryItemId: 'I008', quantityIssued: 3, quantityReturned: 0, issuedAt: '2026-09-25T05:50:00Z', status: 'ISSUED' },
  { _id: 'EQ003', excursionNumber: 'EXC-2026-001', destination: 'Schirmacher Oasis', itemName: 'Medical Kit', inventoryItemId: 'I010', quantityIssued: 1, quantityReturned: 0, issuedAt: '2026-09-25T05:50:00Z', status: 'ISSUED' },
  { _id: 'EQ004', excursionNumber: 'EXC-2026-002', destination: 'Larsemann Hills', itemName: 'GPS Unit', inventoryItemId: 'I007', quantityIssued: 2, quantityReturned: 2, issuedAt: '2026-09-24T08:50:00Z', returnedAt: '2026-09-24T17:00:00Z', returnCondition: 'GOOD', status: 'RETURNED' },
  { _id: 'EQ005', excursionNumber: 'EXC-2026-002', destination: 'Larsemann Hills', itemName: 'Emergency Flares', inventoryItemId: 'I009', quantityIssued: 4, quantityReturned: 4, issuedAt: '2026-09-24T08:50:00Z', returnedAt: '2026-09-24T17:00:00Z', returnCondition: 'USED', status: 'RETURNED' },
];

const EquipmentDashboard = () => {
  const [activeTab, setActiveTab] = useState('issued');
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ quantity: '', condition: 'GOOD', remarks: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    try {
      await queueEvent({
        type: 'EQUIPMENT_RETURN',
        excursionEquipmentId: returnModal._id,
        quantityReturned: parseInt(returnForm.quantity, 10),
        returnCondition: returnForm.condition,
        returnedAt: new Date().toISOString(),
        performedBy: 'current-user-id',
        stationId: 'BHARATI',
        remarks: returnForm.remarks,
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ ${returnForm.quantity} × ${returnModal.itemName} returned${!navigator.onLine ? ' (offline — will sync)' : ''}!`);
      setReturnModal(null);
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

  const issuedItems = DEMO_EQUIPMENT.filter(e => e.status === 'ISSUED');
  const returnedItems = DEMO_EQUIPMENT.filter(e => e.status === 'RETURNED');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
        }}>{toast.msg}</div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <>
          <div onClick={() => setReturnModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', borderRadius: '10px', padding: '1.75rem', width: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 1001,
          }}>
            <h3 style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>Return Equipment</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {returnModal.itemName} · Issued: <strong>{returnModal.quantityIssued}</strong> · Returned: <strong>{returnModal.quantityReturned}</strong>
            </p>
            <form onSubmit={handleReturn} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Quantity Returning *</label>
                <input type="number" min="1" max={returnModal.quantityIssued - returnModal.quantityReturned}
                  value={returnForm.quantity} onChange={e => setReturnForm(f => ({ ...f, quantity: e.target.value }))} required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Condition</label>
                <select value={returnForm.condition} onChange={e => setReturnForm(f => ({ ...f, condition: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}>
                  {['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Remarks</label>
                <input type="text" value={returnForm.remarks} onChange={e => setReturnForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any observations..."
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setReturnModal(null)}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit"
                  style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '6px', backgroundColor: '#005B7F', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Confirm Return</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>EQUIPMENT TRACKING</h1>
        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>Equipment issued to field teams and inventory CHECKIN on return</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Currently Issued', value: issuedItems.length, icon: 'output', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Returned', value: returnedItems.length, icon: 'input', color: '#15803D', bg: '#f0fdf4' },
          { label: 'Pending Return', value: issuedItems.reduce((a, e) => a + (e.quantityIssued - e.quantityReturned), 0), icon: 'pending', color: '#c2410c', bg: '#fff7ed' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0' }}>
        {[{ id: 'issued', label: 'Currently Issued', icon: 'output' }, { id: 'returned', label: 'Returned', icon: 'input' }].map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', backgroundColor: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #005B7F' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.id ? '#005B7F' : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ISSUED ─────────────────────────────────────────────────── */}
      {activeTab === 'issued' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                {['Excursion', 'Destination', 'Item', 'Issued', 'Returned', 'Pending', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issuedItems.map((item, i) => {
                const pending = item.quantityIssued - item.quantityReturned;
                return (
                  <tr key={item._id} style={{ borderBottom: i < issuedItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.8rem' }}>{item.excursionNumber}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{item.destination}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{item.itemName}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0F172A' }}>{item.quantityIssued}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#15803D', fontWeight: 700 }}>{item.quantityReturned}</td>
                    <td style={{ padding: '0.85rem 1rem', color: pending > 0 ? '#c2410c' : '#15803D', fontWeight: 700 }}>{pending}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {pending > 0 && (
                        <button type="button" onClick={() => { setReturnModal(item); setReturnForm({ quantity: pending.toString(), condition: 'GOOD', remarks: '' }); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>input</span>
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RETURNED ────────────────────────────────────────────────── */}
      {activeTab === 'returned' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                {['Excursion', 'Item', 'Qty', 'Condition', 'Returned At'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returnedItems.map((item, i) => (
                <tr key={item._id} style={{ borderBottom: i < returnedItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.8rem' }}>{item.excursionNumber}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{item.itemName}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0F172A' }}>{item.quantityReturned}/{item.quantityIssued}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      backgroundColor: item.returnCondition === 'GOOD' ? '#f0fdf4' : '#fff7ed',
                      color: item.returnCondition === 'GOOD' ? '#15803D' : '#c2410c',
                      padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                    }}>{item.returnCondition}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{item.returnedAt ? new Date(item.returnedAt).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EquipmentDashboard;
