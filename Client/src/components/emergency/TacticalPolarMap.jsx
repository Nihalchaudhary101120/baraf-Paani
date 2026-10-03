import React, { useMemo } from 'react';

/**
 * TacticalPolarMap
 * Renders a high-tech vector Antarctic tactical radar & situational grid.
 * Displays:
 *  🔵 / cyan marker: Base / Station (e.g. HQ GOA / Bharati)
 *  🔴 Red marker: SOS Incident (with pulse animation & emergency type)
 *  🟢 Green markers: All Volunteer Responders (with name, role, distance, and status)
 *  Vector lines linking responders to the SOS beacon
 */
const TacticalPolarMap = ({
  sosLocation,
  emergencyType = 'EMERGENCY',
  responders = [],
  responderLocation = null,
  stationLocation = null,
  stationName = 'HQ GOA',
  sosNumber = 'SOS',
  responderName = 'Responder',
  distanceKm = null
}) => {
  // 1. Normalize SOS Coordinates
  const sosCoords = useMemo(() => {
    if (!sosLocation) return null;
    if (Array.isArray(sosLocation.coordinates) && sosLocation.coordinates.length >= 2 && (sosLocation.coordinates[0] !== 0 || sosLocation.coordinates[1] !== 0)) {
      return { lng: sosLocation.coordinates[0], lat: sosLocation.coordinates[1] };
    }
    if (sosLocation.longitude !== undefined && sosLocation.latitude !== undefined && (sosLocation.longitude !== 0 || sosLocation.latitude !== 0)) {
      return { lng: sosLocation.longitude, lat: sosLocation.latitude };
    }
    return null;
  }, [sosLocation]);

  // 2. Normalize Base Station Coordinates
  const stnCoords = useMemo(() => {
    if (!stationLocation) return { lng: 76.19, lat: -69.41 }; // Default Antarctic coastal base
    if (Array.isArray(stationLocation.coordinates) && stationLocation.coordinates.length >= 2 && (stationLocation.coordinates[0] !== 0 || stationLocation.coordinates[1] !== 0)) {
      return { lng: stationLocation.coordinates[0], lat: stationLocation.coordinates[1] };
    }
    if (stationLocation.longitude !== undefined && stationLocation.latitude !== undefined) {
      return { lng: stationLocation.longitude, lat: stationLocation.latitude };
    }
    return { lng: 76.19, lat: -69.41 };
  }, [stationLocation]);

  // 3. Normalize all active volunteer responders
  const normalizedResponders = useMemo(() => {
    const list = [];

    // If explicit array of responders passed
    if (Array.isArray(responders) && responders.length > 0) {
      responders.forEach((r, idx) => {
        if (r.status === 'STOOD_DOWN' || r.status === 'DECLINED') return;

        let lng = null;
        let lat = null;
        const loc = r.location || {};

        if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2 && (loc.coordinates[0] !== 0 || loc.coordinates[1] !== 0)) {
          lng = loc.coordinates[0];
          lat = loc.coordinates[1];
        } else if (loc.longitude != null && loc.latitude != null && (loc.longitude !== 0 || loc.latitude !== 0)) {
          lng = loc.longitude;
          lat = loc.latitude;
        } else if (r.longitude != null && r.latitude != null && (r.longitude !== 0 || r.latitude !== 0)) {
          lng = r.longitude;
          lat = r.latitude;
        }

        // If coordinates not detected but responder is responding, synthesize relative tactical offset based on station and SOS
        if (lng == null || lat == null) {
          if (sosCoords) {
            // Position proportionally between station and SOS with small jitter
            const progress = 0.3 + ((idx % 3) * 0.2);
            const angle = (idx * 0.8) - 0.4;
            lng = stnCoords.lng + (sosCoords.lng - stnCoords.lng) * progress + Math.sin(angle) * 0.015;
            lat = stnCoords.lat + (sosCoords.lat - stnCoords.lat) * progress + Math.cos(angle) * 0.015;
          } else {
            lng = stnCoords.lng + ((idx + 1) * 0.01);
            lat = stnCoords.lat + ((idx + 1) * 0.008);
          }
        }

        list.push({
          id: r._id || r.userId?._id || r.userId || `resp-${idx}`,
          name: r.name || r.userId?.name || `Responder ${idx + 1}`,
          role: r.role || r.userId?.role || 'PERSONNEL',
          distanceKm: r.distanceKm,
          status: r.status || 'RESPONDING',
          assigned: Boolean(r.assigned),
          teamName: r.teamName || '',
          lng,
          lat
        });
      });
    }

    // Fallback single responderLocation if responders array was empty
    if (list.length === 0 && responderLocation) {
      let lng = null;
      let lat = null;
      if (Array.isArray(responderLocation.coordinates) && responderLocation.coordinates.length >= 2) {
        lng = responderLocation.coordinates[0];
        lat = responderLocation.coordinates[1];
      } else if (responderLocation.longitude != null && responderLocation.latitude != null) {
        lng = responderLocation.longitude;
        lat = responderLocation.latitude;
      }
      if (lng != null && lat != null) {
        list.push({
          id: 'single-resp',
          name: responderName,
          role: 'RESPONDER',
          distanceKm,
          status: 'RESPONDING',
          assigned: false,
          teamName: '',
          lng,
          lat
        });
      }
    }

    return list;
  }, [responders, responderLocation, responderName, distanceKm, sosCoords, stnCoords]);

  // Center & Projection calculation
  const { points, mapScaleKm } = useMemo(() => {
    const centerLat = stnCoords.lat;
    const centerLng = stnCoords.lng;

    const allPoints = [{ lng: stnCoords.lng, lat: stnCoords.lat }];
    if (sosCoords) allPoints.push({ lng: sosCoords.lng, lat: sosCoords.lat });
    normalizedResponders.forEach((r) => allPoints.push({ lng: r.lng, lat: r.lat }));

    let maxDeltaLng = 0.02;
    let maxDeltaLat = 0.02;

    allPoints.forEach((p) => {
      const dLng = Math.abs(p.lng - centerLng);
      const dLat = Math.abs(p.lat - centerLat);
      if (dLng > maxDeltaLng) maxDeltaLng = dLng;
      if (dLat > maxDeltaLat) maxDeltaLat = dLat;
    });

    const maxDelta = Math.max(maxDeltaLng, maxDeltaLat, 0.03);
    const scale = 140 / (maxDelta * 1.35); // Fits in ~140px radius from center (300, 190)

    const project = (lng, lat) => {
      const dx = (lng - centerLng) * scale;
      const dy = -(lat - centerLat) * scale;
      return {
        x: Math.max(45, Math.min(555, 300 + dx)),
        y: Math.max(45, Math.min(345, 190 + dy))
      };
    };

    return {
      points: {
        station: project(stnCoords.lng, stnCoords.lat),
        sos: sosCoords ? project(sosCoords.lng, sosCoords.lat) : null,
        responders: normalizedResponders.map((r) => ({
          ...r,
          pos: project(r.lng, r.lat)
        }))
      },
      mapScaleKm: Math.round(maxDelta * 111 * 10) / 10
    };
  }, [stnCoords, sosCoords, normalizedResponders]);

  return (
    <div style={{
      backgroundColor: '#070D1E',
      borderRadius: '10px',
      border: '1px solid #1E293B',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.75)'
    }}>
      {/* Top Telemetry Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.65rem 1rem',
        backgroundColor: '#0B132B',
        borderBottom: '1px solid #1E293B',
        fontSize: '0.75rem',
        color: '#94A3B8',
        fontFamily: "'JetBrains Mono', monospace",
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px #10B981'
          }} />
          <span style={{ color: '#F1F5F9', fontWeight: 800 }}>TACTICAL SITUATION POLAR MAP</span>
          <span style={{ color: '#64748B' }}>GRID: ±{mapScaleKm} km</span>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#EF4444', fontWeight: 700 }}>🔴 SOS INCIDENT</span>
          <span style={{ color: '#38BDF8', fontWeight: 700 }}>🔵 STATION ({stationName})</span>
          <span style={{ color: '#10B981', fontWeight: 700 }}>
            🟢 VOLUNTEER RESPONDERS ({points.responders.length})
          </span>
        </div>
      </div>

      {/* SVG Radar / Map Canvas */}
      <svg
        viewBox="0 0 600 380"
        style={{ width: '100%', height: '350px', display: 'block' }}
      >
        <defs>
          <radialGradient id="grid-glow-tactical" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0369A1" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#0B132B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#070D1E" stopOpacity="1" />
          </radialGradient>

          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker for vector directions */}
          <marker id="arrow-vector" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#10B981" />
          </marker>
        </defs>

        {/* Ambient Grid Background */}
        <rect x="0" y="0" width="600" height="380" fill="url(#grid-glow-tactical)" />

        {/* Concentric Polar Range Rings */}
        <circle cx="300" cy="190" r="55" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
        <circle cx="300" cy="190" r="110" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="4,4" />
        <circle cx="300" cy="190" r="165" fill="none" stroke="#1E293B" strokeWidth="1" />

        {/* Polar Radial Axis Lines */}
        <line x1="300" y1="20" x2="300" y2="360" stroke="#1E293B" strokeWidth="1" />
        <line x1="20" y1="190" x2="580" y2="190" stroke="#1E293B" strokeWidth="1" />

        {/* Compass Cardinal Points */}
        <text x="300" y="16" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="'JetBrains Mono', monospace">N</text>
        <text x="300" y="374" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="'JetBrains Mono', monospace">S</text>
        <text x="590" y="193" textAnchor="end" fill="#475569" fontSize="10" fontFamily="'JetBrains Mono', monospace">E</text>
        <text x="10" y="193" textAnchor="start" fill="#475569" fontSize="10" fontFamily="'JetBrains Mono', monospace">W</text>

        {/* Distance Vector Lines from ALL Volunteer Responders towards SOS */}
        {points.sos && points.responders.map((resp) => (
          <g key={`vector-${resp.id}`}>
            <line
              x1={resp.pos.x}
              y1={resp.pos.y}
              x2={points.sos.x}
              y2={points.sos.y}
              stroke="#10B981"
              strokeWidth="1.75"
              strokeDasharray="5,4"
              opacity="0.75"
              markerEnd="url(#arrow-vector)"
            />
            {/* Midpoint Distance Badge */}
            {resp.distanceKm != null && (
              <g transform={`translate(${(resp.pos.x * 2 + points.sos.x) / 3}, ${(resp.pos.y * 2 + points.sos.y) / 3})`}>
                <rect x="-26" y="-9" width="52" height="18" rx="3" fill="#0A1128" stroke="#10B981" strokeWidth="0.8" opacity="0.9" />
                <text x="0" y="3" textAnchor="middle" fill="#34D399" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                  {resp.distanceKm} km
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Base Station Marker (🔵 Cyan) */}
        <g transform={`translate(${points.station.x}, ${points.station.y})`}>
          <circle cx="0" cy="0" r="16" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.4" />
          <polygon points="0,-12 11,8 -11,8" fill="#38BDF8" filter="url(#glow-cyan)" />
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
          <rect x="-48" y="14" width="96" height="18" rx="3" fill="#0B132B" stroke="#38BDF8" strokeWidth="0.8" />
          <text x="0" y="26" textAnchor="middle" fill="#38BDF8" fontSize="9" fontFamily="'Inter', sans-serif" fontWeight="800">
            🔵 {stationName}
          </text>
        </g>

        {/* SOS Incident Marker (🔴 Red) */}
        {points.sos ? (
          <g transform={`translate(${points.sos.x}, ${points.sos.y})`}>
            {/* Animated Expanding Pulse Rings */}
            <circle cx="0" cy="0" r="26" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.4">
              <animate attributeName="r" values="10;34" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="12" fill="#EF4444" filter="url(#glow-red)" />
            <circle cx="0" cy="0" r="4.5" fill="#FFFFFF" />

            {/* Badge */}
            <g transform="translate(0, -28)">
              <rect x="-65" y="-12" width="130" height="24" rx="4" fill="rgba(220, 38, 38, 0.95)" stroke="#FECACA" strokeWidth="1" />
              <text x="0" y="-1" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="800">
                🚨 {sosNumber}
              </text>
              <text x="0" y="9" textAnchor="middle" fill="#FEE2E2" fontSize="7.5" fontFamily="'Inter', sans-serif" fontWeight="700">
                {emergencyType.replace(/_/g, ' ')}
              </text>
            </g>
          </g>
        ) : (
          <g transform="translate(300, 190)">
            <text x="0" y="45" textAnchor="middle" fill="#94A3B8" fontSize="11" fontFamily="'Inter', sans-serif">
              ⚠ SOS Coordinates Pending
            </text>
          </g>
        )}

        {/* ALL Volunteer Responder Markers (🟢 Green) */}
        {points.responders.map((resp, i) => {
          // Stagger label placement slightly so multiple responders don't overlap completely
          const offsetY = (i % 2 === 0) ? 18 : -32;

          return (
            <g key={resp.id} transform={`translate(${resp.pos.x}, ${resp.pos.y})`}>
              {/* Pulse animation */}
              <circle cx="0" cy="0" r="18" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" values="7;24" dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="8" fill="#10B981" filter="url(#glow-green)" />
              <circle cx="0" cy="0" r="3" fill="#FFFFFF" />

              {/* Responder Detailed Tactical Badge */}
              <g transform={`translate(0, ${offsetY})`}>
                <rect
                  x="-58"
                  y="-12"
                  width="116"
                  height="34"
                  rx="4"
                  fill="#0B132B"
                  stroke="#10B981"
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />
                {/* Line 1: Name */}
                <text x="0" y="-1" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="'Inter', sans-serif" fontWeight="800">
                  🟢 {resp.name.split(' ')[0]} {resp.name.split(' ')[1] ? resp.name.split(' ')[1][0] + '.' : ''}
                </text>
                {/* Line 2: Role · Distance */}
                <text x="0" y="9" textAnchor="middle" fill="#94A3B8" fontSize="7.5" fontFamily="'Inter', sans-serif" fontWeight="600">
                  {resp.role} {resp.distanceKm != null ? `· ${resp.distanceKm} km` : ''}
                </text>
                {/* Line 3: Status / Formal Team */}
                <text x="0" y="18" textAnchor="middle" fill={resp.assigned ? '#A78BFA' : '#34D399'} fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                  {resp.assigned ? `[${resp.teamName || 'ASSIGNED'}]` : resp.status.replace(/_/g, ' ')}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Coordinate & Responders Footer Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 1rem',
        backgroundColor: '#0B132B',
        borderTop: '1px solid #1E293B',
        fontSize: '0.72rem',
        color: '#64748B',
        fontFamily: "'JetBrains Mono', monospace",
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          {sosCoords ? (
            <span style={{ color: '#F87171' }}>
              INCIDENT GPS: {sosCoords.lat.toFixed(4)}°, {sosCoords.lng.toFixed(4)}°
              {sosLocation?.accuracy && ` (±${Math.round(sosLocation.accuracy)}m)`}
            </span>
          ) : (
            <span style={{ color: '#FBBF24' }}>NO GPS FIX DETECTED FOR INCIDENT</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', color: '#10B981', fontWeight: 600 }}>
          <span>
            {points.responders.length === 0
              ? 'NO VOLUNTEERS ON MAP'
              : `${points.responders.length} RESPONDER(S) ACTIVE ON GRID`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TacticalPolarMap;
