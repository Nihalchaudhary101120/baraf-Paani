import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function PrintQRLabelsModal({ isOpen, onClose, manifest, items = [] }) {
  const [qrMap, setQrMap] = useState({});
  const [loading, setLoading] = useState(true);

  const manifestNumber = manifest?.manifestNumber || 'CGM-MANIFEST';
  const destination = manifest?.destination?.name || manifest?.destination || 'Bharati / Maitri Station';

  useEffect(() => {
    if (!isOpen || !items.length) return;

    const generateAll = async () => {
      setLoading(true);
      const scanBaseUrl = window.location.origin;
      const map = {};

      for (const item of items) {
        const trackingCode = item.trackingCode || item.boxCode || item.itemCode || item._id;
        const scanUrl = item.qrCodeUrl || item.qrCode || `${scanBaseUrl}/scan/cargo/${trackingCode}`;
        try {
          const dataUrl = await QRCode.toDataURL(scanUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 260,
            color: { dark: '#0F172A', light: '#FFFFFF' }
          });
          map[item._id || item.itemCode] = dataUrl;
        } catch (err) {
          console.error(`Failed to generate QR for ${item.itemCode}:`, err);
        }
      }

      setQrMap(map);
      setLoading(false);
    };

    generateAll();
  }, [isOpen, items]);

  const handlePrintAll = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="bulk-qr-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          className="no-print"
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
            <span className="material-symbols-outlined" style={{ color: '#38BDF8', fontSize: '24px' }}>
              print
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                MANIFEST QR LABELS — {manifestNumber}
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                Previewing {items.length} printable cargo box labels with high-density 'H' QR codes
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={loading}
              style={{
                backgroundColor: '#005B7F',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(0, 91, 127, 0.25)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              Print All {items.length} Labels
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.3rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body Grid */}
        <div
          id="printable-bulk-labels"
          style={{
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '1.25rem',
            backgroundColor: '#F8FAFC'
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: '#005B7F' }}>
                sync
              </span>
              <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '0.95rem' }}>
                Rendering High-Density QR Codes...
              </div>
            </div>
          ) : (
            items.map((item, idx) => {
              const boxCode = item.boxCode || item.itemCode || `BOX-${idx + 1}`;
              const dataUrl = qrMap[item._id || item.itemCode];
              return (
                <div
                  key={item._id || idx}
                  className="cargo-label-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #0F172A',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Header */}
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    NIRANTRA POLAR LOGISTICS
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 700 }}>
                    PS 26062 NCPOR Operations
                  </div>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', margin: '0.5rem 0' }} />

                  {/* QR Image */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '0.5rem' }}>
                    {dataUrl ? (
                      <img src={dataUrl} alt={`QR Code ${boxCode}`} style={{ width: '140px', height: '140px', display: 'block' }} />
                    ) : (
                      <div style={{ width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                        QR...
                      </div>
                    )}
                  </div>

                  {/* Identifiers */}
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#005B7F', fontFamily: 'monospace' }}>
                    {boxCode}
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.1rem', wordBreak: 'break-word' }}>
                    {item.itemName || item.description || 'Cargo Box'}
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 800 }}>
                      SKU: {item.skuCode || 'GENERAL'}
                    </span>
                    <span style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 800 }}>
                      Cat: {item.category || 'GENERAL'}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', margin: '0.5rem 0' }} />

                  {/* Details */}
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', textAlign: 'left', fontSize: '0.65rem' }}>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 700 }}>Manifest:</span>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{manifestNumber}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 700 }}>Destination:</span>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{destination}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 700 }}>Weight:</span>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.weightKg || 10} kg</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 700 }}>Status:</span>
                      <div style={{ fontWeight: 800, color: '#15803D' }}>{item.status || 'PACKED'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print, .bulk-qr-modal-overlay {
            background: none !important;
            backdrop-filter: none !important;
          }
          #printable-bulk-labels, #printable-bulk-labels * {
            visibility: visible;
          }
          #printable-bulk-labels {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
            background: #fff !important;
          }
          .cargo-label-card {
            border: 2px solid #000 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
