import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getScanCargoInfo, createCheckpoint } from '@/api/cargo.api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';

const STATUS_MAP = {
  CREATED: { bg: '#F8FAFC', color: '#475569', label: 'Created' },
  PACKED: { bg: '#F5F3FF', color: '#7C3AED', label: 'Packed & Sealed' },
  LOADED: { bg: '#FEF9C3', color: '#854D0E', label: 'Loaded on Vessel' },
  DISPATCHED: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Dispatched' },
  IN_TRANSIT: { bg: '#EFF6FF', color: '#1D4ED8', label: 'In Transit to Antarctica' },
  DELIVERED: { bg: '#F0FDF4', color: '#15803D', label: 'Delivered to Base' },
  RECEIVED: { bg: '#F0FDF4', color: '#15803D', label: 'Received & Verified' }
};

export default function CargoScanView() {
  const { trackingCode } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [cargo, setCargo] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checkpoint recording state
  const [isRecordingCheckpoint, setIsRecordingCheckpoint] = useState(false);
  const [checkpointForm, setCheckpointForm] = useState({
    checkpointName: 'PORT_DISPATCH',
    checkpointType: 'PORT_DISPATCH',
    condition: 'GOOD',
    notes: ''
  });
  const [submittingCheckpoint, setSubmittingCheckpoint] = useState(false);

  const fetchScanData = useCallback(async () => {
    if (!trackingCode) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getScanCargoInfo(trackingCode);
      if (res?.success && res?.cargo) {
        setCargo(res.cargo);
        setCheckpoints(res.checkpoints || []);
      } else {
        setError(res?.message || 'Cargo item not found');
      }
    } catch (err) {
      console.error('Scan fetch error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to scan cargo item');
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    fetchScanData();
  }, [fetchScanData]);

  const handleRecordCheckpoint = async (e) => {
    e.preventDefault();
    if (!cargo) return;

    try {
      setSubmittingCheckpoint(true);
      const payload = {
        itemCode: cargo.itemCode || cargo.boxCode,
        boxCode: cargo.boxCode || cargo.itemCode,
        boxDesc: cargo.itemName || cargo.description,
        manifestNumber: cargo.manifestNumber,
        shipmentNumber: cargo.shipmentNumber,
        checkpointName: checkpointForm.checkpointName,
        checkpointType: checkpointForm.checkpointType,
        condition: checkpointForm.condition,
        notes: checkpointForm.notes.trim(),
        officerName: user?.name || 'Logistics Officer'
      };

      const res = await createCheckpoint(payload);
      if (res?.success) {
        showToast(`Checkpoint recorded for ${cargo.boxCode}!`, 'success');
        setIsRecordingCheckpoint(false);
        setCheckpointForm({ checkpointName: 'PORT_DISPATCH', checkpointType: 'PORT_DISPATCH', condition: 'GOOD', notes: '' });
        // Refetch live database state to display updated info immediately
        fetchScanData();
      } else {
        showToast(res?.message || 'Failed to record checkpoint scan', 'error');
      }
    } catch (err) {
      console.error('Checkpoint create error:', err);
      showToast(err?.response?.data?.message || 'Failed to record checkpoint scan', 'error');
    } finally {
      setSubmittingCheckpoint(false);
    }
  };

  const statusConfig = STATUS_MAP[cargo?.status] || STATUS_MAP.PACKED;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', color: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Top Polar Operational Navbar */}
      <header
        style={{
          backgroundColor: '#1E293B',
          borderBottom: '2px solid #005B7F',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#005B7F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              qr_code_scanner
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em' }}>
              NIRANTRA CARGO SCANNER
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
              Polar Live Operations · PS 26062 NCPOR
            </div>
          </div>
        </div>

        <Link
          to="/"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#38BDF8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
          Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        
        {loading ? (
          <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid #334155' }}>
            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '36px', color: '#38BDF8' }}>
              sync
            </span>
            <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '0.95rem', color: '#94A3B8' }}>
              Resolving live database record for scanned QR [{trackingCode}]...
            </div>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', border: '1px solid #7F1D1D' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#EF4444', marginBottom: '0.75rem' }}>
              error
            </span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>Scan Result: Item Not Found</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.4rem', maxWidth: '420px', margin: '0.4rem auto 1.5rem' }}>
              {error}
            </div>
            <button
              onClick={fetchScanData}
              style={{ backgroundColor: '#005B7F', color: '#FFFFFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            >
              Retry Scan Query
            </button>
          </div>
        ) : cargo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Live Status Header Banner */}
            <div
              style={{
                backgroundColor: '#1E293B',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900, color: '#38BDF8' }}>
                    {cargo.boxCode}
                  </span>
                  <span
                    style={{
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <h1 style={{ margin: '0.3rem 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {cargo.itemName}
                </h1>
              </div>

              <button
                onClick={() => setIsRecordingCheckpoint(true)}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location_alt</span>
                Record Checkpoint Scan
              </button>
            </div>

            {/* QR Verification & Primary Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
              
              {/* QR Panel */}
              <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '1.25rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  {cargo.qrDataUrl ? (
                    <img src={cargo.qrDataUrl} alt={`QR Code ${cargo.boxCode}`} style={{ width: '160px', height: '160px', display: 'block' }} />
                  ) : (
                    <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>QR Data</div>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Tracking Code
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace', marginTop: '2px' }}>
                  {cargo.trackingCode}
                </div>
              </div>

              {/* Specs Grid */}
              <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '1.25rem', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0F172A', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Category & SKU</span>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {cargo.category} · <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{cargo.skuCode}</span>
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0F172A', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Weight & Package</span>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {cargo.weightKg} kg ({cargo.quantity} {cargo.unit})
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0F172A', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Manifest & Shipment</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {cargo.manifestNumber} ({cargo.shipmentNumber})
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0F172A', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Destination Base</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                    {cargo.destination}
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0F172A', borderRadius: '6px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Storage & Temp</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {cargo.temperatureRequirement}
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.75rem', backgroundColor: cargo.hazardous ? '#450A0A' : '#0F172A', borderRadius: '6px', border: cargo.hazardous ? '1px solid #991B1B' : '1px solid #334155' }}>
                  <span style={{ fontSize: '0.66rem', color: cargo.hazardous ? '#FCA5A5' : '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Handling & Hazmat</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: cargo.hazardous ? '#EF4444' : '#FFFFFF', marginTop: '2px' }}>
                    {cargo.specialHandling} {cargo.hazardous ? '⚠️ HAZMAT' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Checkpoint Audit Log */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', padding: '1.25rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#38BDF8', fontSize: '20px' }}>
                  route
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  REAL-TIME CHECKPOINT AUDIT LOG ({checkpoints.length})
                </span>
              </div>

              {checkpoints.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                  No checkpoint scans recorded for this box yet. Click 'Record Checkpoint Scan' to log a scan update.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {checkpoints.map((cp, idx) => (
                    <div
                      key={cp._id || idx}
                      style={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        border: '1px solid #334155',
                        borderLeft: '4px solid #38BDF8',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {cp.checkpointName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                          Status: <strong style={{ color: '#10B981' }}>{cp.condition}</strong> · Scanned by {cp.officerName || 'Logistics Officer'}
                        </div>
                        {cp.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '0.3rem', fontStyle: 'italic' }}>
                            "{cp.notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>
                        {new Date(cp.timestamp || cp.createdAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Record Checkpoint Scan Modal */}
        {isRecordingCheckpoint && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(4px)',
              zIndex: 3500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              style={{
                backgroundColor: '#1E293B',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '460px',
                border: '1px solid #334155',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
              }}
            >
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #059669'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '22px' }}>
                    add_location_alt
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>RECORD CHECKPOINT SCAN</span>
                </div>
                <button
                  onClick={() => setIsRecordingCheckpoint(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordCheckpoint} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Checkpoint Location / Name *
                  </label>
                  <select
                    value={checkpointForm.checkpointName}
                    onChange={e => setCheckpointForm(f => ({ ...f, checkpointName: e.target.value, checkpointType: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.85rem' }}
                  >
                    <option value="GOA_PORT_DISPATCH">Goa Port Dispatch</option>
                    <option value="VESSEL_LOADING">Vessel Loading (Cape Town)</option>
                    <option value="ANTARCTIC_TRANSIT">Antarctic Sea Transit</option>
                    <option value="STATION_ARRIVAL">Station Arrival & Unloading</option>
                    <option value="FINAL_RECEIVING">Final Base Receiving</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Box Condition *
                  </label>
                  <select
                    value={checkpointForm.condition}
                    onChange={e => setCheckpointForm(f => ({ ...f, condition: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.85rem' }}
                  >
                    <option value="GOOD">Good / Intact</option>
                    <option value="DAMAGED">Damaged Seal / Packaging</option>
                    <option value="ALERT">Alert / Needs Inspection</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Inspector Notes / Remarks
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Physical condition remarks, seal status, temperature check..."
                    value={checkpointForm.notes}
                    onChange={e => setCheckpointForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsRecordingCheckpoint(false)}
                    disabled={submittingCheckpoint}
                    style={{ flex: 1, padding: '0.65rem', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingCheckpoint}
                    style={{ flex: 2, padding: '0.65rem', backgroundColor: '#059669', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    {submittingCheckpoint ? 'Recording Scan...' : 'Submit Scan Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
