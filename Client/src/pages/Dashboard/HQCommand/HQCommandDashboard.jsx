import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommandOverviewApi, getPersonnelReadinessApi, getExpeditionsApi } from '@/api/admin.api';
import { useToast } from '@/context/ToastContext';

const HQCommandDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState({
    activeExpeditions: 3,
    personnelDeployed: 184,
    cargoInTransit: 42,
    pendingMedicalClearance: 8,
    lowStockItems: 17,
    emergencyAlerts: 2,
    offlineStations: 1,
  });
  const [expeditions, setExpeditions] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCommandData = async () => {
    setLoading(true);
    try {
      const [ovRes, expRes, prRes] = await Promise.all([
        getCommandOverviewApi().catch(() => null),
        getExpeditionsApi().catch(() => null),
        getPersonnelReadinessApi().catch(() => null),
      ]);

      if (ovRes && ovRes.overview) {
        setOverview((prev) => ({ ...prev, ...ovRes.overview }));
      }
      if (expRes && expRes.expeditions) {
        setExpeditions(expRes.expeditions);
      }
      if (prRes && prRes.personnel) {
        setPersonnel(prRes.personnel);
      }
    } catch (err) {
      console.error('Command data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandData();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Command Overview', icon: 'radar' },
    { id: 'expeditions', label: 'Expeditions', icon: 'flag' },
    { id: 'personnel', label: 'Personnel Readiness', icon: 'badge' },
    { id: 'cargo', label: 'Cargo Pipeline', icon: 'local_shipping' },
    { id: 'inventory', label: 'Cross-Station Stock', icon: 'inventory' },
    { id: 'emergency', label: 'Emergency & SOS', icon: 'emergency', danger: true },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#005B7F' }}>radar</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              HQ OPERATIONS COMMAND CENTER
            </h1>
            <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              POLAR FLEET ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Real-time strategic oversight of Indian Antarctic missions, personnel readiness, supply pipelines, and emergency coordination.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/sos')}
            style={{ backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 4px rgba(185,28,28,0.25)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>emergency</span>
            SOS Command ({overview.emergencyAlerts})
          </button>
          <button
            type="button"
            onClick={fetchCommandData}
            style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── COMMAND METRICS BAR (7 KEY INDICATORS) ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
        
        {/* 1. Active Expeditions */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #005B7F', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Expeditions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#005B7F', marginTop: '0.2rem' }}>{overview.activeExpeditions}</div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600 }}>EXP-46, EXP-45, EXP-44</div>
        </div>

        {/* 2. Personnel Deployed */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284c7', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Personnel Deployed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>{overview.personnelDeployed}</div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Maitri, Bharati, Ships</div>
        </div>

        {/* 3. Cargo In Transit */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #7e22ce', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Cargo In Transit</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.2rem' }}>{overview.cargoInTransit}</div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Goa → Cape Town → Ice</div>
        </div>

        {/* 4. Pending Medical Clearance */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #eab308', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Medical</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#eab308', marginTop: '0.2rem' }}>{overview.pendingMedicalClearance}</div>
          <div style={{ fontSize: '0.68rem', color: '#ca8a04', fontWeight: 600 }}>Awaiting fitness signoff</div>
        </div>

        {/* 5. Low Stock Items */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #ea580c', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Low Stock Items</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '0.2rem' }}>{overview.lowStockItems}</div>
          <div style={{ fontSize: '0.68rem', color: '#ea580c', fontWeight: 600 }}>Fuel, Spares &amp; Food</div>
        </div>

        {/* 6. Emergency Alerts */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #b91c1c', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Emergency Alerts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.2rem' }}>{overview.emergencyAlerts}</div>
          <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 700 }}>1 SOS, 1 Weather</div>
        </div>

        {/* 7. Offline Stations */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: '4px solid #64748B', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Offline Stations</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#64748B', marginTop: '0.2rem' }}>{overview.offlineStations}</div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Buffering locally (PouchDB)</div>
        </div>

      </div>

      {/* ── TAB NAVIGATION ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.65rem 1.25rem', backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? (tab.danger ? '2px solid #B91C1C' : '2px solid #005B7F') : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.id ? (tab.danger ? '#B91C1C' : '#005B7F') : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW & MAP PIPELINE ─────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Antarctic Mission Pipeline Visualizer */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#005B7F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Strategic Supply &amp; Personnel Transit Corridor
              </span>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>● Active Mission Tracking</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
              
              <div style={{ padding: '1rem 0.5rem', backgroundColor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0284c7' }}>apartment</span>
                <div style={{ fontWeight: 800, color: '#0369A1', fontSize: '0.85rem', marginTop: '0.35rem' }}>1. NCPOR GOA</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>Mission HQ &amp; Dispatch</div>
                <div style={{ marginTop: '0.5rem', backgroundColor: '#0284c7', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Ready to Ship
                </div>
              </div>

              <div style={{ padding: '1rem 0.5rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#475569' }}>anchor</span>
                <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.85rem', marginTop: '0.35rem' }}>2. PORT STAGING</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>Mormugao / Cape Town</div>
                <div style={{ marginTop: '0.5rem', backgroundColor: '#475569', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Customs &amp; Staging
                </div>
              </div>

              <div style={{ padding: '1rem 0.5rem', backgroundColor: '#FAF5FF', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#7e22ce' }}>directions_boat</span>
                <div style={{ fontWeight: 800, color: '#7E22CE', fontSize: '0.85rem', marginTop: '0.35rem' }}>3. POLAR VESSEL</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>ORV Sagar Nidhi / Charter</div>
                <div style={{ marginTop: '0.5rem', backgroundColor: '#7e22ce', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Southern Ocean Transit
                </div>
              </div>

              <div style={{ padding: '1rem 0.5rem', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#15803d' }}>ac_unit</span>
                <div style={{ fontWeight: 800, color: '#15803D', fontSize: '0.85rem', marginTop: '0.35rem' }}>4. ICE EDGE / SHELF</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>Prydz Bay &amp; Fast Ice</div>
                <div style={{ marginTop: '0.5rem', backgroundColor: '#15803d', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Helicopter &amp; Piston Bully
                </div>
              </div>

              <div style={{ padding: '1rem 0.5rem', backgroundColor: '#ECFEFF', borderRadius: '8px', border: '1px solid #A5F3FC' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0e7490' }}>location_city</span>
                <div style={{ fontWeight: 800, color: '#0E7490', fontSize: '0.85rem', marginTop: '0.35rem' }}>5. BHARATI / MAITRI</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>Permanent Antarctic Bases</div>
                <div style={{ marginTop: '0.5rem', backgroundColor: '#0e7490', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Bases Operational
                </div>
              </div>

            </div>
          </div>

          {/* Active Station Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, color: '#005B7F', fontSize: '1.05rem' }}>MAITRI STATION</div>
                <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>● ONLINE (42/45)</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Schirmacher Oasis · 70°45′57″S 11°44′09″E</div>
              
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>COMPLEMENT</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F' }}>42</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>FUEL RESERVE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>84%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>ACTIVE SOS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>1</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, color: '#005B7F', fontSize: '1.05rem' }}>BHARATI STATION</div>
                <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>● ONLINE (31/47)</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Larsemann Hills · 69°24′28″S 76°11′14″E</div>
              
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>COMPLEMENT</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F' }}>31</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>FUEL RESERVE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>92%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>ACTIVE SOS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>0</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: EXPEDITIONS ─────────────────────────────────────── */}
      {activeTab === 'expeditions' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>Indian Scientific Expeditions</h3>
            <button
              type="button"
              onClick={() => {
                navigate('/dashboard/expeditions');
                toast.info('Opening Expedition Control Hub...');
              }}
              style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              + Create Expedition
            </button>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(expeditions.length > 0 ? expeditions : [
              { expeditionCode: 'EXP-46', name: '46th Indian Scientific Expedition to Antarctica', season: 'WINTER', year: 2026, status: 'ACTIVE' },
              { expeditionCode: 'EXP-45', name: '45th Indian Scientific Expedition to Antarctica', season: 'SUMMER', year: 2025, status: 'COMPLETED' },
              { expeditionCode: 'EXP-44', name: '44th Indian Scientific Expedition to Antarctica', season: 'WINTER', year: 2024, status: 'COMPLETED' },
            ]).map((exp) => (
              <div key={exp.expeditionCode} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#005B7F', fontSize: '0.95rem' }}>{exp.expeditionCode}</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{exp.name}</span>
                    <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{exp.season}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Year: {exp.year} · Stations: Maitri &amp; Bharati</div>
                </div>
                <span style={{ backgroundColor: exp.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9', color: exp.status === 'ACTIVE' ? '#15803D' : '#64748B', border: `1px solid ${exp.status === 'ACTIVE' ? '#86EFAC' : '#CBD5E1'}`, padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>
                  ● {exp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PERSONNEL READINESS ─────────────────────────────── */}
      {activeTab === 'personnel' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>
              Personnel Readiness &amp; Deployment Roster
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
              HQ Operational clearance status: Shows Profile Completeness &amp; Medical Clearance Status (Private medical records protected).
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Personnel</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Role &amp; Station</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Profile Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Medical Clearance</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Deployment Readiness</th>
                </tr>
              </thead>
              <tbody>
                {(personnel.length > 0 ? personnel : [
                  { _id: '1', name: 'Dr. Vikram Seth', role: 'SCIENTIST', station: 'Maitri Station', profileStatus: 'COMPLETED', medicalClearance: 'FIT', readinessStatus: 'READY_FOR_DEPLOYMENT' },
                  { _id: '2', name: 'Capt. Suresh Rawat', role: 'STATION_COMMANDER', station: 'Bharati Station', profileStatus: 'COMPLETED', medicalClearance: 'FIT', readinessStatus: 'READY_FOR_DEPLOYMENT' },
                  { _id: '3', name: 'Dr. Tanmay Singh', role: 'SCIENTIST', station: 'Bharati Station', profileStatus: 'INCOMPLETE', medicalClearance: 'PENDING_CLEARANCE', readinessStatus: 'PENDING_PROFILE' },
                ]).map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.employeeId || 'ID: Active'} · {p.organization || 'NCPOR'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#005B7F' }}>{p.role}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.station}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: p.profileStatus === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                        color: p.profileStatus === 'COMPLETED' ? '#15803D' : '#92400E',
                        border: `1px solid ${p.profileStatus === 'COMPLETED' ? '#86EFAC' : '#FDE68A'}`
                      }}>
                        {p.profileStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: p.medicalClearance === 'FIT' ? '#DCFCE7' : '#FEE2E2',
                        color: p.medicalClearance === 'FIT' ? '#15803D' : '#991B1B',
                        border: `1px solid ${p.medicalClearance === 'FIT' ? '#86EFAC' : '#FECACA'}`
                      }}>
                        {p.medicalClearance === 'FIT' ? '✓ CLEARED (FIT)' : '⏳ PENDING REVIEW'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
                        backgroundColor: p.readinessStatus === 'READY_FOR_DEPLOYMENT' ? '#EFF6FF' : '#FFF7ED',
                        color: p.readinessStatus === 'READY_FOR_DEPLOYMENT' ? '#1D4ED8' : '#C2410C',
                        border: `1px solid ${p.readinessStatus === 'READY_FOR_DEPLOYMENT' ? '#BFDBFE' : '#FFEDD5'}`
                      }}>
                        {p.readinessStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CARGO COMMAND ───────────────────────────────────── */}
      {activeTab === 'cargo' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>Cargo Shipments &amp; Manifest Command</h3>
            <button
              type="button"
              onClick={() => navigate('/dashboard/cargo')}
              style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Open Full Cargo Log →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>Manifest SHP-2026-001 (ORV Sagar Nidhi)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Route: Goa Port → Cape Town → Bharati</div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginTop: '0.4rem' }}>Status: IN_TRANSIT (ETA 15 Nov 2026)</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>Manifest SHP-2026-002 (Air Bridge Resupply)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Route: Cape Town Airport → ALCI Blue Ice Runway → Maitri</div>
              <div style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600, marginTop: '0.4rem' }}>Status: STAGING_AT_PORT</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: CROSS-STATION INVENTORY ─────────────────────────── */}
      {activeTab === 'inventory' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>Cross-Station Inventory &amp; Critical Stock Alerts</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>Authorizing inter-station transfers between Maitri &amp; Bharati.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/inventory')}
              style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Open Inventory Module →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#c2410c' }}>[CRITICAL] Jet A-1 Aviation Turbine Fuel</strong> (Maitri Station)
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Current stock: 2,400 L · Minimum threshold: 5,000 L</div>
              </div>
              <button style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Authorize Transfer
              </button>
            </div>
            <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#b91c1c' }}>[LOW] Piston Bully Hydraulic Spares</strong> (Bharati Station)
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Current stock: 2 Sets · Minimum threshold: 5 Sets</div>
              </div>
              <button style={{ backgroundColor: '#b91c1c', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Dispatch from Goa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: EMERGENCY & SOS ─────────────────────────────────── */}
      {activeTab === 'emergency' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #fecaca', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#B91C1C', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined">emergency</span>
                Live Emergency Command &amp; Incident Triage
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>Active Antarctic distress incidents requiring HQ command coordination.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/sos')}
              style={{ backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Enter Incident Room
            </button>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#fff5f5', borderRadius: '6px', borderLeft: '4px solid #B91C1C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#B91C1C' }} />
                <span style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.9rem' }}>SOS-2026-003 — Medical Emergency (Maitri Station)</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>
                Personnel P1023 experiencing acute respiratory symptoms during field test. Medical officer on scene.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/sos')}
              style={{ backgroundColor: '#B91C1C', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Coordinate Response
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default HQCommandDashboard;
