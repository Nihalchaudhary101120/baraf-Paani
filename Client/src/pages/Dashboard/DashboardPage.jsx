import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';

/**
 * HQ Command Dashboard — shows under /dashboard (index route)
 * Layout (header + sidebar) is handled by DashboardLayout.
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { users } = useUsers();
  const [sosActive, setSosActive] = useState(true);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0, letterSpacing: '-0.01em' }}>HQ COMMAND</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Overview of active polar missions, station complements, and priority alerts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/users')}
            style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
            + User Provisioning
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/sos')}
            style={{ backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⚠ SOS Center
          </button>
        </div>
      </div>

      {/* Current Expedition */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Expedition</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '1.1rem' }}>EXP-46</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Expedition 46</span>
            <span style={{ backgroundColor: '#f1f5f9', color: '#0F172A', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>WINTER</span>
            <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>● ACTIVE</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Period: <strong style={{ color: '#0F172A' }}>10 Oct 2026 – 20 Mar 2027</strong>
          </div>
        </div>
      </div>

      {/* Station Status */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>Station Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {[
            { name: 'MAITRI STATION', personnel: 42, status: 'ACTIVE', location: 'Schirmacher Oasis, East Antarctica' },
            { name: 'BHARATI STATION', personnel: 31, status: 'ACTIVE', location: 'Larsemann Hills, East Antarctica' },
          ].map(station => (
            <div key={station.name} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#005B7F' }}>{station.name}</span>
                <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600 }}>● {station.status}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>{station.location}</div>
              <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: '#64748B' }}>
                Personnel: <strong style={{ color: '#005B7F', fontSize: '1.1rem', fontWeight: 800 }}>{station.personnel}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Status Grid */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>Operational Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Personnel', value: '73 Active', color: '#005B7F', path: '/dashboard/personnel' },
            { label: 'Cargo', value: '18 Transit', color: '#0F172A', path: '/dashboard/cargo' },
            { label: 'Inventory Risks', value: '3 Low/Critical', color: '#E65A28', path: '/dashboard/inventory' },
            { label: 'Active Excursions', value: '2 Teams Out', color: '#7c3aed', path: '/dashboard/field' },
            { label: 'Emergency', value: '1 Open SOS', color: '#B91C1C', path: '/dashboard/sos' },
            { label: 'Equipment', value: '5 Issued', color: '#0369a1', path: '/dashboard/equipment' },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
                padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#005B7F'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color, marginTop: '0.35rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alerts */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>Critical Alerts</div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {sosActive && (
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', backgroundColor: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#B91C1C', animation: 'pulse-red 1s infinite', display: 'block' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>🔴 Medical SOS — Personnel P1023</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Maitri Station · Acute respiratory distress · ACTIVE</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/sos')}
                style={{ backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                [RESPOND]
              </button>
            </div>
          )}
          <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#E65A28', display: 'block' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>🟠 Cargo discrepancy — Manifest AL-1403-021</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Bharati Station · 2 packages missing</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/cargo')}
              style={{ backgroundColor: '#fff', border: '1px solid #005B7F', color: '#005B7F', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              [VIEW]
            </button>
          </div>
          <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#854d0e', display: 'block' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>⚠ EXC-2026-002 — OVERDUE check-in</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Larsemann Hills · Last check-in 3h ago</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/field')}
              style={{ backgroundColor: '#fff', border: '1px solid #005B7F', color: '#005B7F', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              [MONITOR]
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Schedule */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>Upcoming Schedule</div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            {[
              { date: '18 Oct', event: 'Ship departure — ORV Sagar Nidhi (Goa Port)', badge: 'Planned', badgeBg: '#eff6ff', badgeColor: '#005B7F' },
              { date: '21 Oct', event: 'Bharati resupply — Helicopter Staging Area', badge: 'Weather Alert', badgeBg: '#fff7ed', badgeColor: '#E65A28' },
              { date: '02 Nov', event: 'Personnel deployment — Maitri Inter-Station Transfer', badge: 'Scheduled', badgeBg: '#eff6ff', badgeColor: '#005B7F' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < 2 ? '0.5rem' : 0, borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: '#0F172A' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', width: '55px', flexShrink: 0 }}>{item.date}</span>
                  <span>{item.event}</span>
                </div>
                <span style={{ backgroundColor: item.badgeBg, color: item.badgeColor, padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
