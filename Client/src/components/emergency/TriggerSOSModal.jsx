import React, { useState, useEffect } from 'react';
import { useLocationContext } from '@/context/LocationContext';
import { useSOSContext } from '@/context/SOSContext';
import { useAuth } from '@/context/AuthContext';
import VoiceInput from './VoiceInput';
import { saveSOSDraft, getSOSDraft, clearSOSDraft } from '@/services/pouchdbService';

const EMERGENCY_CATEGORIES = [
  { value: 'MEDICAL', label: 'Medical Emergency', icon: 'medical_services', desc: 'Injury, frostbite, hypothermia, acute illness' },
  { value: 'FIRE', label: 'Fire Outbreak', icon: 'local_fire_department', desc: 'Station structure, lab, or equipment fire' },
  { value: 'ACCIDENT', label: 'Accident / Trauma', icon: 'emergency', desc: 'Crevasse fall, vehicle crash, structural collapse' },
  { value: 'ENVIRONMENTAL', label: 'Environmental / Blizzard', icon: 'severe_cold', desc: 'Whiteout, catastrophic blizzard, ice cracking' },
  { value: 'EQUIPMENT_FAILURE', label: 'Life-Support / Power Failure', icon: 'power_off', desc: 'Generator offline, HVAC down, comms blackout' },
  { value: 'VEHICLE_EMERGENCY', label: 'Vehicle Breakdown', icon: 'snowmobile', desc: 'Snowcat, PistenBully, or aircraft emergency' },
  { value: 'MISSING_PERSON', label: 'Missing Personnel', icon: 'person_search', desc: 'Overdue researcher, lost in whiteout' },
  { value: 'SECURITY', label: 'Safety & Security', icon: 'shield', desc: 'Perimeter breach, hazardous material spill' },
  { value: 'WEATHER', label: 'Severe Weather Alert', icon: 'air', desc: 'Category 3 gale, rapid temperature drop' },
  { value: 'OTHER', label: 'Other Emergency', icon: 'warning', desc: 'Other critical life-safety incident' }
];

const SEVERITIES = [
  { value: 'CRITICAL', label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#F87171', desc: 'Immediate threat to life or station integrity' },
  { value: 'HIGH', label: 'HIGH', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', desc: 'Urgent response required within minutes' },
  { value: 'MEDIUM', label: 'MEDIUM', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: 'Serious situation, assistance needed' },
  { value: 'LOW', label: 'LOW', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', desc: 'Controlled incident requiring support' }
];

const TriggerSOSModal = ({ isOpen, onClose, defaultType = 'MEDICAL' }) => {
  const { user } = useAuth();
  const { location, accuracy, isLoading: isLocLoading, error: locError, getCurrentLocation } = useLocationContext();
  const { createSOS, actionLoading } = useSOSContext();

  const [emergencyType, setEmergencyType] = useState(defaultType);
  const [severity, setSeverity] = useState('CRITICAL');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [deliberateChecked, setDeliberateChecked] = useState(false);
  const [localLoc, setLocalLoc] = useState(null);

  // Automatically attempt to acquire location and restore saved draft upon opening
  useEffect(() => {
    if (isOpen) {
      setDeliberateChecked(false);

      // Restore PouchDB draft if exists (Section 14)
      getSOSDraft().then((draft) => {
        if (draft) {
          if (draft.emergencyType) setEmergencyType(draft.emergencyType);
          if (draft.severity) setSeverity(draft.severity);
          if (draft.description) setDescription(draft.description);
          if (draft.landmark) setLandmark(draft.landmark);
          if (draft.manualCoords) setManualCoords(draft.manualCoords);
        }
      });

      getCurrentLocation().then((res) => {
        if (res && res.isAvailable) {
          setLocalLoc(res);
          setManualCoords({ lat: res.latitude?.toFixed(5), lng: res.longitude?.toFixed(5) });
        }
      });
    }
  }, [isOpen, getCurrentLocation]);

  // Auto-save draft changes to PouchDB (Section 14)
  useEffect(() => {
    if (isOpen && (description || landmark)) {
      saveSOSDraft({
        emergencyType,
        severity,
        description,
        landmark,
        manualCoords
      });
    }
  }, [isOpen, emergencyType, severity, description, landmark, manualCoords]);

  if (!isOpen) return null;

  const handleRetryLocation = async () => {
    const res = await getCurrentLocation({ enableHighAccuracy: true });
    if (res && res.isAvailable) {
      setLocalLoc(res);
      setManualCoords({ lat: res.latitude?.toFixed(5), lng: res.longitude?.toFixed(5) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const latToUse = manualCoords.lat ? parseFloat(manualCoords.lat) : (localLoc?.latitude || location?.latitude);
    const lngToUse = manualCoords.lng ? parseFloat(manualCoords.lng) : (localLoc?.longitude || location?.longitude);

    const payload = {
      userId: user?._id || user?.id,
      emergencyType,
      severity,
      description: description.trim(),
      addressOrDesc: landmark.trim() || undefined,
      latitude: !isNaN(latToUse) ? latToUse : undefined,
      longitude: !isNaN(lngToUse) ? lngToUse : undefined,
      accuracy: localLoc?.accuracy || accuracy || undefined
    };

    const result = await createSOS(payload);
    if (result.success) {
      onClose();
    }
  };

  const hasLocation = Boolean((localLoc?.latitude || location?.latitude || manualCoords.lat));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94%',
          maxWidth: '640px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 60px -15px rgba(220, 38, 38, 0.4), 0 0 0 2px #FCA5A5',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header with High-Visibility Emergency Red */}
        <div style={{
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #991B1B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', animation: 'spin-once 0.5s ease' }}>emergency</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                TRIGGER EMERGENCY SOS
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#FEE2E2', fontWeight: 500 }}>
                Immediate Alert Transmission to Station Command & Rescue Teams
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* Warning Banner */}
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderLeft: '4px solid #DC2626',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.8rem',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#DC2626', flexShrink: 0 }}>warning</span>
            <span>
              <strong>Station Alert Protocol:</strong> Transmitting this SOS will sound high-priority alerts across station command consoles and notify all nearby qualified responders.
            </span>
          </div>

          {/* Location Acquisition Telemetry Box */}
          <div style={{
            backgroundColor: hasLocation ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${hasLocation ? '#BBF7D0' : '#FDE68A'}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: hasLocation ? '#16A34A' : '#D97706' }}>
                  {isLocLoading ? 'progress_activity' : hasLocation ? 'location_on' : 'location_off'}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: hasLocation ? '#166534' : '#92400E' }}>
                  {isLocLoading ? 'Acquiring GPS fix via device sensors...' : hasLocation ? 'GPS Location Detected' : 'Location Currently Unavailable'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetryLocation}
                disabled={isLocLoading}
                style={{
                  background: 'none',
                  border: '1px solid currentColor',
                  borderRadius: '4px',
                  color: hasLocation ? '#166534' : '#B45309',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  fontWeight: 600,
                  cursor: isLocLoading ? 'wait' : 'pointer'
                }}
              >
                {isLocLoading ? 'Detecting...' : 'Retry GPS'}
              </button>
            </div>

            {hasLocation ? (
              <div style={{ fontSize: '0.75rem', color: '#166534', fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>LAT: {manualCoords.lat || localLoc?.latitude?.toFixed(5) || location?.latitude?.toFixed(5)}°</span>
                <span>LON: {manualCoords.lng || localLoc?.longitude?.toFixed(5) || location?.longitude?.toFixed(5)}°</span>
                {(localLoc?.accuracy || accuracy) && (
                  <span>Accuracy: ±{Math.round(localLoc?.accuracy || accuracy)}m</span>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400E' }}>
                GPS permission denied or no satellite fix. <em>You can still transmit this SOS immediately.</em> Station command will dispatch based on your registered station/excursion.
              </p>
            )}
          </div>

          {/* Emergency Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.4rem' }}>
              Emergency Category *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {EMERGENCY_CATEGORIES.map((cat) => {
                const isSelected = emergencyType === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setEmergencyType(cat.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0.6rem 0.4rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? '#DC2626' : '#E2E8F0'}`,
                      backgroundColor: isSelected ? '#FEF2F2' : '#F8FAFC',
                      color: isSelected ? '#DC2626' : '#334155',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', marginBottom: '0.2rem' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.2 }}>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.4rem' }}>
              Severity Level *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev.value;
                return (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => setSeverity(sev.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1.5px solid ${isSelected ? sev.color : '#E2E8F0'}`,
                      backgroundColor: isSelected ? sev.bg : '#FFFFFF',
                      color: isSelected ? sev.color : '#64748B',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    {sev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Situation Description with Voice Input (Section 1) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.3rem' }}>
              Emergency Situation & Nature of Hazard *
            </label>
            <VoiceInput
              value={description}
              onChange={setDescription}
              placeholder="Describe what happened, personnel involved, immediate danger, injuries or critical failures... (Click Speak or type)"
            />
          </div>

          {/* Landmark / Sector Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
              Location Landmark or Station Zone (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Ridge 4, 3.2km South-West of Bharati; Generator Room Bay B; Ice Shelf Route C"
              style={{
                width: '100%',
                height: '36px',
                padding: '0 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Deliberate Confirmation Safeguard */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                id="deliberate-confirm-checkbox"
                checked={deliberateChecked}
                onChange={(e) => setDeliberateChecked(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#DC2626', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#1E293B', fontWeight: 600 }}>
                I deliberately confirm this is an authentic emergency requiring immediate response.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!deliberateChecked || !description.trim() || actionLoading}
              style={{
                flex: 2,
                padding: '0.7rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !deliberateChecked || !description.trim() || actionLoading ? '#94A3B8' : '#DC2626',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: !deliberateChecked || !description.trim() || actionLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: deliberateChecked && description.trim() ? '0 4px 14px rgba(220, 38, 38, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>crisis_alert</span>
              {actionLoading ? 'TRANSMITTING SOS...' : 'TRANSMIT EMERGENCY SOS'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default TriggerSOSModal;
