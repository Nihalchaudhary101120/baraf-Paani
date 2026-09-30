import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getSKUInventorySummary } from '@/api/cargo.api';
import { queueEvent } from '@/services/syncServices/queueService';
import { useToast } from '@/context/ToastContext';

const STATUS_CONFIG = {
  IN_STOCK:     { bg: '#f0fdf4', color: '#15803D', border: '#bbf7d0', label: 'In Stock' },
  REORDER_SOON: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Reorder Soon' },
  LOW_STOCK:    { bg: '#fefce8', color: '#854d0e', border: '#fef08a', label: 'Low Stock' },
  CRITICAL:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Critical' },
  OUT_OF_STOCK: { bg: '#fef2f2', color: '#B91C1C', border: '#fecaca', label: 'Out of Stock' },
};

const CATEGORY_COLORS = {
  SCIENTIFIC: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  ELECTRONICS: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  MEDICAL: { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  FUEL: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  FOOD: { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  SPARES: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  EQUIPMENT: { bg: '#EFF6FF', color: '#0369A1', border: '#BAE6FD' },
  SAFETY: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  PERSONAL: { bg: '#FDF4FF', color: '#7E22CE', border: '#F0ABFC' },
  GENERAL: { bg: '#F8FAFC', color: '#475569', border: '#CBD5E1' }
};

const DEMO_TRANSACTIONS = [
  { _id: 'T001', transactionNumber: 'INV-1727000001', itemCode: 'SCI-SEIS-001', transactionType: 'RECEIPT', quantity: 10, balanceAfterTransaction: 15, createdAt: '2026-09-20T10:00:00Z', performedBy: 'Cargo Officer / Station Lead' },
  { _id: 'T002', transactionNumber: 'INV-1727000002', itemCode: 'MED-KIT-001', transactionType: 'CONSUMPTION', quantity: 2, balanceAfterTransaction: 4, createdAt: '2026-09-22T14:30:00Z', performedBy: 'Dr. Vasu (Medical)' },
  { _id: 'T003', transactionNumber: 'INV-1727000003', itemCode: 'FUEL-JET-001', transactionType: 'RECEIPT', quantity: 30, balanceAfterTransaction: 50, createdAt: '2026-09-18T09:00:00Z', performedBy: 'Suresh (Logistics)' },
  { _id: 'T004', transactionNumber: 'CHK-1727000004', itemCode: 'ELEC-GPS-002', transactionType: 'CHECKOUT', quantity: 3, balanceAfterTransaction: 8, createdAt: '2026-09-24T07:00:00Z', performedBy: 'Field Lead Rajan' },
];

export default function InventoryDashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [onlyInTransit, setOnlyInTransit] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live SKU Inventory state
  const [summaryData, setSummaryData] = useState({
    totalSKUs: 0,
    totalInventoryUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inTransitUnits: 0,
    pendingReceiptsCount: 0
  });
  const [categoryStats, setCategoryStats] = useState({});
  const [inventoryTable, setInventoryTable] = useState([]);

  // Consume modal
  const [consumeModal, setConsumeModal] = useState(null);
  const [consumeForm, setConsumeForm] = useState({ quantity: '', reason: '' });

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSKUInventorySummary();
      if (res?.data?.success || res?.success) {
        setSummaryData(res.data?.summary || res.summary || {});
        setCategoryStats(res.data?.categoryStats || res.categoryStats || {});
        setInventoryTable(res.data?.inventoryTable || res.inventoryTable || []);
      }
    } catch (err) {
      console.error('Failed to load SKU inventory:', err);
      showToast('Failed to load live SKU inventory summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Filtered inventory rows
  const filteredRows = useMemo(() => {
    return inventoryTable.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.skuCode || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.manufacturer || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q);

      const matchCategory = filterCategory === 'ALL' || (item.category || '').toUpperCase() === filterCategory.toUpperCase();
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchInTransit = !onlyInTransit || (item.inTransit > 0);

      return matchSearch && matchCategory && matchStatus && matchInTransit;
    });
  }, [inventoryTable, searchQuery, filterCategory, filterStatus, onlyInTransit]);

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
      showToast(`✅ Consumed ${consumeForm.quantity} × ${consumeModal.itemName || consumeModal.skuCode}`, 'success');
      setConsumeModal(null);
      setConsumeForm({ quantity: '', reason: '' });
      fetchInventory();
    } catch (err) {
      showToast('❌ Failed: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '26px' }}>
              warehouse
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '0.01em' }}>
              Station Inventory & SKU Stock Management
            </h1>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#005B7F',
                border: '1px solid #BFDBFE',
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              PS 26062 NCPOR
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.2rem 0 0' }}>
            Real-time SKU stock levels, in-transit cargo quantities, reorder points, and station consumption.
          </p>
        </div>

        <button
          onClick={fetchInventory}
          style={{
            backgroundColor: '#005B7F',
            color: '#FFFFFF',
            border: 'none',
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 10px rgba(0, 91, 127, 0.2)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Refresh Live Stock
        </button>
      </div>

      {/* 6 Summary Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'TOTAL SKUs', value: summaryData.totalSKUs, color: '#005B7F', icon: 'grid_view', bg: '#EFF6FF' },
          { label: 'TOTAL INVENTORY UNITS', value: summaryData.totalInventoryUnits, color: '#15803D', icon: 'inventory_2', bg: '#F0FDF4' },
          { label: 'LOW STOCK', value: summaryData.lowStockCount, color: '#D97706', icon: 'warning', bg: '#FEFCE8' },
          { label: 'OUT OF STOCK', value: summaryData.outOfStockCount, color: '#DC2626', icon: 'cancel', bg: '#FEF2F2' },
          { label: 'IN TRANSIT', value: summaryData.inTransitUnits, color: '#0284C7', icon: 'directions_boat', bg: '#F0F9FF' },
          { label: 'PENDING RECEIPTS', value: summaryData.pendingReceiptsCount, color: '#7E22CE', icon: 'move_to_inbox', bg: '#FAF5FF' },
        ].map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${card.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: card.color, marginTop: '0.2rem' }}>
                {card.value}
              </div>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: card.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: card.color, fontSize: '20px' }}>
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Category-Wise Inventory Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>category</span>
          Category-Wise Aggregated Stock Breakdown (Available + In Transit)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
          {['SCIENTIFIC', 'MEDICAL', 'ELECTRONICS', 'FOOD', 'SPARES', 'FUEL', 'SAFETY', 'EQUIPMENT', 'GENERAL'].map(cat => {
            const count = categoryStats[cat] || 0;
            const cColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GENERAL;
            return (
              <div
                key={cat}
                style={{
                  backgroundColor: cColor.bg,
                  border: `1px solid ${cColor.border}`,
                  borderRadius: '6px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.15rem'
                }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: cColor.color, textTransform: 'uppercase' }}>
                  {cat}
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                  {count.toLocaleString('en-IN')} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>units</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #CBD5E1', paddingBottom: '0.25rem' }}>
        {[
          { key: 'stock', label: 'SKU Inventory Stock', icon: 'inventory_2' },
          { key: 'transactions', label: 'Transaction History', icon: 'receipt_long' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1.15rem', borderRadius: '6px', border: 'none',
              backgroundColor: activeTab === tab.key ? '#005B7F' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#475569',
              fontWeight: activeTab === tab.key ? 800 : 600,
              fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SKU Inventory Table */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            {/* Search */}
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '18px' }}>
                search
              </span>
              <input
                type="text"
                placeholder="Filter by SKU Code, Item Name, Category, or Make..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: '36px', paddingLeft: '34px', paddingRight: '10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Category */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">All Categories</option>
              {['SCIENTIFIC', 'MEDICAL', 'ELECTRONICS', 'FOOD', 'SPARES', 'FUEL', 'SAFETY', 'EQUIPMENT', 'GENERAL'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="REORDER_SOON">Reorder Soon</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            {/* In-Transit Toggle */}
            <button
              type="button"
              onClick={() => setOnlyInTransit(prev => !prev)}
              style={{
                height: '36px',
                padding: '0 0.85rem',
                backgroundColor: onlyInTransit ? '#EFF6FF' : '#FFFFFF',
                border: onlyInTransit ? '1px solid #005B7F' : '1px solid #CBD5E1',
                color: onlyInTransit ? '#005B7F' : '#64748B',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {onlyInTransit ? 'check_box' : 'check_box_outline_blank'}
              </span>
              In-Transit Only
            </button>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>SKU Code</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Item Name</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Available</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>In Transit</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Reserved</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Reorder Level</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '24px' }}>sync</span>
                        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>Aggregating SKU Master Inventory...</div>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                        No inventory records match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const sConf = STATUS_CONFIG[row.status] || STATUS_CONFIG.IN_STOCK;
                      const cColor = CATEGORY_COLORS[row.category] || CATEGORY_COLORS.GENERAL;
                      return (
                        <tr key={row._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#005B7F', fontFamily: 'monospace' }}>
                            {row.skuCode}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{row.itemName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>{row.manufacturer || 'Standard'} {row.model ? `(${row.model})` : ''}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                backgroundColor: cColor.bg,
                                color: cColor.color,
                                border: `1px solid ${cColor.border}`,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}
                            >
                              {row.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 900, color: row.available > 0 ? '#15803D' : '#DC2626' }}>
                              {row.available}
                            </span> <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>{row.unit}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {row.inTransit > 0 ? (
                              <span style={{ backgroundColor: '#EFF6FF', color: '#0284C7', border: '1px solid #BFDBFE', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                                🚚 {row.inTransit} {row.unit}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontWeight: 600 }}>
                            {row.reserved || 0}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                            {row.reorderLevel || 10}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                backgroundColor: sConf.bg,
                                color: sConf.color,
                                border: `1px solid ${sConf.border}`,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}
                            >
                              {sConf.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setConsumeModal(row);
                                setConsumeForm({ quantity: '1', reason: '' });
                              }}
                              style={{
                                backgroundColor: '#005B7F',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Record Usage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Transactions History */}
      {activeTab === 'transactions' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
            Station Inventory Receipts & Issues Ledger
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Tx Number</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>SKU Code</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Quantity</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Balance After</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Performed By</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRANSACTIONS.map(tx => (
                <tr key={tx._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#005B7F' }}>{tx.transactionNumber}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{tx.itemCode}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: tx.transactionType === 'RECEIPT' ? '#F0FDF4' : '#FFF7ED', color: tx.transactionType === 'RECEIPT' ? '#15803D' : '#C2410C', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {tx.transactionType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#0F172A' }}>{tx.quantity}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#15803D' }}>{tx.balanceAfterTransaction}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{tx.performedBy}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Usage Modal */}
      {consumeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontWeight: 800, color: '#0F172A', fontSize: '1.05rem' }}>Record Station Consumption</h3>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 1rem' }}>
              SKU: <strong>{consumeModal.skuCode}</strong> · {consumeModal.itemName}
            </p>
            <form onSubmit={handleConsume} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>Quantity to Issue *</label>
                <input
                  type="number"
                  min="1"
                  max={consumeModal.available || 100}
                  value={consumeForm.quantity}
                  onChange={e => setConsumeForm(f => ({ ...f, quantity: e.target.value }))}
                  required
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>Operational Purpose</label>
                <input
                  type="text"
                  value={consumeForm.reason}
                  onChange={e => setConsumeForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Seismic station maintenance, Polar medical use..."
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setConsumeModal(null)} style={{ flex: 1, padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1.5, padding: '0.65rem', border: 'none', borderRadius: '6px', backgroundColor: '#005B7F', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Confirm Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
