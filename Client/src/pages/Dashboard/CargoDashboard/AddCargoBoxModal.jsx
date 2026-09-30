import React, { useState, useEffect, useMemo } from 'react';
import { addManifestItem } from '@/api/cargo.api';
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

const PACKAGE_TYPES = ['BOX', 'CRATE', 'PALLET', 'CYLINDER', 'CONTAINER', 'BAG'];
const SPECIAL_HANDLING = ['NORMAL', 'FRAGILE', 'PRIORITY', 'SECURE', 'REFRIGERATED', 'HAZMAT'];
const TEMP_REQUIREMENTS = ['AMBIENT', 'COLD_STORAGE', 'FREEZER', 'CRYOGENIC'];

export default function AddCargoBoxModal({
  isOpen,
  onClose,
  onSuccess,
  manifests = [],
  initialManifestId = '',
  onRequestCreateSKU
}) {
  const { skus, loading: loadingSKUs } = useSKU();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [targetManifestId, setTargetManifestId] = useState(initialManifestId);
  const [selectedCategory, setSelectedCategory] = useState('SCIENTIFIC');
  const [selectedSKUId, setSelectedSKUId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [packageType, setPackageType] = useState('BOX');
  const [packageCount, setPackageCount] = useState(1);
  const [specialHandling, setSpecialHandling] = useState('NORMAL');
  const [customDeclaredValue, setCustomDeclaredValue] = useState('');
  const [customTemp, setCustomTemp] = useState('');
  const [isHazardous, setIsHazardous] = useState(false);
  const [notes, setNotes] = useState('');
  const [serialNumbers, setSerialNumbers] = useState(['']);

  // Set initial manifest if available
  useEffect(() => {
    if (initialManifestId) {
      setTargetManifestId(initialManifestId);
    } else if (manifests.length > 0 && !targetManifestId) {
      setTargetManifestId(manifests[0]._id);
    }
  }, [initialManifestId, manifests, targetManifestId]);

  // Filter only active SKUs from context
  const activeSKUs = useMemo(() => {
    return (skus || []).filter(s => (s.status || 'ACTIVE') === 'ACTIVE');
  }, [skus]);

  // Filter active SKUs based on selected Category
  const categorySKUs = useMemo(() => {
    return activeSKUs.filter(s => (s.category || '').toUpperCase() === selectedCategory.toUpperCase());
  }, [activeSKUs, selectedCategory]);

  // Automatically select the first SKU in category when category changes or SKUs load
  useEffect(() => {
    if (categorySKUs.length > 0) {
      if (!categorySKUs.some(s => s._id === selectedSKUId)) {
        setSelectedSKUId(categorySKUs[0]._id);
      }
    } else {
      setSelectedSKUId('');
    }
  }, [categorySKUs, selectedSKUId]);

  // Current selected SKU object
  const currentSKU = useMemo(() => {
    return activeSKUs.find(s => s._id === selectedSKUId) || null;
  }, [activeSKUs, selectedSKUId]);

  // Sync temperature & hazardous defaults when SKU changes
  useEffect(() => {
    if (currentSKU) {
      setIsHazardous(Boolean(currentSKU.isHazardous));
      setCustomTemp(currentSKU.temperatureRequirement || 'AMBIENT');
      if (currentSKU.isHazardous) {
        setSpecialHandling('HAZMAT');
      }
    }
  }, [currentSKU]);

  // Sync serial numbers array length with quantity when trackingType is SERIALIZED
  useEffect(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (currentSKU?.trackingType === 'SERIALIZED') {
      setSerialNumbers(prev => {
        const next = [...prev];
        while (next.length < qty) {
          next.push('');
        }
        return next.slice(0, qty);
      });
    }
  }, [quantity, currentSKU]);

  if (!isOpen) return null;

  // Real-time calculated values
  const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
  const unitWeight = currentSKU?.defaultWeightKg || 0;
  const totalCalculatedWeight = parseFloat((unitWeight * parsedQty).toFixed(2));

  const unitValue = currentSKU?.unitDeclaredValue || 0;
  const totalCalculatedValue = unitValue * parsedQty;
  const effectiveDeclaredValue = customDeclaredValue !== '' ? Number(customDeclaredValue) : totalCalculatedValue;

  const handleSerialChange = (idx, val) => {
    setSerialNumbers(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAutoFillSerials = () => {
    if (!currentSKU) return;
    const prefix = currentSKU.skuCode ? `${currentSKU.skuCode}-SN` : 'SN';
    const timestamp = Date.now().toString().slice(-4);
    setSerialNumbers(Array.from({ length: parsedQty }, (_, i) => `${prefix}-${timestamp}-${String(i + 1).padStart(3, '0')}`));
    showToast(`Auto-generated ${parsedQty} serial numbers`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetManifestId) {
      showToast('Please select a target Cargo Manifest', 'error');
      return;
    }
    if (!currentSKU) {
      showToast('Please select an SKU item from the catalog', 'error');
      return;
    }

    // Validate serial numbers if serialized
    if (currentSKU.trackingType === 'SERIALIZED') {
      const emptyCount = serialNumbers.filter(s => !s.trim()).length;
      if (emptyCount > 0) {
        showToast(`Please enter serial numbers for all ${parsedQty} items (${emptyCount} missing)`, 'warning');
        return;
      }
    }

    try {
      setSubmitting(true);
      const boxPayload = {
        manifestId: targetManifestId,
        skuId: currentSKU._id,
        skuCode: currentSKU.skuCode,
        itemName: currentSKU.itemName,
        category: currentSKU.category,
        description: currentSKU.description || currentSKU.itemName,
        unit: currentSKU.unit || 'PCS',
        quantity: parsedQty,
        packageCount: Math.max(1, parseInt(packageCount, 10) || 1),
        packageType,
        unitWeightKg: unitWeight,
        weightKg: totalCalculatedWeight,
        unitDeclaredValue: unitValue,
        declaredValueINR: effectiveDeclaredValue,
        dimensions: currentSKU.defaultDimensions || { length: 50, width: 40, height: 30, unit: 'cm' },
        make: currentSKU.manufacturer,
        manufacturer: currentSKU.manufacturer,
        model: currentSKU.model,
        specialHandling,
        temperatureRequirement: customTemp || currentSKU.temperatureRequirement || 'AMBIENT',
        hazardous: isHazardous,
        notes: notes.trim(),
        serialNumbers: currentSKU.trackingType === 'SERIALIZED' ? serialNumbers : []
      };

      const res = await addManifestItem(targetManifestId, boxPayload);
      if (res?.success) {
        showToast(`Cargo Box added from SKU [${currentSKU.skuCode}] successfully!`, 'success');
        if (onSuccess) onSuccess(res?.item || boxPayload);
        onClose();
      } else {
        showToast(res?.message || 'Failed to add cargo box', 'error');
      }
    } catch (err) {
      console.error('Add cargo box error:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to add cargo box', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedManifest = manifests.find(m => m._id === targetManifestId);

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
          maxWidth: '740px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
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
                inventory_2
              </span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                ADD CARGO BOX VIA SKU MASTER
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                Fast Cascading Workflow · Automatic Weight & Valuation Calculations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '1.3rem',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. Target Manifest Selection */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              Target Cargo Manifest *
            </label>
            <select
              value={targetManifestId}
              onChange={e => setTargetManifestId(e.target.value)}
              required
              style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, backgroundColor: '#FFFFFF' }}
            >
              <option value="">Select Target Manifest...</option>
              {manifests.map(m => (
                <option key={m._id} value={m._id}>
                  {m.manifestNumber} — {m.description || 'Expedition Cargo'} ({m.status}) [Destination: {m.destination?.name || 'Antarctic Base'}]
                </option>
              ))}
            </select>

            {selectedManifest && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.74rem', color: '#64748B' }}>
                <span><strong>Origin:</strong> {selectedManifest.origin || 'Goa'}</span>
                <span><strong>Destination:</strong> {selectedManifest.destination?.name || 'Bharati / Maitri Station'}</span>
                <span><strong>Status:</strong> {selectedManifest.status}</span>
              </div>
            )}
          </div>

          {/* 2. Cascading Selection: Category -> SKU -> Quantity */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt</span>
              SKU Selection & Quantity
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
              {/* Category Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Category *
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '1px solid #005B7F', borderRadius: '6px', fontSize: '0.86rem', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Cascading Item / SKU Dropdown */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    Item / SKU Catalog *
                  </label>
                  {categorySKUs.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                      {categorySKUs.length} items available
                    </span>
                  )}
                </div>

                {loadingSKUs ? (
                  <div style={{ height: '40px', display: 'flex', alignItems: 'center', padding: '0 0.75rem', fontSize: '0.8rem', color: '#64748B', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px' }}>
                    Loading SKU Catalog...
                  </div>
                ) : categorySKUs.length > 0 ? (
                  <select
                    value={selectedSKUId}
                    onChange={e => setSelectedSKUId(e.target.value)}
                    required
                    style={{ width: '100%', height: '40px', padding: '0 0.75rem', border: '2px solid #005B7F', borderRadius: '6px', fontSize: '0.86rem', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  >
                    {categorySKUs.map(sku => (
                      <option key={sku._id} value={sku._id}>
                        {sku.skuCode} — {sku.itemName} ({sku.unit}) [{sku.manufacturer || 'Standard'}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#C2410C', fontWeight: 600 }}>
                      No SKUs available in this category.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequestCreateSKU) {
                          onRequestCreateSKU(selectedCategory);
                        }
                      }}
                      style={{
                        backgroundColor: '#005B7F',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                      Create SKU
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity & Unit Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Quantity to Prepare *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[1, 5, 10, 25].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        style={{
                          padding: '0.35rem 0.55rem',
                          backgroundColor: parsedQty === q ? '#005B7F' : '#E2E8F0',
                          color: parsedQty === q ? '#FFFFFF' : '#334155',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Unit of Measure
                </label>
                <div style={{ height: '38px', display: 'flex', alignItems: 'center', padding: '0 0.75rem', backgroundColor: '#E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                  {currentSKU?.unit || 'PCS'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. SKU Details Display Panel (Auto-Populated & Calculated) */}
          {currentSKU && (
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #DBEAFE', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284C7', fontSize: '20px' }}>
                    fact_check
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Auto-Populated SKU Master Specifications
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ backgroundColor: '#0284C7', color: '#FFFFFF', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                    {currentSKU.skuCode}
                  </span>
                  <span style={{ backgroundColor: currentSKU.trackingType === 'SERIALIZED' ? '#7C3AED' : '#10B981', color: '#FFFFFF', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {currentSKU.trackingType === 'SERIALIZED' ? 'SERIALIZED' : 'QUANTITY-BASED'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '0.75rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Item Name</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>{currentSKU.itemName}</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Manufacturer / Model</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>
                    {currentSKU.manufacturer || 'N/A'} {currentSKU.model ? `(${currentSKU.model})` : ''}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Unit Weight</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                    {currentSKU.defaultWeightKg} kg / unit
                  </div>
                </div>

                <div style={{ backgroundColor: '#FEF3C7', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>Total Weight (Live)</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#92400E', marginTop: '0.15rem' }}>
                    {totalCalculatedWeight} kg
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Unit Value</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>
                    ₹{unitValue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F0FDF4', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>Total Declared Value</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#166534', marginTop: '0.15rem' }}>
                    ₹{effectiveDeclaredValue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Storage Requirement</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>
                    {currentSKU.storageType || 'GENERAL'} · {currentSKU.temperatureRequirement || 'AMBIENT'}
                  </div>
                </div>
              </div>

              {currentSKU.description && (
                <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: '#475569', fontStyle: 'italic', backgroundColor: '#FFFFFF', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                  ℹ️ {currentSKU.description}
                </div>
              )}
            </div>
          )}

          {/* 4. Serial Numbers Section (Only for SERIALIZED SKUs) */}
          {currentSKU?.trackingType === 'SERIALIZED' && (
            <div style={{ backgroundColor: '#FDF4FF', border: '1px solid #F0ABFC', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#A855F7', fontSize: '20px' }}>
                    qr_code_2
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Item Serial Tracking ({parsedQty} required)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAutoFillSerials}
                  style={{
                    backgroundColor: '#7E22CE',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
                  Auto-Generate Sequence
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {serialNumbers.map((sn, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9333EA', minWidth: '32px' }}>
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. SN-00${idx + 1}`}
                      value={sn}
                      onChange={e => handleSerialChange(idx, e.target.value)}
                      style={{ flex: 1, height: '32px', padding: '0 0.5rem', border: '1px solid #D8B4FE', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Cargo Packing & Environmental Information */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>local_shipping</span>
              Cargo Packaging & Handling Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Package Type *
                </label>
                <select
                  value={packageType}
                  onChange={e => setPackageType(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
                >
                  {PACKAGE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Number of Packages *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packageCount}
                  onChange={e => setPackageCount(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Special Handling
                </label>
                <select
                  value={specialHandling}
                  onChange={e => setSpecialHandling(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
                >
                  {SPECIAL_HANDLING.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Temperature Requirement
                </label>
                <select
                  value={customTemp}
                  onChange={e => setCustomTemp(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
                >
                  {TEMP_REQUIREMENTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Hazardous Material
                </label>
                <div style={{ height: '36px', display: 'flex', alignItems: 'center', padding: '0 0.75rem', backgroundColor: isHazardous ? '#FFF1F2' : '#F1F5F9', border: isHazardous ? '1px solid #FECDD3' : '1px solid #CBD5E1', borderRadius: '6px', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isHazardous ? '#E11D48' : '#64748B' }}>
                    {isHazardous ? '⚠️ HAZARDOUS' : 'NON-HAZARDOUS'}
                  </span>
                  <input
                    type="checkbox"
                    checked={isHazardous}
                    onChange={e => setIsHazardous(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                Packing Notes & Base Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Secure in insulated container with silica gel packs"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
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
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !currentSKU}
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: currentSKU ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                opacity: currentSKU ? 1 : 0.6
              }}
            >
              {submitting ? (
                <span>Adding Box to Manifest...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_box</span>
                  Add Cargo Box ({totalCalculatedWeight} kg)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
