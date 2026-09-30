import React, { useMemo, useState } from 'react';
import { generateManifestQRs } from '@/api/cargo.api';
import { useToast } from '@/context/ToastContext';
import PrintQRLabelsModal from './PrintQRLabelsModal';

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

export default function ManifestDetailModal({
  isOpen,
  onClose,
  manifest,
  onAddBox,
  onViewQR,
  onManifestUpdated
}) {
  const { showToast } = useToast();
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [isPrintAllOpen, setIsPrintAllOpen] = useState(false);

  if (!isOpen || !manifest) return null;

  const items = manifest.items || [];

  // Category counts and units breakdown
  const categorySummary = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const cat = (item.category || 'GENERAL').toUpperCase();
      const qty = Number(item.quantity || item.packageCount || 1);
      map[cat] = (map[cat] || 0) + qty;
    });
    return map;
  }, [items]);

  const totalWeight = items.reduce((sum, it) => sum + (Number(it.weightKg) || 0), 0);
  const totalDeclared = items.reduce((sum, it) => sum + (Number(it.declaredValueINR) || 0), 0);
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity || it.packageCount || 1)), 0);

  const handleBulkGenerateQRs = async () => {
    if (!manifest._id) return;
    try {
      setGeneratingQRs(true);
      const res = await generateManifestQRs(manifest._id);
      if (res?.success) {
        showToast(`✅ Generated QR codes for ${items.length} items in ${manifest.manifestNumber}!`, 'success');
        if (onManifestUpdated) {
          onManifestUpdated();
        }
      } else {
        showToast(res?.message || 'Failed to generate QR codes', 'error');
      }
    } catch (err) {
      console.error('Bulk generate QR error:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to generate QR codes', 'error');
    } finally {
      setGeneratingQRs(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #005B7F'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#38BDF8', fontSize: '24px' }}>
                assignment
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  MANIFEST: {manifest.manifestNumber}
                </h2>
                <span
                  style={{
                    backgroundColor: manifest.status === 'DELIVERED' ? '#15803D' : manifest.status === 'IN_TRANSIT' ? '#0284C7' : '#7C3AED',
                    color: '#FFFFFF',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}
                >
                  {manifest.status}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                {manifest.description || 'Expedition Cargo Preparation'} · Destination: {manifest.destination?.name || 'Antarctica Station'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.3rem' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Manifest Action Bar (Bulk QR Generation & Printing) */}
          <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '1rem', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '22px' }}>
                qr_code_2
              </span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#005B7F' }}>
                  Cargo Manifest QR System
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                  Generate high-density 'H' QR labels for all {items.length} items in this manifest.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleBulkGenerateQRs}
                disabled={generatingQRs || items.length === 0}
                style={{
                  backgroundColor: '#005B7F',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  opacity: generatingQRs ? 0.7 : 1
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                {generatingQRs ? 'Generating QRs...' : 'Generate All QR Codes'}
              </button>

              <button
                onClick={() => setIsPrintAllOpen(true)}
                disabled={items.length === 0}
                style={{
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                Preview / Print All Labels
              </button>
            </div>
          </div>

          {/* Manifest Metrics Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Cargo Boxes</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#005B7F', marginTop: '0.15rem' }}>
                {items.length} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>boxes</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Quantity</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: '0.15rem' }}>
                {totalUnits} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>units</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Gross Cargo Weight</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#D97706', marginTop: '0.15rem' }}>
                {totalWeight.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>kg</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Declared Valuation</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803D', marginTop: '0.15rem' }}>
                ₹{totalDeclared.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Category-Wise Cargo Summary Breakdown */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pie_chart</span>
              Category Summary Breakdown
            </div>

            {Object.keys(categorySummary).length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>No items added to this manifest yet.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(categorySummary).map(([cat, qty]) => {
                  const cColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.GENERAL;
                  return (
                    <div
                      key={cat}
                      style={{
                        backgroundColor: cColor.bg,
                        color: cColor.color,
                        border: `1px solid ${cColor.border}`,
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>{cat}:</span>
                      <span style={{ fontSize: '0.85rem' }}>{qty} units</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cargo Boxes Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '18px' }}>view_in_ar</span>
                Manifest Cargo Boxes ({items.length})
              </div>

              {manifest.status !== 'DELIVERED' && (
                <button
                  onClick={() => onAddBox && onAddBox(manifest._id)}
                  style={{
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_box</span>
                  Add Box to Manifest
                </button>
              )}
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Box Code</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>SKU Code</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Item Name</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Weight</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Declared Val</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'right' }}>QR Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                        No cargo boxes added yet. Click 'Add Box to Manifest' above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const cColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.GENERAL;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                            {item.boxCode || item.itemCode}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#005B7F', fontFamily: 'monospace' }}>
                            {item.skuCode || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#1E293B' }}>
                            {item.itemName || item.description}
                            {item.serialNumbers && item.serialNumbers.length > 0 && (
                              <div style={{ fontSize: '0.68rem', color: '#7E22CE', fontFamily: 'monospace', marginTop: '2px' }}>
                                SN: {item.serialNumbers.join(', ')}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <span
                              style={{
                                backgroundColor: cColor.bg,
                                color: cColor.color,
                                border: `1px solid ${cColor.border}`,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: '#0F172A' }}>
                            {item.quantity || item.packageCount || 1} {item.unit || 'PCS'}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#475569' }}>
                            {item.weightKg} kg
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#059669' }}>
                            ₹{(item.declaredValueINR || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <span
                              style={{
                                backgroundColor: item.status === 'RECEIVED' ? '#F0FDF4' : '#EFF6FF',
                                color: item.status === 'RECEIVED' ? '#15803D' : '#0284C7',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}
                            >
                              {item.status || 'READY'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                            <button
                              onClick={() => onViewQR && onViewQR(item)}
                              style={{
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.3rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>qr_code_2</span>
                              QR Tag
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

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#005B7F',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close Manifest
          </button>
        </div>
      </div>

      {/* Print All Labels Modal */}
      <PrintQRLabelsModal
        isOpen={isPrintAllOpen}
        manifest={manifest}
        items={items}
        onClose={() => setIsPrintAllOpen(false)}
      />
    </div>
  );
}
