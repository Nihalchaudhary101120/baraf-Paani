import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { ROUTES } from '@/utils/constants';

const StationPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();

  const [currentStation, setCurrentStation] = useState({
    code: 'STN-01',
    name: 'MAITRI STATION',
    coords: '70°45′S 11°44′E (Schirmacher Oasis)',
    type: 'Inland Base',
    personnel: 42,
  });

  const [showStationMenu, setShowStationMenu] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(true);
  const [sosActive, setSosActive] = useState(true);
  const [inventorySearch, setInventorySearch] = useState('');

  const stationsList = [
    {
      code: 'STN-01',
      name: 'MAITRI STATION',
      coords: '70°45′S 11°44′E • Schirmacher Oasis',
      badge: 'PRIMARY',
      personnel: 42,
    },
    {
      code: 'STN-02',
      name: 'BHARATI STATION',
      coords: '69°24′S 76°11′E • Larsemann Hills',
      badge: 'ACTIVE',
      personnel: 31,
    },
  ];

  const handleSelectStation = (stn) => {
    setCurrentStation({
      code: stn.code,
      name: stn.name,
      coords: stn.coords,
      type: stn.code === 'STN-01' ? 'Inland Base' : 'Coastal Base',
      personnel: stn.personnel,
    });
    setShowStationMenu(false);
  };

  const inventoryItems = [
    { code: 'FUEL-01', name: 'Polar Grade Arctic Diesel ATF', qty: '8,400 L', lot: 'D-2025-TANK-A', expiry: 'INDEFINITE', status: 'NORMAL (28d)', statusColor: '#059669', bg: '#ecfdf5' },
    { code: 'FOOD-23', name: 'High-Calorie Freeze-Dried Rations', qty: '84 Units', lot: 'F-2026-08', expiry: '12/11/2026', status: '🟠 LOW (9d)', statusColor: '#E65A28', bg: '#fff4ed', isAlert: true },
    { code: 'MED-08', name: 'Emergency Hypothermia Antidote Kits', qty: '42 Units', lot: 'M-982-LOT4', expiry: '05/03/2027', status: 'NORMAL (35d)', statusColor: '#059669', bg: '#ecfdf5' },
    { code: 'FOOD-31', name: 'Fortified Electrolyte Rations', qty: '120 Units', lot: 'F-31-POW-2', expiry: '19/08/2027', status: 'NORMAL', statusColor: '#059669', bg: '#ecfdf5' },
  ];

  const filteredInventory = inventoryItems.filter(item =>
    item.code.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

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
      {/* 1. TOP HEADER MASTHEAD */}
      <header style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: '#005B7F',
        color: '#ffffff',
        zIndex: 1000,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Left: Identity & Station Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate(ROUTES.HOME)}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>ac_unit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff', letterSpacing: '-0.01em' }}>NIRANTRA</span>
                <span style={{
                  fontSize: '0.65rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  backgroundColor: '#00425E',
                  color: '#bae6fd',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '3px',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  v1.0-OPS
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#bae6fd', textTransform: 'uppercase' }}>
                NCPOR POLAR EXPEDITION PLATFORM
              </span>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>

          {/* Station Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowStationMenu(!showStationMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: '#00425E',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}></span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ffffff' }}>{currentStation.name}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#bae6fd' }}>arrow_drop_down</span>
                </div>
                <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#bae6fd' }}>{currentStation.coords}</span>
              </div>
            </button>

            {showStationMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.5rem',
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                border: '1px solid #e2e8f0',
                zIndex: 2000,
                padding: '0.35rem 0'
              }}>
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyBetween: 'space-between' }}>
                  <span>STATION REGISTRY</span>
                  <span style={{ color: '#E65A28' }}>NCPOR SATELLITE LINK</span>
                </div>
                {stationsList.map((stn) => (
                  <button
                    key={stn.code}
                    type="button"
                    onClick={() => handleSelectStation(stn)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.65rem 1rem',
                      border: 'none',
                      backgroundColor: currentStation.code === stn.code ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{stn.name}</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>{stn.coords}</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: stn.code === 'STN-01' ? '#d1fae5' : '#e0f2fe', color: stn.code === 'STN-01' ? '#065f46' : '#0369a1', fontWeight: 700 }}>
                      {stn.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Live Sync Connectivity */}
          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#00425E',
              border: '1px solid rgba(255,255,255,0.25)',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#34d399' : '#f59e0b' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#ffffff' }}>
                {isOnline ? '● ONLINE' : '⚠ OFFLINE'}
              </span>
              <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#bae6fd', marginTop: '2px' }}>
                {isOnline ? 'GSAT-7A SYNCED' : 'LOCAL BUFFER'}
              </span>
            </div>
          </button>

          {/* SOS Dispatch CTA */}
          <button
            type="button"
            onClick={() => setActiveView('emergency')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#B91C1C',
              color: '#ffffff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(248, 113, 113, 0.4)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>crisis_alert</span>
            <span>SOS DISPATCH</span>
          </button>

          {/* Notifications Badge */}
          <button
            type="button"
            onClick={() => setActiveView('emergency')}
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#00425E',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#E65A28',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #005B7F'
            }}>2</span>
          </button>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: 'rgba(0, 66, 94, 0.85)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '4px', backgroundColor: '#00283b', color: '#bae6fd', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              PS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>Dr. P. Sen</span>
              <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#bae6fd' }}>Station Leader • 44th ISEA</span>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div style={{ backgroundColor: '#FFC000', color: '#0F172A', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud_off</span>
            <span>⚠ OFFLINE MODE ACTIVE: Operations stored in station SQLite buffer. Auto-sync engages on link reacquisition.</span>
          </div>
          <button onClick={() => setIsOnline(true)} style={{ backgroundColor: '#0F172A', color: '#ffffff', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
            FORCE RECONNECT
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR NAVIGATION */}
        <aside style={{
          width: '240px',
          backgroundColor: '#F4F7F9',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1rem 0',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <div>
            <div style={{ padding: '0 1rem 0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between' }}>
              <span>STATION NAVIGATION</span>
              <span style={{ backgroundColor: '#cbd5e1', color: '#334155', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{currentStation.code}</span>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[
                { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard (4.1)' },
                { id: 'inventory', icon: 'inventory_2', label: 'Inventory & Stock', badge: '3 Low', badgeBg: '#ffedd5', badgeColor: '#E65A28' },
                { id: 'health', icon: 'vital_signs', label: 'Supply Health (4.6)', badge: 'Alert', badgeBg: '#fff7ed', badgeColor: '#E65A28' },
                { id: 'personnel', icon: 'badge', label: 'Personnel & Duty', badge: '1 Overdue', badgeBg: '#fee2e2', badgeColor: '#b91c1c' },
                { id: 'cargo', icon: 'local_shipping', label: 'Cargo Receiving', badge: '2 Pending', badgeBg: '#e0f2fe', badgeColor: '#005B7F' },
                { id: 'emergency', icon: 'emergency', label: 'Emergency Center', badge: '1 SOS', badgeBg: '#dc2626', badgeColor: '#ffffff', isDanger: true },
                { id: 'sync', icon: 'sync_problem', label: 'Synchronization', badge: '1 Retry', badgeBg: '#ffedd5', badgeColor: '#9a3412' },
              ].map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      borderLeft: isActive ? '4px solid #005B7F' : '4px solid transparent',
                      backgroundColor: isActive ? '#E6F3F8' : 'transparent',
                      color: isActive ? '#005B7F' : item.isDanger ? '#b91c1c' : '#334155',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.85rem',
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
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#ffffff', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 700, color: '#0F172A' }}>MoES / NCPOR GOVT. OF INDIA</div>
            <div style={{ color: '#64748B', fontSize: '0.7rem' }}>National Polar Research Wing</div>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', backgroundColor: '#F4F7F9' }}>
          
          {/* Ambient Weather Telemetry Strip */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: '#005B7F' }}>
                {currentStation.name} POLAR BASE
              </span>
              <span style={{ color: '#cbd5e1' }}>/</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                {activeView === 'dashboard' ? 'Station Dashboard (4.1)' : activeView.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                Temp: <strong style={{ color: '#0F172A' }}>-24.6°C</strong>
              </div>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                Wind: <strong style={{ color: '#0F172A' }}>38 kt WNW</strong>
              </div>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                Baro: <strong style={{ color: '#0F172A' }}>984.2 hPa</strong>
              </div>
              <span style={{ backgroundColor: '#e0f2fe', color: '#005B7F', border: '1px solid #bae6fd', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                {currentStation.coords.split('•')[0]}
              </span>
            </div>
          </div>

          {/* VIEW 1: STATION DASHBOARD (4.1) */}
          {activeView === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              
              {/* Dual Critical Incident Banners */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                {/* SOS Triage Banner */}
                {sosActive && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    borderLeft: '4px solid #B91C1C',
                    borderTop: '1px solid #fecaca',
                    borderRight: '1px solid #fecaca',
                    borderBottom: '1px solid #fecaca',
                    borderRadius: '0 8px 8px 0',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '28px', shrink: 0 }}>crisis_alert</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#450a0a' }}>CRITICAL ALARM: SOS P1023</h4>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#dc2626', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                            Field Excursion 04
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '0.25rem', lineHeight: 1.4 }}>
                          Dr. M. Patel reported severe hypothermia symptoms during Schirmacher Oasis core sampling.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('emergency')}
                      style={{ backgroundColor: '#B91C1C', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      RESPOND NOW
                    </button>
                  </div>
                )}

                {/* Supply Risk Banner (Warm Orange #E65A28) */}
                <div style={{
                  backgroundColor: '#FFF4ED',
                  borderLeft: '4px solid #E65A28',
                  borderTop: '1px solid #fed7aa',
                  borderRight: '1px solid #fed7aa',
                  borderBottom: '1px solid #fed7aa',
                  borderRadius: '0 8px 8px 0',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: '#E65A28', fontSize: '22px' }}>warning</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#431407' }}>SUPPLY COMPROMISE: Food-23</h4>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#E65A28', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                          Low Stock (84 U)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#7c2d12', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        Depletion threshold reached (<strong style={{ color: '#9a3412' }}>9-day runway</strong>). Air bridge delayed 18 hrs due to blizzard.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('inventory')}
                    style={{ backgroundColor: '#E65A28', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    VIEW ITEM
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {/* Base Operations */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Base Operations</span>
                    <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                      ACTIVE OPS
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F' }}>{currentStation.name.split(' ')[0]}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>Central Antarctic Plateau Sector</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <span>Baro: 984.2 hPa</span>
                    <span style={{ color: '#005B7F', fontWeight: 700 }}>SECTOR 1A</span>
                  </div>
                </div>

                {/* Crew Roster */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Crew Roster</span>
                    <button onClick={() => setActiveView('personnel')} style={{ background: 'none', border: 'none', color: '#005B7F', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      View Roster →
                    </button>
                  </div>
                  <div>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A' }}>{currentStation.personnel}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '0.5rem' }}>Present at Station</span>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <span>Away / Field: <strong>6</strong></span>
                    <span style={{ backgroundColor: '#fff4ed', color: '#E65A28', border: '1px solid #fed7aa', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>1 Overdue</span>
                  </div>
                </div>

                {/* Stock Reserves (Tertiary Accent Highlight #E65A28) */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fed7aa', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#E65A28' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Stock Reserves</span>
                    <button onClick={() => setActiveView('inventory')} style={{ background: 'none', border: 'none', color: '#005B7F', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      Audit →
                    </button>
                  </div>
                  <div>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#E65A28' }}>3</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '0.5rem' }}>Low Stock SKUs</span>
                  </div>
                  <div style={{ backgroundColor: '#fff4ed', border: '1px solid #ffedd5', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <span>Fuel: 28 Days</span>
                    <span style={{ backgroundColor: '#ffffff', color: '#E65A28', border: '1px solid #fed7aa', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>Food: 9 Days</span>
                  </div>
                </div>

                {/* Incoming Cargo */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Incoming Cargo</span>
                    <button onClick={() => setActiveView('cargo')} style={{ background: 'none', border: 'none', color: '#005B7F', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      Manifests →
                    </button>
                  </div>
                  <div>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#005B7F' }}>4</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '0.5rem' }}>Active Manifests</span>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <span>AL-1403-021</span>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#005B7F', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>In Transit</span>
                  </div>
                </div>
              </div>

              {/* Telemetry Map & Cargo Manifests Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Field Excursion Telemetry */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '22px' }}>explore</span>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>Field Excursion Telemetry & Waypoints</h3>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                      VHF CH-16 LINK
                    </span>
                  </div>

                  <div style={{
                    height: '240px',
                    borderRadius: '10px',
                    background: 'linear-gradient(180deg, rgba(0, 91, 127, 0.08) 0%, rgba(244, 247, 249, 0.8) 100%)',
                    border: '1px solid #cbd5e1',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ backgroundColor: '#ffffff', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", border: '1px solid #e2e8f0', color: '#b91c1c', fontWeight: 700 }}>
                        BEACON ACTIVE: 406.025 MHz
                      </span>
                      <span style={{ backgroundColor: '#ffffff', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", border: '1px solid #e2e8f0' }}>
                        GPS: -70.7672, 11.7340
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #E65A28', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#431407' }}>Excursion 04 (Lake Priyadarshini)</span>
                          <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>OVERDUE</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Personnel: Dr. Patel, S. Singh | Dist: 4.8 km NE</div>
                        <div style={{ fontSize: '0.7rem', color: '#E65A28', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: '0.25rem' }}>
                          Missed check-in: 14:15 UTC
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo Manifests Panel */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: '#005B7F', fontSize: '22px' }}>flight_land</span>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>Air & Sledge Manifests</h3>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        Season 44
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#005B7F' }}>AL-1403-021</span>
                          <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#e0f2fe', color: '#005B7F', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>IN TRANSIT</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>Cape Town Port → Novo Runway</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>24 Packages Total</span>
                          <strong style={{ color: '#0F172A' }}>ETA: Today 18:00 UTC</strong>
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>AL-1403-022</span>
                          <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#e2e8f0', color: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>ARRIVING</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>Novolazarevskaya Blue Ice Runway</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>18 Pkgs (Medical/Food)</span>
                          <strong style={{ color: '#0F172A' }}>ETA: Tomorrow 09:30</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveView('cargo')}
                    style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                  >
                    VIEW ALL MANIFESTS
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: INVENTORY & STOCK MODULE */}
          {activeView === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
              {/* Top Search Controls */}
              <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1 }}>
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search inventory codes, lots, or items..."
                    style={{ flex: 1, minWidth: '220px', height: '38px', padding: '0 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('Dispense / Transaction modal initialized.')}
                  style={{ backgroundColor: '#005B7F', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                  <span>Record Transaction</span>
                </button>
              </div>

              {/* FIFO Depletion Priority Alert Banner */}
              <div style={{ backgroundColor: '#FFF4ED', borderLeft: '4px solid #E65A28', borderTop: '1px solid #fed7aa', borderRight: '1px solid #fed7aa', borderBottom: '1px solid #fed7aa', borderRadius: '0 8px 8px 0', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E65A28', color: '#ffffff', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontWeight: 700, shrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>priority_high</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>FIFO Depletion Priority: Food-23 (Standard Rations)</h4>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#ea580c', color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>LOT: F-2026-08</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.25rem' }}>
                      Batch F-2026-08 expires on <strong style={{ color: '#9a3412' }}>12/11/2026</strong>. Strictly dispense this batch before opening Lot F-2026-09 to prevent winter-over expiry.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('Item Food-23 detailed specification log opened.')}
                  style={{ backgroundColor: '#E65A28', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  VIEW ITEM DETAIL
                </button>
              </div>

              {/* Master Inventory Table */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155', textTransform: 'uppercase' }}>{currentStation.name} Storage Ledger</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>4 MONITORED SKUs</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1.25rem' }}>SKU Code</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category & Description</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Available Qty</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Batch Lot</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Expiry Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.code} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: item.bg }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: item.isAlert ? '#E65A28' : '#005B7F' }}>{item.code}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{item.qty}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", color: '#475569' }}>{item.lot}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>{item.expiry}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: item.statusColor === '#059669' ? '#d1fae5' : '#E65A28', color: item.statusColor === '#059669' ? '#065f46' : '#ffffff' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => toast.success(`Dispense action logged for SKU ${item.code}`)}
                            style={{ backgroundColor: item.isAlert ? '#E65A28' : '#ffffff', color: item.isAlert ? '#ffffff' : '#005B7F', border: item.isAlert ? 'none' : '1px solid #005B7F', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {item.isAlert ? 'Dispense / FIFO' : 'Log Dispense'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: OTHER MODULE PLACEHOLDERS */}
          {['health', 'personnel', 'cargo', 'emergency', 'sync'].includes(activeView) && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#005B7F', marginBottom: '0.5rem' }}>view_module</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', color: '#005B7F' }}>
                {activeView.toUpperCase()} MODULE — {currentStation.name}
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Real-time telemetry and station operations synced with NCPOR Goa HQ Gateway.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StationPage;
