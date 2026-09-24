import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '@/utils/constants';

const Header = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrent = (path) => location.pathname === path;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Tier 1: Primary Branding Bar */}
      <div style={{
        height: '64px',
        backgroundColor: '#00425e',
        borderBottom: '1px solid #005b7f',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo & Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#E65A28',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>public</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to={ROUTES.HOME} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  textDecoration: 'none'
                }}>
                  NIRANTAR
                </Link>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#E65A28',
                  color: '#ffffff',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  MoES / NCPOR
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                National Centre for Polar and Ocean Research | Ministry of Earth Sciences, Govt. of India
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>language</span>
              <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>English</span>
            </div>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                  {user.name || user.email}
                </span>
                <button
                  onClick={onLogout}
                  style={{
                    backgroundColor: '#005b7f',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                style={{
                  backgroundColor: '#005b7f',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '0.4rem 1rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#E65A28'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#005b7f'}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tier 2: Secondary Navigation Bar */}
      <div style={{
        height: '48px',
        backgroundColor: 'rgba(0, 66, 94, 0.95)',
        borderBottom: '1px solid #005b7f',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', height: '100%' }}>
            <Link
              to={ROUTES.HOME}
              style={{
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                color: '#ffffff',
                fontWeight: isCurrent(ROUTES.HOME) ? 600 : 400,
                fontSize: '0.875rem',
                textDecoration: 'none',
                borderBottom: isCurrent(ROUTES.HOME) ? '3px solid #E65A28' : '3px solid transparent',
                transition: 'border-color 0.2s ease'
              }}
            >
              Home
            </Link>
            <a
              href="#programme-overview"
              style={{
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 400,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              Indian Antarctic Programme
            </a>
            <a
              href="#expeditions-overview"
              style={{
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 400,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              Expeditions
            </a>
            <a
              href="#stations-overview"
              style={{
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 400,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              Research Stations
            </a>
          </nav>

          <div>
            <button
              onClick={() => navigate(user ? ROUTES.DASHBOARD : ROUTES.LOGIN)}
              style={{
                backgroundColor: '#E65A28',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#742000'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#E65A28'}
            >
              Operational Portal Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func,
};

export default Header;
