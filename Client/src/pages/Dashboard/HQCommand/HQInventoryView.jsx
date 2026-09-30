import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { getStationInventory } from '@/api/inventory.api';

const COLORS = {
  primary: '#005B7F',
  success: '#15803D',
  warning: '#D97706',
  danger: '#DC2626',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
};

const STATUS_CONFIG = {
  AVAILABLE:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Available' },
  LOW_STOCK:    { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A', label: 'Low Stock' },
  CRITICAL:     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Critical' },
  OUT_OF_STOCK: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'Out of Stock' },
};

const CAT_COLORS = {
  SCIENTIFIC: { bg: '#EFF6FF', color: '#1D4ED8' },
  MEDICAL:    { bg: '#FFF1F2', color: '#BE123C' },
  FUEL:       { bg: '#FFF7ED', color: '#C2410C' },
  FOOD:       { bg: '#FEFCE8', color: '#854D0E' },
  EQUIPMENT:  { bg: '#EFF6FF', color: '#0369A1' },
  ELECTRONICS:{ bg: '#F0FDF4', color: '#166534' },
  SAFETY:     { bg: '#FEF2F2', color: '#B91C1C' },
  SPARES:     { bg: '#F0FDF4', color: '#15803D' },
  PERSONAL:   { bg: '#FDF4FF', color: '#7E22CE' },
  GENERAL:    { bg: '#F8FAFC', color: '#475569' },
};

function StatBadge({ value, color, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color }}>{value?.toLocaleString() ?? '—'}</div>
      <div style={{ fontSize: '0.65rem', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.AVAILABLE;
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '0.18rem 0.5rem', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

export default function HQInventoryView() {
  const { hqStations, loading, fetchAllStations } = useInventory();
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationInventory, setStationInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');

  // Load all stations on mount
  useEffect(() => {
    fetchAllStations();
  }, []);

  // Load inventory when a station is selected
  useEffect(() => {
    if (!selectedStation) return;
    setInvLoading(true);
    setStationInventory([]);
    getStationInventory(selectedStation._id)
      .then(res => setStationInventory(res?.inventory || []))
      .catch(() => setStationInventory([]))
      .finally(() => setInvLoading(false));
  }, [selectedStation]);

  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase().trim();
    return stationInventory.filter(item => {
      const matchSearch = !q ||
        (item.skuCode || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q);
      const matchCat = filterCat === 'ALL' || item.category?.toUpperCase() === filterCat;
      return matchSearch && matchCat;
    });
  }, [stationInventory, search, filterCat]);

  const totalLowStock = hqStations.reduce((s, st) => s + (st.lowStockCount || 0), 0);
  const totalStock = hqStations.reduce((s, st) => s + (st.totalStock || 0), 0);
  const totalSKUs = hqStations.reduce((s, st) => s + (st.totalSKUs || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '1.1rem 1.5rem', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ color: COLORS.primary, fontSize: '22px' }}>dataset</span>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: COLORS.text }}>HQ Inventory Overview</h2>
            <span style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', padding: '0.12rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700 }}>READ-ONLY</span>
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: COLORS.muted }}>Cross-station inventory visibility for HQ Command</p>
        </div>
        <button onClick={fetchAllStations} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: '#FFF', color: COLORS.primary, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span> Refresh
        </button>
      </div>

      {/* Aggregate stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Stations', value: hqStations.length, icon: 'location_on', color: COLORS.primary, bg: '#EFF6FF' },
          { label: 'Total SKUs', value: totalSKUs, icon: 'grid_view', color: '#7E22CE', bg: '#FAF5FF' },
          { label: 'Total Stock', value: totalStock?.toLocaleString(), icon: 'inventory_2', color: COLORS.success, bg: '#F0FDF4' },
          { label: 'Low Stock Alerts', value: totalLowStock, icon: 'warning', color: COLORS.warning, bg: '#FEFCE8' },
        ].map(c => (
          <div key={c.label} style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '0.9rem 1rem', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '9px', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: c.color, fontSize: '20px' }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase' }}>{c.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: COLORS.text }}>{c.value ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Station cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.muted }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>sync</span>
          <p>Loading station data...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {hqStations.map(st => (
            <div
              key={st.station._id}
              onClick={() => setSelectedStation(st.station)}
              style={{
                backgroundColor: '#FFF', borderRadius: '12px', padding: '1rem 1.25rem',
                border: `2px solid ${selectedStation?._id === st.station._id ? COLORS.primary : COLORS.border}`,
                cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: selectedStation?._id === st.station._id ? `0 0 0 3px ${COLORS.primary}22` : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: COLORS.text, fontSize: '0.9rem' }}>{st.station.name}</div>
                  <div style={{ fontSize: '0.7rem', color: COLORS.muted }}>{st.station.code} · {st.station.stationType}</div>
                </div>
                <span style={{ backgroundColor: st.station.operationalStatus === 'ACTIVE' ? '#F0FDF4' : '#FEF2F2', color: st.station.operationalStatus === 'ACTIVE' ? '#15803D' : '#DC2626', padding: '0.12rem 0.45rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700 }}>
                  {st.station.operationalStatus}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${COLORS.border}` }}>
                <StatBadge value={st.totalSKUs} color={COLORS.primary} label="SKUs" />
                <StatBadge value={st.totalStock?.toLocaleString()} color={COLORS.success} label="Units" />
                <StatBadge value={st.lowStockCount} color={st.lowStockCount > 0 ? COLORS.warning : COLORS.muted} label="Low" />
                <StatBadge value={st.outOfStockCount} color={st.outOfStockCount > 0 ? COLORS.danger : COLORS.muted} label="Empty" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected station inventory table */}
      {selectedStation && (
        <div style={{ backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          {/* Station header */}
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', backgroundColor: '#F8FAFC' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: COLORS.primary, fontSize: '18px' }}>location_on</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: COLORS.text }}>{selectedStation.name}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: COLORS.muted }}>{filteredInventory.length} SKU{filteredInventory.length !== 1 ? 's' : ''} shown</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', border: `1px solid ${COLORS.border}`, borderRadius: '7px', padding: '0 0.55rem', backgroundColor: '#FFF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: COLORS.muted }}>search</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ border: 'none', outline: 'none', fontSize: '0.78rem', padding: '0.38rem 0', width: '140px' }} />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '0.38rem 0.6rem', borderRadius: '7px', border: `1px solid ${COLORS.border}`, fontSize: '0.78rem' }}>
                <option value="ALL">All Categories</option>
                {['FOOD','FUEL','MEDICAL','SCIENTIFIC','ELECTRONICS','SPARES','EQUIPMENT','SAFETY','PERSONAL','GENERAL'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setSelectedStation(null)} style={{ padding: '0.38rem 0.7rem', borderRadius: '7px', border: `1px solid ${COLORS.border}`, background: '#FFF', color: COLORS.muted, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>✕ Close</button>
            </div>
          </div>

          {invLoading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.muted }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
              <p>Loading {selectedStation.name} inventory...</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.muted, fontSize: '0.85rem' }}>No inventory found for this station.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${COLORS.border}` }}>
                    {['SKU', 'Item Name', 'Category', 'Available', 'Unit', 'Batches', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 800, color: COLORS.muted, fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item, idx) => {
                    const catCfg = CAT_COLORS[item.category?.toUpperCase()] || CAT_COLORS.GENERAL;
                    return (
                      <tr key={item.skuCode || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: COLORS.primary, fontWeight: 700 }}>{item.skuCode}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: COLORS.text }}>{item.itemName}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{ backgroundColor: catCfg.bg, color: catCfg.color, padding: '0.12rem 0.45rem', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 700 }}>{item.category}</span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: item.totalRemaining <= 0 ? COLORS.danger : item.totalRemaining <= 10 ? COLORS.warning : COLORS.success }}>
                          {item.totalRemaining?.toLocaleString() ?? 0}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: COLORS.muted }}>{item.unit}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{ backgroundColor: '#F1F5F9', color: COLORS.muted, padding: '0.12rem 0.4rem', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>{item.batchCount || 0}</span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={item.stockStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
