import React, { useState, useEffect } from 'react';
import { useSKU } from '@/context/SKUContext';
import { useToast } from '@/context/ToastContext';

const CATEGORIES = [
  'SCIENTIFIC',
  'MEDICAL',
  'ELECTRONICS',
  'FOOD',
  'SPARES',
  'FUEL',
  'EQUIPMENT',
  'SAFETY',
  'PERSONAL',
  'GENERAL'
];

const UNITS = ['PCS', 'KIT', 'BOX', 'KG', 'LITRE', 'CYLINDER', 'BAG', 'SET', 'PALLET', 'PKT'];
const STORAGE_TYPES = ['WAREHOUSE', 'RACK', 'SHELF', 'COLD_ROOM', 'HAZMAT_STORE', 'OUTDOOR_BAY', 'GENERAL'];
const TEMP_REQUIREMENTS = ['AMBIENT', 'COLD_STORAGE', 'FREEZER', 'CRYOGENIC'];

const getInitialForm = (cat = 'SCIENTIFIC') => ({
  skuCode: '',
  itemName: '',
  category: cat || 'SCIENTIFIC',
  subcategory: '',
  description: '',
  unit: 'PCS',
  manufacturer: '',
  model: '',
  defaultWeightKg: '',
  unitDeclaredValue: '',
  trackingType: 'QUANTITY_BASED',
  storageType: 'GENERAL',
  temperatureRequirement: 'AMBIENT',
  isHazardous: false,
  minStockLevel: '',
  reorderLevel: '',
  maxStockLevel: '',
  status: 'ACTIVE'
});

export default function CreateSKUModal({ isOpen, onClose, onSuccess, initialCategory = 'SCIENTIFIC' }) {
  const { createSKU } = useSKU();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(initialCategory));

  // Flush and reset form values whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setForm(getInitialForm(initialCategory));
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.skuCode.trim() || !form.itemName.trim()) {
      showToast('SKU Code and Item Name are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        skuCode: form.skuCode.trim().toUpperCase(),
        itemName: form.itemName.trim(),
        category: form.category,
        subcategory: form.subcategory.trim(),
        description: form.description.trim(),
        unit: form.unit,
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        defaultWeightKg: Number(form.defaultWeightKg) || 0,
        unitDeclaredValue: Number(form.unitDeclaredValue) || 0,
        trackingType: form.trackingType,
        storageType: form.storageType,
        temperatureRequirement: form.temperatureRequirement,
        isHazardous: form.isHazardous,
        minStockLevel: Number(form.minStockLevel) || 5,
        reorderLevel: Number(form.reorderLevel) || 10,
        maxStockLevel: Number(form.maxStockLevel) || 100,
        status: form.status
      };

      const res = await createSKU(payload);
      if (res?.success) {
        setForm(getInitialForm(initialCategory));
        if (onSuccess) {
          onSuccess(res.sku);
        }
        onClose();
      }
    } catch (err) {
      console.error('Create SKU error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
          borderRadius: '12px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
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
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#38BDF8', fontSize: '22px' }}>
                category
              </span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                CREATE NEW SKU MASTER ITEM
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                Polar Centralized Catalog · PS 26062 NCPOR Operations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Section: Basic Information */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
              Basic Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  SKU Code * <span style={{ color: '#64748B', fontWeight: 400 }}>(e.g. SCI-SEIS-001)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCI-SEIS-001"
                  value={form.skuCode}
                  onChange={e => setForm(f => ({ ...f, skuCode: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seismic Monitoring Sensor"
                  value={form.itemName}
                  onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Subcategory
                </label>
                <input
                  type="text"
                  placeholder="e.g. Geophysics / Meteorology"
                  value={form.subcategory}
                  onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Item Description
              </label>
              <textarea
                rows="2"
                placeholder="Technical specifications, application parameters, polar handling notes..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Section: Measurement & Valuation */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>straighten</span>
              Measurement & Valuation
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Unit of Measurement *
                </label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Default Weight / Unit (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="25"
                  value={form.defaultWeightKg}
                  onChange={e => setForm(f => ({ ...f, defaultWeightKg: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Unit Declared Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="50000"
                  value={form.unitDeclaredValue}
                  onChange={e => setForm(f => ({ ...f, unitDeclaredValue: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Manufacturer & Tracking Mode */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>precision_manufacturing</span>
              Manufacturer & Inventory Tracking Mode
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Manufacturer / Make
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vaisala / Garmin / IOCL"
                  value={form.manufacturer}
                  onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Model / Part Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. WXTS30"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Tracking Type Pills */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Inventory Tracking Mode *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, trackingType: 'QUANTITY_BASED' }))}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: form.trackingType === 'QUANTITY_BASED' ? '2px solid #005B7F' : '1px solid #CBD5E1',
                    backgroundColor: form.trackingType === 'QUANTITY_BASED' ? '#EFF6FF' : '#FFFFFF',
                    color: form.trackingType === 'QUANTITY_BASED' ? '#005B7F' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {form.trackingType === 'QUANTITY_BASED' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  Quantity Based (Non-Serialized)
                </button>

                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, trackingType: 'SERIALIZED' }))}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: form.trackingType === 'SERIALIZED' ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                    backgroundColor: form.trackingType === 'SERIALIZED' ? '#F5F3FF' : '#FFFFFF',
                    color: form.trackingType === 'SERIALIZED' ? '#7C3AED' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {form.trackingType === 'SERIALIZED' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  Serialized (Unique Serial Nos.)
                </button>
              </div>
            </div>

            {/* Threshold levels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Min Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.minStockLevel}
                  onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))}
                  style={{ width: '100%', height: '34px', padding: '0 0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))}
                  style={{ width: '100%', height: '34px', padding: '0 0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Max Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.maxStockLevel}
                  onChange={e => setForm(f => ({ ...f, maxStockLevel: e.target.value }))}
                  style={{ width: '100%', height: '34px', padding: '0 0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Storage & Environmental Requirements */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warehouse</span>
              Storage & Polar Environmental Requirements
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Storage Facility Type
                </label>
                <select
                  value={form.storageType}
                  onChange={e => setForm(f => ({ ...f, storageType: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                >
                  {STORAGE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Temperature Requirement
                </label>
                <select
                  value={form.temperatureRequirement}
                  onChange={e => setForm(f => ({ ...f, temperatureRequirement: e.target.value }))}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                >
                  {TEMP_REQUIREMENTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: form.isHazardous ? '#FFF1F2' : '#F1F5F9', border: form.isHazardous ? '1px solid #FECDD3' : '1px solid #E2E8F0', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: form.isHazardous ? '#E11D48' : '#64748B', fontSize: '20px' }}>
                  {form.isHazardous ? 'dangerous' : 'check_circle'}
                </span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: form.isHazardous ? '#9F1239' : '#334155' }}>
                    Hazardous Material Classification
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Flag item as requiring Hazmat containment protocols during transit
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={form.isHazardous}
                onChange={e => setForm(f => ({ ...f, isHazardous: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E11D48' }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#005B7F',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 91, 127, 0.25)',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? (
                <span>Registering SKU...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                  Create SKU in Master
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
