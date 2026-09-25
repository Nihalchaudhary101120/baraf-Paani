import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import OfflineWidget from '@/components/common/OfflineWidget/OfflineWidget';

const NAV_ITEMS = [
  { path: '/dashboard', icon: 'space_dashboard', label: 'Dashboard', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'LOGISTICS_OFFICER', 'INVENTORY_MANAGER', 'MEDICAL_OFFICER', 'SCIENTIST', 'Station Commander', 'Cargo Officer', 'Team Leader'] },
  { path: '/dashboard/users', icon: 'manage_accounts', label: 'User Accounts', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER'] },
  { path: '/dashboard/cargo', icon: 'inventory_2', label: 'Cargo', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'LOGISTICS_OFFICER', 'INVENTORY_MANAGER', 'Cargo Officer'] },
  { path: '/dashboard/inventory', icon: 'category', label: 'Inventory', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'INVENTORY_MANAGER', 'LOGISTICS_OFFICER', 'Inventory Manager'] },
  { path: '/dashboard/field', icon: 'explore', label: 'Field Ops', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'SCIENTIST', 'STATION_OPERATOR', 'Team Leader'] },
  { path: '/dashboard/equipment', icon: 'construction', label: 'Equipment', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'INVENTORY_MANAGER', 'STATION_OPERATOR'] },
  { path: '/dashboard/sos', icon: 'emergency', label: 'SOS / Emergency', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'MEDICAL_OFFICER', 'SCIENTIST'], danger: true },
  { path: '/dashboard/personnel', icon: 'groups', label: 'Personnel', roles: ['Admin', 'HQ_ADMIN', 'HQ_COMMAND', 'STATION_COMMANDER', 'MEDICAL_OFFICER'] },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const userRole = user?.role || 'HQ_ADMIN';

  const visibleNav = NAV_ITEMS.filter(item =>
    item.roles.includes(userRole) || userRole === 'Admin' || userRole === 'HQ_ADMIN' || userRole === 'HQ_COMMAND'
  );

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const getUserInitials = () => {
    if (!user?.name) return 'SA';
    return user.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F4F7F9',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── GLOBAL HEADER ────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, left: 0, right: 0,
        height: '60px',
        backgroundColor: '#005B7F',
        zIndex: 1000,
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
          </button>

          <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fff' }}>explore</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.05em', color: '#fff' }}>NIRANTRA</span>
                <span style={{
                  fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace",
                  backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff',
                  padding: '0.05rem 0.35rem', borderRadius: '3px', fontWeight: 600
                }}>v1.3</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(204,251,241,0.8)' }}>
                PS 26062 • NCPOR Polar Operations
              </div>
            </div>
          </div>

          {/* HQ Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.6rem',
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.72rem', color: '#fff',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#99f6e4' }}>location_city</span>
            <span style={{ fontWeight: 600 }}>HQ / NCPOR</span>
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Offline Widget */}
          <OfflineWidget />

          {/* SOS button */}
          <button
            type="button"
            onClick={() => navigate('/dashboard/sos')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.7rem',
              backgroundColor: '#B91C1C',
              color: '#fff',
              borderRadius: '4px',
              border: '1px solid rgba(248,113,113,0.3)',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>emergency</span>
            SOS
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowNotifications(n => !n)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(204,251,241,0.9)', cursor: 'pointer',
                padding: '0.3rem', borderRadius: '4px', display: 'flex',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
              <span style={{
                position: 'absolute', top: '1px', right: '1px',
                width: '15px', height: '15px',
                backgroundColor: '#E65A28', color: '#fff',
                fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>2</span>
            </button>

            {showNotifications && (
              <div
                onClick={() => setShowNotifications(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 1999,
                  backgroundColor: 'transparent',
                }}
              />
            )}
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: '40px',
                width: '320px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid #E2E8F0',
                zIndex: 2000,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#005B7F' }}>Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1rem' }}
                  >✕</button>
                </div>
                <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '4px', borderLeft: '3px solid #B91C1C', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#B91C1C' }}>Medical SOS</strong>: Personnel P1023 at Maitri.
                  </div>
                  <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#fff7ed', borderRadius: '4px', borderLeft: '3px solid #E65A28', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#E65A28' }}>Cargo Discrepancy</strong>: Manifest AL-1403-021 missing 2 packages.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

          {/* User Avatar */}
          <div
            onClick={logout}
            title="Click to Sign Out"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#00425e',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.7rem',
            }}>
              {getUserInitials()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {user?.name || 'System Administrator'}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(204,251,241,0.8)', lineHeight: 1.2 }}>
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────────── */}
        <aside style={{
          width: sidebarCollapsed ? '56px' : '228px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0.5rem 0',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.25rem 0' }}>
            {!sidebarCollapsed && (
              <div style={{
                padding: '0.4rem 1rem 0.3rem',
                fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Operations
              </div>
            )}
            {visibleNav.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  title={sidebarCollapsed ? item.label : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: sidebarCollapsed ? '0.65rem' : '0.6rem 1rem',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    borderLeft: active ? '3px solid #005B7F' : '3px solid transparent',
                    backgroundColor: active ? '#f0fdfa' : 'transparent',
                    color: active ? '#005B7F' : item.danger ? '#B91C1C' : '#374151',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '20px', flexShrink: 0 }}
                  >
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {!sidebarCollapsed && (
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid #E2E8F0',
              fontSize: '0.7rem', color: '#94a3b8',
            }}>
              <div style={{ fontWeight: 600, color: '#64748B' }}>Nirantra v1.3</div>
              <div>MoES • Govt. of India</div>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: '1.5rem 2rem',
          overflowY: 'auto',
          backgroundColor: '#F4F7F9',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
