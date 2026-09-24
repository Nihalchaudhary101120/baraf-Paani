import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { ROUTES } from '@/utils/constants';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { users, isLoading, error: usersError, refetch } = useUsers();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedExpedition, setSelectedExpedition] = useState(null);
  const [sosActive, setSosActive] = useState(true);

  // Demo state for creation form
  const [newExpedition, setNewExpedition] = useState({
    code: 'EXP-47',
    name: 'Expedition 47',
    season: 'SUMMER',
    startDate: '10/10/2026',
    endDate: '20/03/2027',
  });

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    alert(`Expedition ${newExpedition.code} registered successfully!`);
    setActiveTab('expedition-detail');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F4F7F9',
      color: '#0F172A',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      margin: '-2rem 0'
    }}>
      {/* 1. GLOBAL SOLID TEAL APPLICATION HEADER (#005B7F) */}
      <header style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: '#005B7F',
        color: '#ffffff',
        zIndex: 1000,
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* Brand & Nodal Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div
            onClick={() => setActiveTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>explore</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', color: '#ffffff' }}>
                  NIRANTRA
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '0.05rem 0.4rem',
                  borderRadius: '3px',
                  fontWeight: 600
                }}>
                  v1.0
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'rgba(204, 251, 241, 0.8)' }}>
                PS 26062 • NCPOR Polar Operations
              </span>
            </div>
          </div>

          {/* HQ Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            color: '#ffffff'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#99f6e4' }}>location_city</span>
            <span style={{ fontWeight: 600 }}>HQ / NCPOR</span>
          </div>
        </div>

        {/* Header Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Online/Offline Status Indicator */}
          <button
            type="button"
            onClick={handleToggleOnline}
            title="Click to toggle Network Connection State"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: isOnline ? 'rgba(0, 0, 0, 0.2)' : '#FFC000',
              border: isOnline ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #f59e0b',
              color: isOnline ? '#6ee7b7' : '#0F172A',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#b45309'
            }}></span>
            <span>{isOnline ? '● Online' : '⚠ OFFLINE'}</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setShowNotificationModal(!showNotificationModal)}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              color: 'rgba(204, 251, 241, 0.9)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '4px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: '#E65A28',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>2</span>
          </button>

          {/* SOS Trigger Button */}
          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.75rem',
              backgroundColor: '#B91C1C',
              color: '#ffffff',
              borderRadius: '4px',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
            <span>⚠ SOS</span>
          </button>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>

          {/* User Profile */}
          <div
            onClick={logout}
            title="Click to Sign Out"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#00425e',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'DV'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
              {user?.name || user?.email || 'Dr. Vasu'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. OFFLINE WARNING BANNER */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#FFC000',
          color: '#0F172A',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          borderBottom: '1px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cloud_off</span>
            <span>⚠ OFFLINE — Changes are stored locally in IndexedDB and will auto-synchronize.</span>
          </div>
          <button
            type="button"
            onClick={handleToggleOnline}
            style={{
              backgroundColor: '#0F172A',
              color: '#ffffff',
              border: 'none',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Restore Connection
          </button>
        </div>
      )}

      {/* MAIN CONTAINER (Sidebar + Dynamic Main Content) */}
      <div style={{ display: 'flex', flex: 1 }}>
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside style={{
          width: '240px',
          backgroundColor: '#F4F7F9',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0.75rem 0',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <div>
            <div style={{ padding: '0 1rem 0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HQ Operations
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard' },
                { id: 'expeditions', icon: 'calendar_month', label: 'Expeditions' },
                { id: 'cargo', icon: 'inventory_2', label: 'Cargo', badge: '1 Alert', badgeBg: '#fff7ed', badgeColor: '#E65A28' },
                { id: 'inventory', icon: 'category', label: 'Inventory', badge: '🟠 Low', badgeBg: '#fffbeb', badgeColor: '#b45309' },
                { id: 'personnel', icon: 'groups', label: 'Personnel' },
                { id: 'emergency', icon: 'emergency', label: 'Emergency', badge: '1 SOS', badgeBg: '#fef2f2', badgeColor: '#B91C1C', textDanger: true },
                { id: 'approvals', icon: 'verified', label: 'Approvals', badge: '2', badgeBg: '#eff6ff', badgeColor: '#005B7F' },
                { id: 'copilot', icon: 'psychology', label: 'Command Copilot', special: true },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      borderLeft: isActive ? '4px solid #005B7F' : '4px solid transparent',
                      backgroundColor: isActive ? '#f0fdfa' : 'transparent',
                      color: isActive ? '#005B7F' : item.textDanger ? '#B91C1C' : '#334155',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span style={{
                        backgroundColor: item.badgeBg,
                        color: item.badgeColor,
                        border: `1px solid ${item.badgeColor}40`,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.5rem',
                        borderRadius: '9999px'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#ffffff', fontSize: '0.75rem', color: '#64748B' }}>
            <div style={{ fontWeight: 600, color: '#0F172A' }}>Nirantra v1.0 • PS 26062</div>
            <div>MoES • Govt. of India</div>
          </div>
        </aside>

        {/* DYNAMIC MAIN VIEW CONTAINER */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', backgroundColor: '#F4F7F9' }}>
          
          {/* VIEW 1: HQ DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', letterSpacing: '-0.01em' }}>
                    HQ COMMAND
                  </h1>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Overview of active polar missions, station complements, and priority alerts.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('expeditions-create')}
                    style={{
                      backgroundColor: '#005B7F',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Create Expedition
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('emergency')}
                    style={{
                      backgroundColor: '#B91C1C',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚠ SOS Center
                  </button>
                </div>
              </div>

              {/* 1. Current Expedition Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Current Expedition</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('expedition-detail')}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #005B7F',
                      color: '#005B7F',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    [VIEW EXPEDITION]
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '1.1rem' }}>EXP-46</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Expedition 46</span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#0F172A', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>WINTER</span>
                    <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Expedition period: <strong style={{ color: '#0F172A' }}>2026 – 2027</strong>
                  </div>
                </div>
              </div>

              {/* 2. Station Status Cards (Maitri & Bharati) */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Station Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {/* Maitri */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#005B7F' }}>MAITRI STATION</span>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>● ACTIVE</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748B' }}>
                      Personnel: <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>42</strong>
                    </div>
                  </div>
                  {/* Bharati */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#005B7F' }}>BHARATI STATION</span>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>● ACTIVE</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748B' }}>
                      Personnel: <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>31</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Operational Status Grid (4 Counters) */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Operational Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div
                    onClick={() => setActiveTab('personnel')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Personnel</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F', marginTop: '0.35rem' }}>73 Active</div>
                  </div>
                  <div
                    onClick={() => setActiveTab('cargo')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Cargo</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>18 Transit</div>
                  </div>
                  <div
                    onClick={() => setActiveTab('inventory')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Inventory</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E65A28', marginTop: '0.35rem' }}>3 Risks</div>
                  </div>
                  <div
                    onClick={() => setActiveTab('emergency')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Emergency</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.35rem' }}>1 Active</div>
                  </div>
                </div>
              </div>

              {/* 4. Critical Alerts */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Critical Alerts</div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                  {/* Alert 1 */}
                  {sosActive && (
                    <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', backgroundColor: '#fff5f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#B91C1C' }}></span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>🔴 Medical SOS — Personnel P1023</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Maitri Station • Medical • Active Emergency</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('emergency')}
                        style={{ backgroundColor: '#B91C1C', color: '#ffffff', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        [RESPOND]
                      </button>
                    </div>
                  )}

                  {/* Alert 2 */}
                  <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#E65A28' }}></span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>🟠 Cargo discrepancy — Manifest AL-1403-021</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Bharati Station • 2 packages missing</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('cargo')}
                      style={{ backgroundColor: '#ffffff', border: '1px solid #005B7F', color: '#005B7F', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      [VIEW]
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Upcoming Operations Schedule */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Upcoming Schedule</div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: '#0F172A' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', width: '60px' }}>18 Oct</span>
                        <span>Ship departure — ORV Sagar Nidhi</span>
                      </div>
                      <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Planned</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: '#0F172A' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', width: '60px' }}>21 Oct</span>
                        <span>Bharati resupply — Helicopter Staging</span>
                      </div>
                      <span style={{ backgroundColor: '#fff7ed', color: '#E65A28', border: '1px solid #ffedd5', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Weather Alert</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: '#0F172A' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#005B7F', width: '60px' }}>02 Nov</span>
                        <span>Personnel deployment — Maitri Inter-Station</span>
                      </div>
                      <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Scheduled</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: EXPEDITIONS LIST VIEW */}
          {activeTab === 'expeditions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F' }}>EXPEDITIONS</h1>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Mission phases schedule, timeline bars, and multi-year expedition registry.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('expeditions-create')}
                  style={{ backgroundColor: '#005B7F', color: '#ffffff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  [+ CREATE]
                </button>
              </div>

              {/* Expeditions Table */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.75rem' }}>Code</th>
                      <th style={{ padding: '0.75rem' }}>Name</th>
                      <th style={{ padding: '0.75rem' }}>Season</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Dates</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }} onClick={() => setActiveTab('expedition-detail')}>
                      <td style={{ padding: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F' }}>EXP-46</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>Expedition 46</td>
                      <td style={{ padding: '0.75rem' }}>WINTER</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', border: '1px solid #bfdbfe', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE</span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748B' }}>2026–27</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button style={{ backgroundColor: '#ffffff', border: '1px solid #005B7F', color: '#005B7F', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>[VIEW]</button>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F' }}>EXP-47</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>Expedition 47</td>
                      <td style={{ padding: '0.75rem' }}>SUMMER</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>PLANNING</span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748B' }}>2027</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button onClick={() => setActiveTab('expeditions-create')} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>[EDIT]</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: EXPEDITION DETAIL */}
          {activeTab === 'expedition-detail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <button onClick={() => setActiveTab('expeditions')} style={{ background: 'none', border: 'none', color: '#005B7F', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  ← Back to Expeditions
                </button>
                <button onClick={() => setActiveTab('expeditions-create')} style={{ backgroundColor: '#ffffff', border: '1px solid #005B7F', color: '#005B7F', padding: '0.35rem 0.85rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  [EDIT EXPEDITION]
                </button>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>Expedition 46</h2>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.85rem', backgroundColor: '#f1f5f9', color: '#005B7F', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>EXP-46</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#0F172A', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>WINTER</span>
                    <span style={{ backgroundColor: '#ecfdf5', color: '#15803D', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Period: 10 Oct 2026 – 20 Mar 2027</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Personnel</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F' }}>42</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Cargo Transit</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>18</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Transport Fleet</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>3</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Incidents</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#B91C1C' }}>1</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CREATE EXPEDITION FORM */}
          {activeTab === 'expeditions-create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F' }}>CREATE EXPEDITION</h1>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Register mission code, season, operational periods, and phase milestones.</p>
                </div>
                <button onClick={() => setActiveTab('expeditions')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Expedition Code *</label>
                    <input
                      type="text"
                      value={newExpedition.code}
                      onChange={(e) => setNewExpedition({ ...newExpedition, code: e.target.value })}
                      required
                      style={{ height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Name *</label>
                    <input
                      type="text"
                      value={newExpedition.name}
                      onChange={(e) => setNewExpedition({ ...newExpedition, name: e.target.value })}
                      required
                      style={{ height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setActiveTab('expeditions')} style={{ backgroundColor: '#ebeef0', color: '#334155', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ backgroundColor: '#005B7F', color: '#ffffff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    Register Expedition
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 5: PERSONNEL DIRECTORY */}
          {activeTab === 'personnel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F' }}>PERSONNEL DIRECTORY</h1>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Station complements, scientists, and expedition deployment rosters.</p>
                </div>
                <button onClick={refetch} style={{ backgroundColor: '#005B7F', color: '#ffffff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Refresh Roster
                </button>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1.25rem' }}>
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Loading personnel list from API...</div>
                ) : usersError ? (
                  <div style={{ color: '#B91C1C', padding: '1rem' }}>Error loading personnel: {usersError}</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        <th style={{ padding: '0.75rem' }}>ID / Code</th>
                        <th style={{ padding: '0.75rem' }}>Name</th>
                        <th style={{ padding: '0.75rem' }}>Email / Contact</th>
                        <th style={{ padding: '0.75rem' }}>Station Assignment</th>
                        <th style={{ padding: '0.75rem' }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? users.map((u, i) => (
                        <tr key={u.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F' }}>P102{i+1}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                          <td style={{ padding: '0.75rem', color: '#64748B' }}>{u.email}</td>
                          <td style={{ padding: '0.75rem' }}>{i % 2 === 0 ? 'MAITRI STATION' : 'BHARATI STATION'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {i === 0 ? 'Medical Officer' : i === 1 ? 'Station Commander' : 'Senior Scientist'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        [
                          { id: 'P1023', name: 'Dr. Vasu', email: 'vasu@ncpor.res.in', station: 'MAITRI', role: 'Medical Officer' },
                          { id: 'P1024', name: 'Commander Rajesh K.', email: 'r.kumar@ncpor.res.in', station: 'BHARATI', role: 'Station Commander' },
                          { id: 'P1025', name: 'Dr. Ananya Sharma', email: 'ananya@ncpor.res.in', station: 'MAITRI', role: 'Glaciologist' },
                        ].map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F' }}>{u.id}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                            <td style={{ padding: '0.75rem', color: '#64748B' }}>{u.email}</td>
                            <td style={{ padding: '0.75rem' }}>{u.station}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{u.role}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* VIEW 6: EMERGENCY SOS CENTER */}
          {activeTab === 'emergency' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#B91C1C' }}>EMERGENCY RESPONSE CENTER</h1>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>High-priority polar SOS alerts, medical evacuation channels, and distress telemetry.</p>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '2px solid #B91C1C', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B91C1C', fontWeight: 800 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>warning</span>
                    <span>ACTIVE EMERGENCY: MEDICAL SOS (P1023)</span>
                  </div>
                  <span style={{ backgroundColor: '#fef2f2', color: '#B91C1C', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>HIGH SEVERITY</span>
                </div>

                <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Personnel P1023 at Maitri Station requested emergency medical consultation regarding acute high-altitude pulmonary distress. Telemedicine channel initialized with Armed Forces Medical College (AFMC), Pune.
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => { alert('Telemedicine encrypted satellite link activated.'); setSosActive(false); }}
                    style={{ backgroundColor: '#B91C1C', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Resolve / Close SOS
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Satellite MEDEVAC dispatch signal broadcasted to Cape Town air link.')}
                    style={{ backgroundColor: '#ebeef0', color: '#0F172A', border: '1px solid #cbd5e1', padding: '0.6rem 1.25rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Initiate MEDEVAC Airlift
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: COMMAND COPILOT AI ASSISTANT */}
          {activeTab === 'copilot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#005B7F' }}>psychology</span>
                  COMMAND COPILOT AI
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Intelligent polar operational assistant for weather forecasting, manifest validation, and satellite telemetry.</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdfa', borderRadius: '6px', border: '1px solid #ccfbf1', fontSize: '0.9rem', color: '#005B7F', lineHeight: 1.5 }}>
                  🤖 <strong>Command Copilot Status:</strong> Connected to NCPOR Polar AI Model v2.4. Ready to query logistics, weather forecasts for Schirmacher Oasis & Larsemann Hills, or vessel ETA.
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Ask Copilot (e.g. What is the current blizzard risk at Maitri?)"
                    style={{ flex: 1, height: '42px', padding: '0 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => alert('Copilot Query: Atmospheric conditions at Maitri are stable with wind speeds under 18 knots.')}
                    style={{ backgroundColor: '#005B7F', color: '#ffffff', border: 'none', padding: '0 1.25rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Ask Copilot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FALLBACK FOR CARGO, INVENTORY, APPROVALS */}
          {['cargo', 'inventory', 'approvals'].includes(activeTab) && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#005B7F', marginBottom: '0.5rem' }}>inventory</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', color: '#005B7F' }}>{activeTab.toUpperCase()} MODULE</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem' }}>Operational records synchronized with NCPOR HQ Database.</p>
            </div>
          )}

        </main>
      </div>

      {/* NOTIFICATIONS MODAL */}
      {showNotificationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNotificationModal(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '400px', padding: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#005B7F' }}>HQ Notifications (2)</span>
              <button onClick={() => setShowNotificationModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', borderLeft: '3px solid #B91C1C' }}>
                <strong style={{ color: '#B91C1C' }}>Medical SOS Alert</strong>: Personnel P1023 requested emergency telemetry.
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#fff7ed', borderRadius: '4px', borderLeft: '3px solid #E65A28' }}>
                <strong style={{ color: '#E65A28' }}>Cargo Discrepancy</strong>: Manifest AL-1403-021 missing 2 packages at Bharati.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
