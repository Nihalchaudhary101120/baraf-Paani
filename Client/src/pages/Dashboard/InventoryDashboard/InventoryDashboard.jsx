import React, { useState } from 'react';
import { queueEvent } from '@/services/syncServices/queueService';

// ── Demo data ───────────────────────────────────────────────────────
const DEMO_ITEMS = [
  { _id: 'I001', itemCode: 'MED-001', name: 'Paracetamol 500mg', category: 'Medical', currentStock: 850, minimumStock: 200, criticalStock: 50, unit: 'tablets', status: 'AVAILABLE' },
  { _id: 'I002', itemCode: 'MED-002', name: 'IV Saline 500ml', category: 'Medical', currentStock: 45, minimumStock: 100, criticalStock: 20, unit: 'bags', status: 'LOW_STOCK' },
  { _id: 'I003', itemCode: 'MED-003', name: 'Oxygen Cylinder', category: 'Medical', currentStock: 12, minimumStock: 30, criticalStock: 10, unit: 'cylinders', status: 'CRITICAL' },
  { _id: 'I004', itemCode: 'FOOD-001', name: 'Apple', category: 'Provisions', currentStock: 100, minimumStock: 50, criticalStock: 20, unit: 'kg', status: 'AVAILABLE' },
  { _id: 'I005', itemCode: 'FOOD-002', name: 'Banana', category: 'Provisions', currentStock: 80, minimumStock: 50, criticalStock: 20, unit: 'kg', status: 'AVAILABLE' },
  { _id: 'I006', itemCode: 'FUEL-001', name: 'Diesel', category: 'Fuel', currentStock: 0, minimumStock: 500, criticalStock: 200, unit: 'liters', status: 'OUT_OF_STOCK' },
  { _id: 'I007', itemCode: 'EQ-001', name: 'GPS Unit', category: 'Equipment', currentStock: 7, minimumStock: 5, criticalStock: 2, unit: 'units', status: 'AVAILABLE' },
  { _id: 'I008', itemCode: 'EQ-002', name: 'VHF Radio', category: 'Equipment', currentStock: 9, minimumStock: 5, criticalStock: 2, unit: 'units', status: 'AVAILABLE' },
  { _id: 'I009', itemCode: 'EQ-003', name: 'Emergency Flares', category: 'Safety', currentStock: 18, minimumStock: 20, criticalStock: 10, unit: 'units', status: 'LOW_STOCK' },
];

const DEMO_TRANSACTIONS = [
  { _id: 'T001', transactionNumber: 'INV-1727000001', itemCode: 'MED-001', transactionType: 'RECEIPT', quantity: 1000, balanceAfterTransaction: 850, createdAt: '2026-09-20T10:00:00Z', performedBy: 'Dr. Vasu' },
  { _id: 'T002', transactionNumber: 'INV-1727000002', itemCode: 'MED-001', transactionType: 'CONSUMPTION', quantity: 150, balanceAfterTransaction: 700, createdAt: '2026-09-22T14:30:00Z', performedBy: 'Dr. Priya' },
  { _id: 'T003', transactionNumber: 'INV-1727000003', itemCode: 'MED-002', transactionType: 'RECEIPT', quantity: 200, balanceAfterTransaction: 245, createdAt: '2026-09-18T09:00:00Z', performedBy: 'Suresh' },
  { _id: 'T004', transactionNumber: 'CHK-1727000004', itemCode: 'EQ-001', transactionType: 'CHECKOUT', quantity: 3, balanceAfterTransaction: 7, createdAt: '2026-09-24T07:00:00Z', performedBy: 'Rajan' },
  { _id: 'T005', transactionNumber: 'RET-1727000005', itemCode: 'EQ-001', transactionType: 'CHECKIN', quantity: 3, balanceAfterTransaction: 10, createdAt: '2026-09-24T18:00:00Z', performedBy: 'Rajan' },
];

const STATUS_CONFIG = {
  AVAILABLE:    { bg: '#f0fdf4', color: '#15803D', border: '#bbf7d0', label: 'Available' },
  LOW_STOCK:    { bg: '#fefce8', color: '#854d0e', border: '#fef08a', label: 'Low Stock' },
  CRITICAL:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Critical' },
  OUT_OF_STOCK: { bg: '#fef2f2', color: '#B91C1C', border: '#fecaca', label: 'Out of Stock' },
};

const TX_TYPE_CONFIG = {
  RECEIPT:     { color: '#15803D', icon: 'add_circle', label: 'Receipt' },
  CONSUMPTION: { color: '#c2410c', icon: 'remove_circle', label: 'Consumption' },
  CHECKOUT:    { color: '#7c3aed', icon: 'output', label: 'Checkout' },
  CHECKIN:     { color: '#0369a1', icon: 'input', label: 'Check-in' },
  TRANSFER:    { color: '#64748B', icon: 'swap_horiz', label: 'Transfer' },
};

const InventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [consumeModal, setConsumeModal] = useState(null);
  const [consumeForm, setConsumeForm] = useState({ quantity: '', reason: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = DEMO_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
    acc[status] = DEMO_ITEMS.filter(i => i.status === status).length;
    return acc;
  }, {});

  const handleConsume = async (e) => {
    e.preventDefault();
    try {
      await queueEvent({
        type: 'INVENTORY_CONSUMPTION',
        inventoryItemId: consumeModal._id,
        quantity: parseInt(consumeForm.quantity, 10),
        stationId: 'BHARATI',
        performedBy: 'current-user-id',
        remarks: consumeForm.reason,
        offlineCreated: !navigator.onLine,
      });
      showToast(`✅ Consumed ${consumeForm.quantity} × ${consumeModal.name}${!navigator.onLine ? ' (offline — will sync)' : ''}`);
      setConsumeModal(null);
      setConsumeForm({ quantity: '', reason: '' });
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

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

      {/* Consume Modal */}
      {consumeModal && (
        <>
          <div
            onClick={() => setConsumeModal(null)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', borderRadius: '10px',
            padding: '1.75rem', width: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            zIndex: 1001,
          }}>
            <h3 style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>Record Consumption</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {consumeModal.itemCode} · {consumeModal.name} · Stock: <strong>{consumeModal.currentStock} {consumeModal.unit}</strong>
            </p>
            <form onSubmit={handleConsume} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Quantity *</label>
                <input
                  type="number" min="1" max={consumeModal.currentStock}
                  value={consumeForm.quantity}
                  onChange={e => setConsumeForm(f => ({ ...f, quantity: e.target.value }))}
                  required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Reason / Purpose</label>
                <input
                  type="text"
                  value={consumeForm.reason}
                  onChange={e => setConsumeForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Lab experiment, Daily meal..."
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setConsumeModal(null)}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '6px', backgroundColor: '#E65A28', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                  Record Consumption
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>INVENTORY MANAGEMENT</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Bharati Station stock levels, consumption tracking, and equipment checkout
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {Object.entries(STATUS_CONFIG).map(([status, conf]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
            style={{
              backgroundColor: filterStatus === status ? conf.bg : '#fff',
              border: `1px solid ${filterStatus === status ? conf.border : '#E2E8F0'}`,
              borderRadius: '8px', padding: '1rem 1.25rem',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
              outline: filterStatus === status ? `2px solid ${conf.color}40` : 'none',
            }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: conf.color }}>{statusCounts[status] || 0}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: conf.color, textTransform: 'uppercase', marginTop: '2px' }}>{conf.label}</div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0' }}>
        {[{ id: 'stock', label: 'Stock Levels', icon: 'category' }, { id: 'transactions', label: 'Transaction History', icon: 'receipt_long' }].map(tab => (
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

      {/* ── TAB: STOCK ────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <>
          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '18px', color: '#94a3b8',
              }}>search</span>
              <input
                type="text"
                placeholder="Search items by name, code, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '40px', paddingLeft: '2.5rem', paddingRight: '0.75rem',
                  border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.875rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ height: '40px', padding: '0 0.75rem', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                <option key={s} value={s}>{c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                  {['Code', 'Item Name', 'Category', 'Current Stock', 'Min. Stock', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, i) => {
                  const sc = STATUS_CONFIG[item.status];
                  return (
                    <tr key={item._id}
                      style={{ borderBottom: i < filteredItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.8rem' }}>{item.itemCode}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{item.name}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{item.category}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: sc.color, fontSize: '1rem' }}>{item.currentStock}</span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.unit}</span>
                        </div>
                        {/* Mini progress bar */}
                        <div style={{ marginTop: '4px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', width: '80px' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            backgroundColor: sc.color,
                            width: `${Math.min(100, (item.currentStock / (item.minimumStock * 2)) * 100)}%`,
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{item.minimumStock} {item.unit}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
                        }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => { setConsumeModal(item); setConsumeForm({ quantity: '', reason: '' }); }}
                          disabled={item.currentStock === 0}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            backgroundColor: item.currentStock === 0 ? '#f1f5f9' : '#E65A28',
                            color: item.currentStock === 0 ? '#94a3b8' : '#fff',
                            border: 'none', borderRadius: '4px',
                            padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
                            cursor: item.currentStock === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>remove_circle</span>
                          Consume
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: TRANSACTIONS ─────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                {['Txn Number', 'Item', 'Type', 'Qty', 'Balance After', 'By', 'Date'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_TRANSACTIONS.map((tx, i) => {
                const tc = TX_TYPE_CONFIG[tx.transactionType] || {};
                return (
                  <tr key={tx._id} style={{ borderBottom: i < DEMO_TRANSACTIONS.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: '#64748B' }}>{tx.transactionNumber}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{tx.itemCode}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: tc.color, fontWeight: 700, fontSize: '0.8rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tc.icon}</span>
                        {tc.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: tx.transactionType === 'CONSUMPTION' || tx.transactionType === 'CHECKOUT' ? '#c2410c' : '#15803D' }}>
                      {tx.transactionType === 'CONSUMPTION' || tx.transactionType === 'CHECKOUT' ? '-' : '+'}{tx.quantity}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{tx.balanceAfterTransaction}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{tx.performedBy}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
