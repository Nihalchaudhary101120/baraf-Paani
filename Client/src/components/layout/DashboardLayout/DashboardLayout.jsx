import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import OfflineWidget from '@/components/common/OfflineWidget/OfflineWidget';

// ── Master Navigation Definitions with Role Scoping ─────────────────
const ALL_NAV_ITEMS = [
  // ── HQ_ADMIN Items
  {
    path: '/dashboard',
    icon: 'admin_panel_settings',
    label: 'Admin Overview',
    roles: ['HQ_ADMIN'],
    section: 'Administration',
  },
  {
    path: '/dashboard/users',
    icon: 'manage_accounts',
    label: 'User Accounts',
    roles: ['HQ_ADMIN'],
    section: 'Administration',
  },
  {
    path: '/dashboard/stations',
    icon: 'location_city',
    label: 'Polar Stations',
    roles: ['HQ_ADMIN', 'HQ_COMMAND', 'LOGISTICS_OFFICER', 'STATION_COMMANDER'],
    section: 'Administration',
  },
  {
    path: '/dashboard/devices',
    icon: 'devices',
    label: 'Device Registry',
    roles: ['HQ_ADMIN'],
    section: 'Administration',
  },

  // ── HQ_ADMIN Expedition Management (primary power)
  {
    path: '/dashboard/expeditions',
    icon: 'flag',
    label: 'Expedition Control',
    roles: ['HQ_ADMIN'],
    section: 'Expedition Ops',
  },
  {
    path: '/dashboard/personnel',
    icon: 'badge',
    label: 'Personnel Roster',
    roles: ['HQ_ADMIN'],
    section: 'Expedition Ops',
  },

  // ── HQ_ADMIN Read-only Operational Views
  {
    path: '/dashboard/admin-medical',
    icon: 'medical_information',
    label: 'Medical Records',
    roles: ['HQ_ADMIN'],
    section: 'Operational Views',
    readOnly: true,
  },
  {
    path: '/dashboard/admin-cargo',
    icon: 'local_shipping',
    label: 'Cargo & Checkpoints',
    roles: ['HQ_ADMIN'],
    section: 'Operational Views',
    readOnly: true,
  },
  {
    path: '/dashboard/admin-field',
    icon: 'explore',
    label: 'Field Excursions',
    roles: ['HQ_ADMIN'],
    section: 'Operational Views',
    readOnly: true,
  },
  {
    path: '/dashboard/admin-inventory',
    icon: 'inventory_2',
    label: 'Inventory Status',
    roles: ['HQ_ADMIN'],
    section: 'Operational Views',
    readOnly: true,
  },

  // ── HQ_COMMAND & Operations Items
  {
    path: '/dashboard',
    icon: 'radar',
    label: 'Command Center',
    roles: ['HQ_COMMAND', 'LOGISTICS_OFFICER', 'STATION_COMMANDER'],
    section: 'Operations',
  },
  {
    path: '/dashboard/expeditions',
    icon: 'flag',
    label: 'Expeditions',
    roles: ['HQ_COMMAND', 'STATION_COMMANDER'],
    section: 'Operations',
  },
  {
    path: '/dashboard/personnel',
    icon: 'badge',
    label: 'Personnel Readiness',
    roles: ['HQ_COMMAND', 'STATION_COMMANDER', 'MEDICAL_OFFICER'],
    section: 'Operations',
  },
  {
    path: '/dashboard/cargo',
    icon: 'local_shipping',
    label: 'Cargo Pipeline',
    roles: ['HQ_COMMAND', 'LOGISTICS_OFFICER', 'STATION_COMMANDER', 'INVENTORY_MANAGER', 'SHIP_OFFICER'],
    section: 'Operations',
  },
  {
    path: '/dashboard/inventory',
    icon: 'inventory_2',
    label: 'Inventory Stock',
    roles: ['HQ_COMMAND', 'LOGISTICS_OFFICER', 'STATION_COMMANDER', 'INVENTORY_MANAGER'],
    section: 'Operations',
  },
  {
    path: '/dashboard/field',
    icon: 'explore',
    label: 'Field Ops',
    roles: ['HQ_COMMAND', 'STATION_COMMANDER', 'STATION_OPERATOR', 'SCIENTIST'],
    section: 'Field Operations',
  },
  {
    path: '/dashboard/equipment',
    icon: 'construction',
    label: 'Equipment Pool',
    roles: ['HQ_COMMAND', 'STATION_COMMANDER', 'INVENTORY_MANAGER', 'STATION_OPERATOR', 'SCIENTIST'],
    section: 'Field Operations',
  },
  {
    path: '/dashboard/sos',
    icon: 'emergency',
    label: 'SOS / Emergency',
    roles: ['HQ_COMMAND', 'STATION_COMMANDER', 'SCIENTIST', 'STATION_OPERATOR'],
    danger: true,
    section: 'Emergency',
  },
];

const MEDICAL_OFFICER_NAV = [
  {
    path: '/dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    section: 'MAIN',
  },
  {
    path: '/dashboard?tab=personnel',
    icon: 'group',
    label: 'Personnel & Assessments',
    section: 'PERSONNEL',
  },
  {
    path: '/dashboard?tab=pending',
    icon: 'pending_actions',
    label: 'Pending Examinations',
    section: 'PERSONNEL',
  },
  {
    path: '/dashboard?tab=clearances',
    icon: 'verified_user',
    label: 'Medical Clearances',
    section: 'CLEARANCE',
  },
  {
    path: '/dashboard?tab=reports',
    icon: 'summarize',
    label: 'Medical Reports',
    section: 'REPORTS',
  },
  {
    path: '/dashboard?tab=history',
    icon: 'history',
    label: 'Medical History',
    section: 'REPORTS',
  },
  {
    path: '/dashboard?tab=alerts',
    icon: 'crisis_alert',
    label: 'Medical Alerts',
    section: 'ALERTS',
  },
  {
    path: '/dashboard/sos',
    icon: 'emergency',
    label: 'SOS / Emergency',
    danger: true,
    section: 'EMERGENCY',
  },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const userRole = user?.role || 'HQ_ADMIN';

  // Dedicated navigation for Medical Officer vs Role-filtered for other roles
  const visibleNav = userRole === 'MEDICAL_OFFICER'
    ? MEDICAL_OFFICER_NAV
    : ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const isActive = (path) => {
    if (userRole === 'MEDICAL_OFFICER') {
      const currentFull = location.pathname + location.search;
      if (path === '/dashboard') {
        return location.pathname === '/dashboard' && (!location.search || location.search === '?tab=overview');
      }
      return currentFull === path;
    }
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const getUserInitials = () => {
    if (!user?.name) return 'MO';
    return user.name.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
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
        {/* Brand & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
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

          {/* Role Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.6rem',
            backgroundColor: userRole === 'HQ_ADMIN' ? 'rgba(29, 78, 216, 0.4)' : userRole === 'HQ_COMMAND' ? 'rgba(21, 128, 61, 0.4)' : 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '0.72rem', color: '#fff',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#99f6e4' }}>
              {userRole === 'HQ_ADMIN' ? 'admin_panel_settings' : userRole === 'HQ_COMMAND' ? 'radar' : 'badge'}
            </span>
            <span style={{ fontWeight: 700 }}>{userRole}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Offline Sync Widget */}
          <OfflineWidget />

          {/* SOS button for operational roles */}
          {userRole !== 'HQ_ADMIN' && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/sos')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.3rem 0.7rem',
                backgroundColor: '#B91C1C', color: '#fff',
                borderRadius: '4px', border: '1px solid rgba(248,113,113,0.3)',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>emergency</span>
              SOS
            </button>
          )}

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowNotifications((n) => !n)}
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
                style={{ position: 'fixed', inset: 0, zIndex: 1999, backgroundColor: 'transparent' }}
              />
            )}
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: '40px', width: '320px',
                backgroundColor: '#fff', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0',
                zIndex: 2000, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#005B7F' }}>Live Operational Feeds</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1rem' }}
                  >✕</button>
                </div>
                <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '4px', borderLeft: '3px solid #B91C1C', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#B91C1C' }}>Medical SOS:</strong> Personnel P1023 at Maitri Base.
                  </div>
                  <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#fff7ed', borderRadius: '4px', borderLeft: '3px solid #E65A28', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#E65A28' }}>Supply Alert:</strong> Fuel threshold low at Maitri.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

          {/* User Profile / Logout */}
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
                {user?.name || 'Administrator'}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(204,251,241,0.8)', lineHeight: 1.2 }}>
                Sign Out
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────────── */}
        <aside style={{
          width: sidebarCollapsed ? '56px' : '230px',
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
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.25rem 0', overflowY: 'auto', flex: 1 }}>
            {(() => {
              let lastSection = null;
              return visibleNav.map((item) => {
                const active = isActive(item.path);
                const showHeading = !sidebarCollapsed && item.section !== lastSection;
                lastSection = item.section;
                return (
                  <React.Fragment key={item.label}>
                    {showHeading && (
                      <div style={{
                        padding: '0.6rem 1rem 0.25rem',
                        fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        marginTop: '0.25rem',
                      }}>
                        {item.section}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      title={sidebarCollapsed ? item.label : ''}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: sidebarCollapsed ? '0.65rem' : '0.55rem 1rem',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        borderLeft: active ? '3px solid #005B7F' : '3px solid transparent',
                        backgroundColor: active ? '#f0fdfa' : 'transparent',
                        color: active ? '#005B7F' : item.danger ? '#B91C1C' : item.readOnly ? '#6366f1' : '#374151',
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.82rem',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <span style={{ flex: 1 }}>{item.label}</span>
                      )}
                      {!sidebarCollapsed && item.readOnly && (
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, color: '#6366f1',
                          backgroundColor: '#eef2ff', padding: '0.1rem 0.35rem',
                          borderRadius: '3px', letterSpacing: '0.04em',
                        }}>VIEW</span>
                      )}
                    </button>
                  </React.Fragment>
                );
              });
            })()}
          </nav>

          {/* Sidebar Footer */}
          {!sidebarCollapsed && (
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid #E2E8F0',
              fontSize: '0.7rem', color: '#94a3b8',
            }}>
              <div style={{ fontWeight: 600, color: '#64748B' }}>Nirantra Polar v1.3</div>
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
