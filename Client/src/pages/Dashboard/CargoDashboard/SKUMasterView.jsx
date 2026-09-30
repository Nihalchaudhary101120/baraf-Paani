import React, { useState, useMemo } from 'react';
import { useSKU } from '@/context/SKUContext';
import CreateSKUModal from './CreateSKUModal';
import EditSKUModal from './EditSKUModal';

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

export default function SKUMasterView({ onSelectSKUForBox }) {
  const { skus, loading, fetchSKUs, deactivateSKU } = useSKU();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTracking, setSelectedTracking] = useState('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState(null);
  const [activeSpecSKU, setActiveSpecSKU] = useState(null);

  // Filtered SKUs
  const filteredSKUs = useMemo(() => {
    return (skus || []).filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.skuCode || '').toLowerCase().includes(q) ||
        (s.itemName || '').toLowerCase().includes(q) ||
        (s.manufacturer || '').toLowerCase().includes(q) ||
        (s.model || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'ALL' || (s.category || '').toUpperCase() === selectedCategory.toUpperCase();
      const matchesStatus = selectedStatus === 'ALL' || (s.status || '').toUpperCase() === selectedStatus.toUpperCase();
      const matchesTracking = selectedTracking === 'ALL' || (s.trackingType || '').toUpperCase() === selectedTracking.toUpperCase();

      return matchesSearch && matchesCategory && matchesStatus && matchesTracking;
    });
  }, [skus, searchQuery, selectedCategory, selectedStatus, selectedTracking]);

  // Metrics
  const metrics = useMemo(() => {
    const list = skus || [];
    const total = list.length;
    const active = list.filter(s => s.status === 'ACTIVE').length;
    const serialized = list.filter(s => s.trackingType === 'SERIALIZED').length;
    const hazmat = list.filter(s => s.isHazardous).length;
    return { total, active, serialized, hazmat };
  }, [skus]);

  // Toggle status using context
  const handleToggleStatus = async (sku) => {
    await deactivateSKU(sku);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Banner & Action */}
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
              inventory
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '0.01em' }}>
              SKU Master Catalog
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
            Centralized polar equipment & supplies catalog. Standardizes specifications, weights, handling, and tracking across all Antarctic shipments.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            backgroundColor: '#005B7F',
            color: '#FFFFFF',
            border: 'none',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0, 91, 127, 0.25)',
            transition: 'all 0.15s'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
          Create New SKU
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Catalog SKUs', value: metrics.total, color: '#005B7F', icon: 'grid_view', bg: '#EFF6FF' },
          { label: 'Active SKUs', value: metrics.active, color: '#15803D', icon: 'check_circle', bg: '#F0FDF4' },
          { label: 'Serialized SKUs', value: metrics.serialized, color: '#7E22CE', icon: 'qr_code_2', bg: '#FAF5FF' },
          { label: 'Hazmat Regulated', value: metrics.hazmat, color: '#DC2626', icon: 'warning', bg: '#FEF2F2' },
        ].map((m, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${m.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: m.color, marginTop: '0.2rem' }}>
                {m.value}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: m.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: m.color, fontSize: '20px' }}>
                {m.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '18px' }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search SKU Code, Item Name, Manufacturer, Model..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '34px',
              paddingRight: '12px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '0.84rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF' }}
        >
          <option value="ALL">All Categories</option>
          {['SCIENTIFIC', 'MEDICAL', 'ELECTRONICS', 'FOOD', 'SPARES', 'FUEL', 'EQUIPMENT', 'SAFETY', 'PERSONAL', 'GENERAL'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Tracking Filter */}
        <select
          value={selectedTracking}
          onChange={e => setSelectedTracking(e.target.value)}
          style={{ height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF' }}
        >
          <option value="ALL">All Tracking Types</option>
          <option value="QUANTITY_BASED">Quantity Based</option>
          <option value="SERIALIZED">Serialized Only</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', backgroundColor: '#FFFFFF' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <button
          onClick={() => fetchSKUs()}
          style={{
            height: '38px',
            padding: '0 0.85rem',
            backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* SKU Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>SKU CODE</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>ITEM NAME</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>CATEGORY</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>UNIT</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>WT. PER UNIT</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>TRACKING</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>DECLARED VALUE</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '24px' }}>sync</span>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>Loading SKUs...</div>
                  </td>
                </tr>
              ) : filteredSKUs.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#CBD5E1', marginBottom: '0.5rem' }}>inventory_2</span>
                    <div style={{ fontWeight: 700, color: '#334155' }}>No SKUs found matching your filters</div>
                    <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.2rem' }}>Click 'Create New SKU' to add new items to the catalog.</div>
                  </td>
                </tr>
              ) : (
                filteredSKUs.map((sku) => {
                  const catColor = CATEGORY_COLORS[sku.category] || CATEGORY_COLORS.GENERAL;
                  return (
                    <tr key={sku._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {/* SKU Code */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 800, color: '#005B7F', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {sku.skuCode}
                        </div>
                        {sku.isHazardous && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.66rem', fontWeight: 800, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '0.1rem 0.35rem', borderRadius: '3px', marginTop: '2px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>warning</span>
                            HAZMAT
                          </span>
                        )}
                      </td>

                      {/* Item Name & Details */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.86rem' }}>
                          {sku.itemName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                          {sku.manufacturer || 'Standard'} {sku.model ? `· Mod: ${sku.model}` : ''}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: catColor.bg,
                            color: catColor.color,
                            border: `1px solid ${catColor.border}`,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}
                        >
                          {sku.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#334155' }}>
                        {sku.unit || 'PCS'}
                      </td>

                      {/* Default Weight */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#0F172A' }}>
                        {sku.defaultWeightKg != null && sku.defaultWeightKg !== '' && sku.defaultWeightKg !== 0
                          ? `${sku.defaultWeightKg} kg`
                          : <span style={{ color: '#94A3B8', fontWeight: 400 }}>—</span>}
                      </td>

                      {/* Tracking */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: sku.trackingType === 'SERIALIZED' ? '#FAF5FF' : '#F1F5F9',
                            color: sku.trackingType === 'SERIALIZED' ? '#7E22CE' : '#475569',
                            border: sku.trackingType === 'SERIALIZED' ? '1px solid #E9D5FF' : '1px solid #E2E8F0',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}
                        >
                          {sku.trackingType === 'SERIALIZED' ? 'SERIALIZED' : 'QUANTITY'}
                        </span>
                      </td>

                      {/* Declared Value */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#059669' }}>
                        ₹{(sku.unitDeclaredValue || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: sku.status === 'ACTIVE' ? '#F0FDF4' : '#F8FAFC',
                            color: sku.status === 'ACTIVE' ? '#15803D' : '#64748B',
                            border: sku.status === 'ACTIVE' ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}
                        >
                          {sku.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {/* View Button */}
                          <button
                            title="View Full Specifications"
                            onClick={() => setActiveSpecSKU(sku)}
                            style={{
                              backgroundColor: '#EFF6FF',
                              color: '#005B7F',
                              border: '1px solid #BFDBFE',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                            View
                          </button>

                          {/* Edit Button */}
                          <button
                            title="Edit SKU Details"
                            onClick={() => setEditingSKU(sku)}
                            style={{
                              backgroundColor: '#F0F9FF',
                              color: '#0284C7',
                              border: '1px solid #BAE6FD',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                            Edit
                          </button>

                          {/* Deactivate / Activate Button */}
                          <button
                            title={sku.status === 'ACTIVE' ? 'Deactivate SKU' : 'Activate SKU'}
                            onClick={() => handleToggleStatus(sku)}
                            style={{
                              backgroundColor: sku.status === 'ACTIVE' ? '#FEF2F2' : '#F0FDF4',
                              color: sku.status === 'ACTIVE' ? '#B91C1C' : '#15803D',
                              border: sku.status === 'ACTIVE' ? '1px solid #FECACA' : '1px solid #BBF7D0',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {sku.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SKU Specification Detail Modal */}
      {activeSpecSKU && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 2600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.2rem 1.5rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #005B7F'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#38BDF8', fontSize: '22px' }}>
                  description
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>SKU SPECIFICATION SHEET</h3>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{activeSpecSKU.skuCode}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveSpecSKU(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{activeSpecSKU.itemName}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Category: <strong>{activeSpecSKU.category}</strong> {activeSpecSKU.subcategory ? `· ${activeSpecSKU.subcategory}` : ''}
                </div>
                {activeSpecSKU.description && (
                  <p style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    {activeSpecSKU.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Manufacturer & Model</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {activeSpecSKU.manufacturer || 'Standard'} {activeSpecSKU.model ? `(${activeSpecSKU.model})` : ''}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Default Unit Weight</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {activeSpecSKU.defaultWeightKg ? `${activeSpecSKU.defaultWeightKg} kg / ${activeSpecSKU.unit || 'unit'}` : 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Storage & Temp</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {activeSpecSKU.storageType} · {activeSpecSKU.temperatureRequirement}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Stock Limits (Min / Reorder / Max)</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {activeSpecSKU.minStockLevel || 5} / {activeSpecSKU.reorderLevel || 10} / {activeSpecSKU.maxStockLevel || 100}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  onClick={() => setActiveSpecSKU(null)}
                  style={{
                    backgroundColor: '#005B7F',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Close Specification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create SKU Modal */}
      <CreateSKUModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit SKU Modal */}
      <EditSKUModal
        isOpen={Boolean(editingSKU)}
        sku={editingSKU}
        onClose={() => setEditingSKU(null)}
      />
    </div>
  );
}
