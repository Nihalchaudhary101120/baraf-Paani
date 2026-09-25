import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '@/context/AdminContext';

const HQAdminDashboard = () => {
  const navigate = useNavigate();
  const { stats: cachedStats, users, stations: cachedStations, devices: cachedDevices, fetchStats, loading } = useAdminData();

  useEffect(() => {
    fetchStats(true); // Silent background revalidation
  }, [fetchStats]);

  const stats = cachedStats?.stats || {
    totalUsers: users.length || 0,
    activeUsers: users.filter(u => u.isActive !== false).length || 0,
    totalStations: cachedStations.length || 4,
    totalDevices: cachedDevices.length || 0,
    activeDevices: cachedDevices.filter(d => d.status === 'ONLINE' || d.status === 'ACTIVE').length || 0,
    offlineDevices: cachedDevices.filter(d => d.status === 'OFFLINE').length || 0,
    pendingAccounts: users.filter(u => u.isActive === false).length || 0,
    systemAlerts: 0,
  };

  const health = cachedStats?.systemHealth || {
    mongoStatus: 'HEALTHY',
    serverUptimeSeconds: 14200,
    memoryUsageMB: 184,
    nodeVersion: 'v22.x',
  };

  const formatUptime = (sec) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#005B7F' }}>admin_panel_settings</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              HQ SYSTEM ADMINISTRATION
            </h1>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              ROOT ACCESS
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Platform access control, user authentication, polar station records, device telemetry &amp; system health.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/users')}
            style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 4px rgba(0,91,127,0.2)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
            + Provision Account
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/devices')}
            style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_to_queue</span>
            + Register Device
          </button>
        </div>
      </div>

      {/* ── CORE STATS GRID ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Total Users */}
        <div
          onClick={() => navigate('/dashboard/users')}
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #005B7F', borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Users</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005B7F' }}>groups</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#005B7F', marginTop: '0.25rem' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>{stats.activeUsers} Active accounts</div>
        </div>

        {/* Stations */}
        <div
          onClick={() => navigate('/dashboard/stations')}
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284c7', borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Polar Stations</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>location_city</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>{stats.totalStations}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>Maitri, Bharati &amp; Himadri</div>
        </div>

        {/* Registered Devices */}
        <div
          onClick={() => navigate('/dashboard/devices')}
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #7e22ce', borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Hardware Devices</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7e22ce' }}>devices</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.25rem' }}>{stats.totalDevices}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>{stats.activeDevices} Online / Syncing</div>
        </div>

        {/* Pending Accounts */}
        <div
          onClick={() => navigate('/dashboard/users')}
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #eab308', borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Setups</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#eab308' }}>pending_actions</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#eab308', marginTop: '0.25rem' }}>{stats.pendingAccounts}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>Awaiting first-login profile</div>
        </div>

        {/* System Alerts */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #e11d48', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>System Alerts</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#e11d48' }}>warning</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e11d48', marginTop: '0.25rem' }}>{stats.systemAlerts}</div>
          <div style={{ fontSize: '0.72rem', color: '#e11d48', fontWeight: 600, marginTop: '0.2rem' }}>{stats.offlineDevices} Offline nodes</div>
        </div>

      </div>

      {/* ── SYSTEM HEALTH & AUDIT DIAGNOSTICS ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Module Administration Capabilities */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#005B7F', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
            Administrative Command Control
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '18px' }}>person_outline</span>
                User Identity &amp; Roles
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Create &amp; provision member accounts</li>
                <li>Assign role-based access &amp; station mapping</li>
                <li>Activate / Deactivate accounts instantaneously</li>
                <li>Automated credentials dispatch via SMTP</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/dashboard/users')}
                style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Open User Management →
              </button>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '18px' }}>domain</span>
                Polar Station Master
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Configure Maitri, Bharati, Himadri bases</li>
                <li>Set Summer / Winter life-support capacities</li>
                <li>Monitor station complement thresholds</li>
                <li>Configure geographical coordinates &amp; elevation</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/dashboard/stations')}
                style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Open Station Master →
              </button>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '18px' }}>tablet</span>
                Device &amp; Telemetry Registry
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Register field tablets, rugged PCs, nodes</li>
                <li>Track PouchDB offline synchronization state</li>
                <li>Monitor offline / online hardware status</li>
                <li>Station and personnel device assignments</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/dashboard/devices')}
                style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#7e22ce', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Open Device Registry →
              </button>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#5b21b6', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '18px' }}>visibility</span>
                Operational Read-Only Access
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>✓ Medical records &amp; training assessments</li>
                <li>✓ Cargo barcode &amp; checkpoint scans</li>
                <li>✓ Field excursion dispatch &amp; telemetry</li>
                <li>✓ Inventory consumption logs &amp; stock</li>
              </ul>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {[
                  { label: 'Medical', path: '/dashboard/admin-medical', color: '#0891b2' },
                  { label: 'Cargo', path: '/dashboard/admin-cargo', color: '#0369a1' },
                  { label: 'Field', path: '/dashboard/admin-field', color: '#15803d' },
                  { label: 'Inventory', path: '/dashboard/admin-inventory', color: '#7c3aed' },
                ].map(btn => (
                  <button key={btn.label} type="button" onClick={() => navigate(btn.path)}
                    style={{ padding: '0.3rem 0.65rem', backgroundColor: btn.color, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                    {btn.label} →
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* System Health Diagnostics */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#005B7F', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dns</span>
            System Diagnostics
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ color: '#64748B' }}>MongoDB Cluster</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>● CONNECTED</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ color: '#64748B' }}>PouchDB Offline Engine</span>
              <span style={{ fontWeight: 700, color: '#005B7F' }}>ACTIVE (IndexedDB)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ color: '#64748B' }}>Server Uptime</span>
              <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{formatUptime(health.serverUptimeSeconds)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ color: '#64748B' }}>Process Memory</span>
              <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{health.memoryUsageMB} MB RSS</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ color: '#64748B' }}>Nirantra Platform</span>
              <span style={{ fontWeight: 700, color: '#005B7F' }}>v1.3.0 Polar</span>
            </div>

          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Recent Audit Log
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.72rem', color: '#475569' }}>
              <div style={{ padding: '0.35rem 0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '2px solid #16a34a' }}>
                <strong>AUTH:</strong> User login token issued (Admin).
              </div>
              <div style={{ padding: '0.35rem 0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', borderLeft: '2px solid #005B7F' }}>
                <strong>SYNC:</strong> Station Maitri synced PouchDB queue.
              </div>
              <div style={{ padding: '0.35rem 0.5rem', backgroundColor: '#fff7ed', borderRadius: '4px', borderLeft: '2px solid #ea580c' }}>
                <strong>DEV:</strong> Device DEV-812 reported offline.
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── EXPEDITION MANAGEMENT (Primary HQ_ADMIN Power) ──────────── */}
      <div style={{ backgroundColor: 'linear-gradient(135deg, #1e3a5f, #005B7F)', background: 'linear-gradient(135deg, #0f2744 0%, #005B7F 100%)', borderRadius: '10px', padding: '1.5rem', color: '#fff', border: '1px solid #0284c7', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '40px', width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#7dd3fc' }}>flag</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>Expedition Command Control</h2>
              <span style={{ backgroundColor: 'rgba(125, 211, 252, 0.2)', color: '#7dd3fc', border: '1px solid rgba(125, 211, 252, 0.4)', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                PRIMARY POWER
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(186, 230, 253, 0.85)', margin: 0, maxWidth: '600px' }}>
              Create and fully manage expedition records. Select personnel, assign participation types, configure stations, and set deployment seasons. This is the HQ Admin's most critical operational function.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/expeditions')}
              style={{ backgroundColor: '#fff', color: '#005B7F', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flag</span>
              Manage Expeditions
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/personnel')}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span>
              Assign Personnel
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.25rem', position: 'relative', zIndex: 1 }}>
          {[
            { icon: 'add_circle', label: 'Create New Expedition', desc: 'Register a new expedition record with season and dates', action: () => navigate('/dashboard/expeditions'), accent: '#38bdf8' },
            { icon: 'group_add', label: 'Assign Team Members', desc: 'Select personnel and assign them to active expeditions', action: () => navigate('/dashboard/personnel'), accent: '#4ade80' },
            { icon: 'domain', label: 'Configure Stations', desc: 'Link stations and deployment types to expeditions', action: () => navigate('/dashboard/stations'), accent: '#fbbf24' },
            { icon: 'badge', label: 'View Readiness', desc: 'Check personnel profile completion and medical clearance', action: () => navigate('/dashboard/personnel'), accent: '#f472b6' },
          ].map(c => (
            <div
              key={c.label}
              onClick={c.action}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.85rem 1rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', transition: 'background-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: c.accent, display: 'block', marginBottom: '0.4rem' }}>{c.icon}</span>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{c.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(186, 230, 253, 0.75)' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default HQAdminDashboard;
