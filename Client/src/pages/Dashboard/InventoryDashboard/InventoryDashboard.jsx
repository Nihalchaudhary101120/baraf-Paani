import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// ── Style constants ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#005B7F',
  primaryLight: '#EFF6FF',
  success: '#15803D',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FEFCE8',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  critical: '#C2410C',
  criticalLight: '#FFF7ED',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  bg: '#F8FAFC',
};

const STATUS_CONFIG = {
  AVAILABLE:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Available' },
  LOW_STOCK:   { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A', label: 'Low Stock' },
  CRITICAL:    { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Critical' },
  OUT_OF_STOCK:{ bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'Out of Stock' },
  DEPLETED:    { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'Depleted' },
};

const CAT_COLORS = {
  SCIENTIFIC:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  ELECTRONICS: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  MEDICAL:     { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  FUEL:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  FOOD:        { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  SPARES:      { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  EQUIPMENT:   { bg: '#EFF6FF', color: '#0369A1', border: '#BAE6FD' },
  SAFETY:      { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  PERSONAL:    { bg: '#FDF4FF', color: '#7E22CE', border: '#F0ABFC' },
  GENERAL:     { bg: '#F8FAFC', color: '#475569', border: '#CBD5E1' },
};

const CONSUME_REASONS = [
  'Research Usage', 'Field Expedition', 'Medical Emergency',
  'Station Maintenance', 'Equipment Testing', 'Personnel Consumption',
  'Transfer to Field', 'Disposal (Expired)', 'Other',
];

// ── FCFS Preview Helper ────────────────────────────────────────────────────
function computeFCFSPreview(batches, requestedQty) {
  if (!batches || !requestedQty) return [];
  const available = batches.filter(b => b.status === 'AVAILABLE').sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
  const allocations = [];
  let remaining = Number(requestedQty);
  for (const batch of available) {
    if (remaining <= 0) break;
    const use = Math.min(remaining, batch.remainingQuantity);
    allocations.push({ batch, quantity: use });
    remaining -= use;
  }
  return allocations;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, color, bg }) {
  return (
    <div style={{
      backgroundColor: '#FFF', borderRadius: '12px', padding: '1.1rem 1.25rem',
      border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: '0.9rem',
    }}>
      <div style={{ width: 42, height: 42, borderRadius: '10px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ color, fontSize: '22px' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.text, lineHeight: 1.1 }}>{value ?? '—'}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.AVAILABLE;
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  const cfg = CAT_COLORS[category?.toUpperCase()] || CAT_COLORS.GENERAL;
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>
      {category}
    </span>
  );
}

// ── Batch Details Modal ────────────────────────────────────────────────────
function BatchModal({ item, batches, batchLoading, onClose, onConsume }) {
  if (!item) return null;
  const available = (batches || []).filter(b => b.status === 'AVAILABLE');
  const depleted = (batches || []).filter(b => b.status !== 'AVAILABLE');
  const totalRemaining = available.reduce((s, b) => s + b.remainingQuantity, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ backgroundColor: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: COLORS.primary, fontSize: '20px' }}>layers</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.text }}>{item.itemName}</h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: COLORS.muted }}>
              {item.skuCode} · Total Available: <strong>{totalRemaining} {item.unit}</strong> · {available.length} active batch{available.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => onConsume(item)} style={{ backgroundColor: COLORS.primary, color: '#FFF', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
              Consume Stock
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {batchLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.muted }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
              <p>Loading batches...</p>
            </div>
          ) : (
            <>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FCFS Batch Order (oldest first = consumed first)
              </p>
              {available.length === 0 && <p style={{ color: COLORS.muted, fontSize: '0.85rem' }}>No available batches.</p>}
              {available.map((batch, idx) => (
                <div key={batch._id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.65rem', backgroundColor: idx === 0 ? '#EFF6FF' : '#FAFAFA' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div>
                      {idx === 0 && <span style={{ fontSize: '0.65rem', backgroundColor: COLORS.primary, color: '#FFF', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, marginBottom: '0.3rem', display: 'inline-block' }}>NEXT TO CONSUME</span>}
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: COLORS.text }}>{batch.sourceManifestNumber || batch.sourceManifestId?.manifestNumber || 'Manual Receipt'}</div>
                      <div style={{ fontSize: '0.72rem', color: COLORS.muted }}>Received {new Date(batch.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: COLORS.muted }}>Received</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: COLORS.success }}>{batch.receivedQuantity} {batch.unit}</div>
                      <div style={{ fontSize: '0.72rem', color: COLORS.muted, marginTop: '0.2rem' }}>Remaining</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: batch.remainingQuantity < batch.receivedQuantity * 0.3 ? COLORS.warning : COLORS.primary }}>
                        {batch.remainingQuantity} {batch.unit}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: '0.5rem', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: COLORS.primary, borderRadius: '9999px', width: `${(batch.remainingQuantity / batch.receivedQuantity) * 100}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
              {depleted.length > 0 && (
                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={{ fontSize: '0.75rem', color: COLORS.muted, cursor: 'pointer', fontWeight: 600 }}>
                    {depleted.length} depleted batch{depleted.length !== 1 ? 'es' : ''} (historical)
                  </summary>
                  {depleted.map(batch => (
                    <div key={batch._id} style={{ border: `1px solid #E2E8F0`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginTop: '0.5rem', backgroundColor: '#F8FAFC', opacity: 0.7 }}>
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted }}>{batch.sourceManifestNumber || 'Manual'} · {batch.receivedQuantity} {batch.unit} · Depleted</div>
                    </div>
                  ))}
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Consume Modal ──────────────────────────────────────────────────────────
function ConsumeModal({ item, batches, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ quantity: '', reason: CONSUME_REASONS[0], notes: '' });

  const availableBatches = useMemo(() => (batches || []).filter(b => b.status === 'AVAILABLE').sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt)), [batches]);
  const totalAvailable = availableBatches.reduce((s, b) => s + b.remainingQuantity, 0);
  const qty = Number(form.quantity) || 0;
  const afterConsumption = Math.max(0, totalAvailable - qty);
  const canConsume = qty > 0 && qty <= totalAvailable;
  const fcfsPreview = useMemo(() => computeFCFSPreview(batches, qty), [batches, qty]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canConsume) return;
    onSubmit({ ...form, quantity: qty });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ backgroundColor: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1.1rem 1.4rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ color: COLORS.primary, fontSize: '20px' }}>output</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.text }}>Consume Stock</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.4rem' }}>
          {/* Item summary */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '0.78rem', color: COLORS.muted }}>Item</div>
            <div style={{ fontWeight: 800, color: COLORS.text }}>{item?.itemName}</div>
            <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.2rem' }}>{item?.skuCode} · {item?.category}</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: COLORS.muted }}>Available</div>
                <div style={{ fontWeight: 800, color: COLORS.success, fontSize: '1.1rem' }}>{totalAvailable} {item?.unit}</div>
              </div>
              {qty > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: COLORS.muted }}>After Consumption</div>
                  <div style={{ fontWeight: 800, color: afterConsumption <= 0 ? COLORS.danger : afterConsumption <= 10 ? COLORS.warning : COLORS.primary, fontSize: '1.1rem' }}>{afterConsumption} {item?.unit}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: '0.3rem' }}>Quantity *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number" min="1" max={totalAvailable}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Enter quantity"
                required
                style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${!form.quantity || canConsume ? COLORS.border : COLORS.danger}`, fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.muted, minWidth: '40px' }}>{item?.unit}</span>
            </div>
            {form.quantity && !canConsume && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: COLORS.danger, fontWeight: 600 }}>
                ⚠ Insufficient stock. Available: {totalAvailable} {item?.unit}
              </p>
            )}
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: '0.3rem' }}>Reason *</label>
            <select
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              required
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.85rem', outline: 'none' }}
            >
              {CONSUME_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: '0.3rem' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* FCFS Preview */}
          {fcfsPreview.length > 0 && (
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.primary, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>FCFS ALLOCATION PREVIEW</div>
              {fcfsPreview.map(({ batch, quantity }, i) => (
                <div key={batch._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: COLORS.text, padding: '0.2rem 0', borderBottom: i < fcfsPreview.length - 1 ? '1px solid #BFDBFE' : 'none' }}>
                  <span>{batch.sourceManifestNumber || 'Batch ' + (i + 1)}</span>
                  <span style={{ fontWeight: 700 }}>→ {quantity} {batch.unit}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: COLORS.primary, marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #93C5FD' }}>
                <span>Total</span>
                <span>{qty} {item?.unit}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FFF', color: COLORS.text, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canConsume || submitting}
              style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: canConsume ? COLORS.primary : '#CBD5E1', color: '#FFF', fontWeight: 700, fontSize: '0.82rem', cursor: canConsume ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {submitting ? <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>output</span>}
              {submitting ? 'Consuming...' : 'Consume Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function InventoryDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    inventory, summary, batches, transactions,
    loading, batchLoading, txLoading, error,
    fetchInventory, fetchItemBatches, consumeStock,
    fetchTransactions, selectedItem, selectItem, clearSelectedItem,
  } = useInventory();

  const [activeTab, setActiveTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('itemName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [consumeTarget, setConsumeTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const userStationDoc = typeof user?.stationId === 'object' ? user?.stationId : null;
  const stationId = userStationDoc?._id || user?.stationId || user?.station;
  const stationName = userStationDoc?.name || (userStationDoc?.code ? `${userStationDoc.code} Station` : null);
  const stationCode = userStationDoc?.code || null;

  // Online/offline indicator
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Initial and reactive load for the inventory manager's assigned station
  useEffect(() => {
    if (stationId) {
      fetchInventory(stationId, { sort: sortBy, order: sortOrder });
    }
  }, [stationId, sortBy, sortOrder]);

  // Load transactions when tab switches
  useEffect(() => {
    if (activeTab === 'transactions' && stationId && transactions.length === 0) {
      fetchTransactions(stationId);
    }
  }, [activeTab, stationId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback((q) => {
    setSearch(q);
  }, []);

  const handleFilter = useCallback(() => {
    if (stationId) {
      fetchInventory(stationId, {
        search, category: filterCategory, status: filterStatus,
        sort: sortBy, order: sortOrder
      });
    }
  }, [stationId, search, filterCategory, filterStatus, sortBy, sortOrder, fetchInventory]);

  const handleViewBatches = useCallback((item) => {
    selectItem(item);
    setShowBatchModal(true);
    fetchItemBatches(stationId, item.skuId || item.skuCode);
  }, [selectItem, stationId, fetchItemBatches]);

  const handleOpenConsume = useCallback((item) => {
    setConsumeTarget(item);
    setShowBatchModal(false);
    setShowConsumeModal(true);
    // Ensure batches are loaded for FCFS preview
    const key = item.skuId || item.skuCode;
    if (!batches[key] || batches[key].length === 0) {
      fetchItemBatches(stationId, key);
    }
  }, [batches, stationId, fetchItemBatches]);

  const handleConsume = useCallback(async (formData) => {
    if (!consumeTarget || !stationId) return;
    setSubmitting(true);
    try {
      const payload = {
        skuId: consumeTarget.skuId,
        skuCode: consumeTarget.skuCode,
        quantity: formData.quantity,
        reason: formData.reason,
        notes: formData.notes,
      };

      const res = await consumeStock(stationId, payload);

      if (res?.success) {
        const msg = res.offline
          ? `Queued offline — ${formData.quantity} ${consumeTarget.unit} of ${consumeTarget.itemName} will sync when connected.`
          : `${formData.quantity} ${consumeTarget.unit} of ${consumeTarget.itemName} consumed successfully.`;
        toast.success(msg);
        setShowConsumeModal(false);
        setConsumeTarget(null);
      } else {
        toast.error(res?.error || res?.message || 'Failed to consume stock');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to consume stock');
    } finally {
      setSubmitting(false);
    }
  }, [consumeTarget, stationId, consumeStock, toast]);

  // ── Client-side filter (for instant search feedback) ──────────────────────
  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inventory.filter(item => {
      const matchSearch = !q ||
        (item.skuCode || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q);
      const matchCategory = filterCategory === 'ALL' || item.category?.toUpperCase() === filterCategory;
      const matchStatus = filterStatus === 'ALL' || item.stockStatus?.toUpperCase() === filterStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [inventory, search, filterCategory, filterStatus]);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const canConsume = ['INVENTORY_MANAGER', 'STATION_COMMANDER', 'STATION_OPERATOR'].includes(user?.role);

  // ── Selected item batches ─────────────────────────────────────────────────
  const selectedBatches = selectedItem ? (batches[selectedItem.skuId || selectedItem.skuCode] || []) : [];
  const consumeTargetBatches = consumeTarget ? (batches[consumeTarget.skuId || consumeTarget.skuCode] || []) : [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '1.1rem 1.5rem', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="material-symbols-outlined" style={{ color: COLORS.primary, fontSize: '24px' }}>warehouse</span>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: COLORS.text, margin: 0 }}>Station Inventory Management</h1>
            <span style={{ backgroundColor: '#EFF6FF', color: COLORS.primary, border: '1px solid #BFDBFE', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 800 }}>NIRANTRA</span>
            {/* Online indicator */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: isOnline ? '#15803D' : '#DC2626' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: isOnline ? '#22C55E' : '#EF4444', display: 'inline-block' }} />
              {isOnline ? 'Online' : 'Offline (changes queued)'}
            </span>
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: COLORS.muted }}>Batch-based FCFS inventory · Automatic cargo receipt · Real-time stock tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {stationName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: COLORS.primary,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: COLORS.primary }}>location_on</span>
              <span>{stationName} {stationCode && `(${stationCode})`}</span>
            </div>
          )}
          <button
            onClick={() => stationId && fetchInventory(stationId)}
            style={{
              backgroundColor: COLORS.primary, color: '#FFF',
              border: 'none', padding: '0.5rem 1rem', borderRadius: '8px',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
        <SummaryCard label="Total SKUs" value={summary.totalSKUs} icon="grid_view" color={COLORS.primary} bg="#EFF6FF" />
        <SummaryCard label="Total Stock" value={summary.totalStock?.toLocaleString()} icon="inventory_2" color={COLORS.success} bg="#F0FDF4" />
        <SummaryCard label="Low Stock" value={summary.lowStockCount} icon="warning" color={COLORS.warning} bg="#FEFCE8" />
        <SummaryCard label="Out of Stock" value={summary.outOfStockCount} icon="cancel" color={COLORS.danger} bg="#FEF2F2" />
        <SummaryCard label="Recent Receipts (7d)" value={summary.recentReceipts} icon="move_to_inbox" color="#7E22CE" bg="#FAF5FF" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { id: 'stock', label: 'Inventory Stock', icon: 'inventory_2' },
          { id: 'transactions', label: 'Transaction History', icon: 'receipt_long' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${COLORS.primary}` : '2px solid transparent', color: activeTab === tab.id ? COLORS.primary : COLORS.muted, fontWeight: activeTab === tab.id ? 800 : 600, fontSize: '0.82rem', cursor: 'pointer', marginBottom: '-1px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <>
          {/* ── Filters ── */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '0.85rem 1rem', border: `1px solid ${COLORS.border}`, display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '0 0.6rem', backgroundColor: '#FAFAFA' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: COLORS.muted }}>search</span>
              <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search item, SKU..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.82rem', padding: '0.45rem 0', flex: 1, color: COLORS.text }} />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.8rem', backgroundColor: '#FAFAFA' }}>
              <option value="ALL">All Categories</option>
              {['FOOD','FUEL','MEDICAL','SCIENTIFIC','ELECTRONICS','SPARES','EQUIPMENT','SAFETY','PERSONAL','GENERAL'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.8rem', backgroundColor: '#FAFAFA' }}>
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="CRITICAL">Critical</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <select value={`${sortBy}:${sortOrder}`} onChange={e => { const [f, o] = e.target.value.split(':'); setSortBy(f); setSortOrder(o); }} style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.8rem', backgroundColor: '#FAFAFA' }}>
              <option value="itemName:asc">Name A→Z</option>
              <option value="itemName:desc">Name Z→A</option>
              <option value="totalRemaining:desc">Stock High→Low</option>
              <option value="totalRemaining:asc">Stock Low→High</option>
              <option value="latestReceivedAt:desc">Recently Received</option>
            </select>
            <button onClick={handleFilter} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', backgroundColor: COLORS.primary, color: '#FFF', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Apply</button>
          </div>

          {/* ── Inventory Table ── */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {error && (
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#FEF2F2', borderBottom: `1px solid #FECACA`, color: COLORS.danger, fontSize: '0.82rem', fontWeight: 600 }}>
                ⚠ {error}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: COLORS.muted }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', animation: 'spin 1s linear infinite' }}>sync</span>
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Loading inventory...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: COLORS.muted }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', opacity: 0.4 }}>inventory_2</span>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>No inventory items found</p>
                <p style={{ fontSize: '0.8rem' }}>Inventory is populated automatically when cargo manifests are marked as DELIVERED.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${COLORS.border}` }}>
                      {['SKU', 'Item Name', 'Category', 'Available', 'Unit', 'Batches', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 800, color: COLORS.muted, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item, idx) => (
                      <tr key={item.skuCode || idx} style={{ borderBottom: `1px solid #F1F5F9`, transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', backgroundColor: '#EFF6FF', color: COLORS.primary, padding: '0.15rem 0.45rem', borderRadius: '5px', fontWeight: 700 }}>{item.skuCode}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: COLORS.text }}>{item.itemName}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><CategoryBadge category={item.category} /></td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: item.totalRemaining <= 0 ? COLORS.danger : item.totalRemaining <= 10 ? COLORS.warning : COLORS.success, fontSize: '0.95rem' }}>
                          {item.totalRemaining?.toLocaleString() ?? 0}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: COLORS.muted, fontWeight: 600 }}>{item.unit}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ backgroundColor: '#F1F5F9', color: COLORS.muted, padding: '0.15rem 0.45rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700 }}>{item.batchCount || 0}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={item.stockStatus} /></td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => handleViewBatches(item)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: `1px solid ${COLORS.border}`, background: '#FFF', color: COLORS.primary, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>layers</span> Batches
                            </button>
                            {canConsume && item.totalRemaining > 0 && (
                              <button onClick={() => handleOpenConsume(item)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', backgroundColor: COLORS.primary, color: '#FFF', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>output</span> Consume
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div style={{ backgroundColor: '#FFF', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: COLORS.text }}>Transaction History</h3>
            <button onClick={() => stationId && fetchTransactions(stationId)} style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: `1px solid ${COLORS.border}`, background: '#FFF', color: COLORS.primary, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Refresh</button>
          </div>
          {txLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.muted }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.muted, fontSize: '0.85rem' }}>No transactions found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${COLORS.border}` }}>
                    {['Date', 'Type', 'SKU', 'Quantity', 'Balance After', 'Source / Reason', 'By'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 800, color: COLORS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isReceipt = tx.transactionType === 'RECEIPT';
                    return (
                      <tr key={tx._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.65rem 1rem', color: COLORS.muted, whiteSpace: 'nowrap' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{ backgroundColor: isReceipt ? '#F0FDF4' : '#FEF2F2', color: isReceipt ? '#15803D' : '#DC2626', padding: '0.15rem 0.5rem', borderRadius: '5px', fontWeight: 700, fontSize: '0.7rem' }}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: COLORS.primary, fontSize: '0.75rem', fontWeight: 700 }}>{tx.skuCode || '—'}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: isReceipt ? COLORS.success : COLORS.danger }}>
                          {isReceipt ? '+' : '−'}{tx.quantity}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: COLORS.text }}>{tx.balanceAfterTransaction ?? '—'}</td>
                        <td style={{ padding: '0.65rem 1rem', color: COLORS.muted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.sourceManifestId?.manifestNumber || tx.sourceManifestNumber || tx.reason || tx.remarks || '—'}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: COLORS.muted }}>{tx.performedBy?.name || 'System'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showBatchModal && selectedItem && (
        <BatchModal
          item={selectedItem}
          batches={selectedBatches}
          batchLoading={batchLoading}
          onClose={() => { setShowBatchModal(false); clearSelectedItem(); }}
          onConsume={handleOpenConsume}
        />
      )}

      {showConsumeModal && consumeTarget && (
        <ConsumeModal
          item={consumeTarget}
          batches={consumeTargetBatches}
          onClose={() => { setShowConsumeModal(false); setConsumeTarget(null); }}
          onSubmit={handleConsume}
          submitting={submitting}
        />
      )}

      {/* CSS for spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
