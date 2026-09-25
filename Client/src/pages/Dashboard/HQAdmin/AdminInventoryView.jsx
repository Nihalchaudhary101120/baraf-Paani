import React, { useState, useEffect } from 'react';
import { useAdminData } from '@/context/AdminContext';

const ITEM_STATUS_CONFIG = {
  AVAILABLE: { color: '#16a34a', bg: '#f0fdf4', label: 'Available' },
  LOW_STOCK: { color: '#d97706', bg: '#fff7ed', label: 'Low Stock' },
  CRITICAL: { color: '#ea580c', bg: '#fff7ed', label: 'Critical' },
  OUT_OF_STOCK: { color: '#dc2626', bg: '#fef2f2', label: 'Out of Stock' },
  EXPIRED: { color: '#7c3aed', bg: '#f5f3ff', label: 'Expired' },
};

const AdminInventoryView = () => {
  const { inventoryData, fetchInventoryData, loading: contextLoading, isInitialized } = useAdminData();
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('items');

  useEffect(() => {
    fetchInventoryData(true);
  }, [fetchInventoryData]);

  const data = inventoryData;
  const loading = !isInitialized && !data && contextLoading.inventory;

  const summary = data?.summary || {};
  const allItems = data?.items || [];
  const transactions = data?.recentTransactions || [];

  const items = allItems.filter(item => {
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchSearch = !search || (item.name || '').toLowerCase().includes(search.toLowerCase()) || (item.category || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#7c3aed' }}>inventory_2</span>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Inventory Consumption & Status</h1>
            <span style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>READ ONLY</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Platform-wide inventory levels and consumption logs. Contact Inventory Manager to make changes.
          </p>
        </div>
        <button onClick={() => fetchInventoryData(false)} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Items', value: summary.total ?? allItems.length, color: '#7c3aed', icon: 'inventory_2' },
          { label: 'Available', value: summary.normal ?? 0, color: '#16a34a', icon: 'check_circle' },
          { label: 'Low Stock', value: summary.lowStock ?? 0, color: '#d97706', icon: 'warning' },
          { label: 'Critical', value: summary.critical ?? 0, color: '#ea580c', icon: 'priority_high' },
          { label: 'Out of Stock', value: summary.outOfStock ?? 0, color: '#dc2626', icon: 'cancel' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `4px solid ${s.color}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginTop: '0.25rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Critical / Low Stock Alert Banner */}
      {(summary.critical > 0 || summary.outOfStock > 0) && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '20px' }}>warning</span>
          <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
            ⚠ Alert: {summary.critical || 0} critical and {summary.outOfStock || 0} out-of-stock items require immediate attention. Contact the Inventory Manager.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #E2E8F0' }}>
        {[['items', 'Inventory Items'], ['transactions', 'Recent Transactions']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '0.5rem 1.25rem', background: 'none', border: 'none',
            borderBottom: tab === key ? '2px solid #7c3aed' : '2px solid transparent',
            marginBottom: '-2px', color: tab === key ? '#7c3aed' : '#64748B',
            fontWeight: tab === key ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {/* Filter Bar (items tab) */}
      {tab === 'items' && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <option value="">All Status</option>
            {Object.entries(ITEM_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748B' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '30px', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ marginLeft: '0.75rem' }}>Loading inventory data...</span>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {tab === 'items' && (
            items.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>inventory_2</span>
                No inventory items found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                    {['Item Name', 'Category', 'Unit', 'Current Qty', 'Min Qty', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const cfg = ITEM_STATUS_CONFIG[item.status] || { color: '#64748b', bg: '#f8fafc', label: item.status };
                    return (
                      <tr key={item._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0F172A' }}>{item.name || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{item.category || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{item.unit || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontWeight: 700, color: cfg.color, fontFamily: 'monospace' }}>
                            {item.currentQuantity ?? item.quantity ?? 0}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569', fontFamily: 'monospace' }}>{item.minimumQuantity ?? item.reorderLevel ?? '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
          {tab === 'transactions' && (
            transactions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>receipt_long</span>
                No recent transactions found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                    {['Item', 'Transaction Type', 'Quantity', 'Performed By', 'Date', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0F172A' }}>{t.itemId?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
                          backgroundColor: t.transactionType === 'CONSUMPTION' ? '#fff7ed' : t.transactionType === 'RESUPPLY' ? '#f0fdf4' : '#f8fafc',
                          color: t.transactionType === 'CONSUMPTION' ? '#d97706' : t.transactionType === 'RESUPPLY' ? '#16a34a' : '#64748b'
                        }}>{t.transactionType || '—'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{t.quantity ?? 0} {t.itemId?.unit || ''}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{t.performedBy?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.notes || '—'}</td>
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

export default AdminInventoryView;
