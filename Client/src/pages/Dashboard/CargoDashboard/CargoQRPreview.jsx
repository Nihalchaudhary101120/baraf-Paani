import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function CargoQRPreview({ item, manifest, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const boxCode = item?.boxCode || item?.itemCode || 'BOX-UNKNOWN';
  const itemName = item?.itemName || item?.description || 'Cargo Item';
  const skuCode = item?.skuCode || 'GENERAL';
  const category = item?.category || 'GENERAL';
  const manifestNumber = item?.manifestNumber || manifest?.manifestNumber || 'CGM-UNKNOWN';
  const destination = item?.destination || manifest?.destination?.name || 'Maitri Station';
  const status = item?.status || 'PACKED';
  const trackingCode = item?.trackingCode || boxCode;

  // Generate QR DataURL locally if backend hasn't provided one
  useEffect(() => {
    const generateQR = async () => {
      const scanBaseUrl = window.location.origin;
      const scanUrl = item?.qrCodeUrl || item?.qrCode || `${scanBaseUrl}/scan/cargo/${trackingCode}`;
      try {
        const url = await QRCode.toDataURL(scanUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 320,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };
    generateQR();
  }, [item, trackingCode]);

  const handlePrint = () => {
    window.print();
  };

  if (!item) return null;

  return (
    <div
      className="qr-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.25rem',
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
              qr_code_2
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>CARGO QR LABEL</h3>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{boxCode}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Official Printable Cargo Label Card */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            id="printable-cargo-label"
            style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}
          >
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005B7F' }}>ac_unit</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0F172A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                NIRANTRA POLAR LOGISTICS
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              PS 26062 NCPOR Operations
            </div>

            <div style={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', marginBottom: '1rem' }} />

            {/* Dominant QR Code */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Code for ${boxCode}`} style={{ width: '180px', height: '180px', display: 'block' }} />
              ) : (
                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                  Generating QR...
                </div>
              )}
            </div>

            {/* Main Item Identifiers */}
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#005B7F', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
              {boxCode}
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
              {itemName}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                SKU: {skuCode}
              </span>
              <span style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                Category: {category}
              </span>
            </div>

            <div style={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', margin: '0.85rem 0' }} />

            {/* Footer Metadata */}
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'left', fontSize: '0.72rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>Manifest No.</span>
                <span style={{ color: '#0F172A', fontWeight: 800, fontFamily: 'monospace' }}>{manifestNumber}</span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>Destination Base</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{destination}</span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>Weight / Unit</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{item?.weightKg || 10} kg ({item?.quantity || 1} {item?.unit || 'PCS'})</span>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                <span style={{ color: '#15803D', fontWeight: 700, display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>Status</span>
                <span style={{ color: '#15803D', fontWeight: 800 }}>{status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: '0.75rem'
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            style={{
              flex: 2,
              padding: '0.65rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#005B7F',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(0, 91, 127, 0.25)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            Print Official Label
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print, .qr-modal-overlay {
            background: none !important;
            backdrop-filter: none !important;
          }
          #printable-cargo-label, #printable-cargo-label * {
            visibility: visible;
          }
          #printable-cargo-label {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100% !important;
            max-width: 400px !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
