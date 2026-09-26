import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { isValidEmail, isRequired } from '@/utils/validators';
import { ROUTES } from '@/utils/constants';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberDevice: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [simulatedError, setSimulatedError] = useState(null);

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) clearError();
    if (simulatedError) setSimulatedError(null);
  };

  const handleAutoFillDemo = () => {
    setFormData({
      email: 'expedition.ops@ncpor.res.in',
      password: 'NCPOR*2024#Ops',
      rememberDevice: true,
    });
    setFormErrors({});
    if (error) clearError();
    if (simulatedError) setSimulatedError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!isRequired(formData.email)) {
      errors.email = 'User ID / Email is required.';
    } else if (!isValidEmail(formData.email) && !formData.email.includes('ncpor')) {
      errors.email = 'Please enter a valid official email address.';
    }

    if (!isRequired(formData.password)) {
      errors.password = 'Password is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      // Handled in AuthContext error state
    }
  };

  const handleForgotNotice = () => {
    toast.info(
      'Security Notice: Credentials recovery requires cryptographic verification via the Polar Operations Security Administrator (MoES / NCPOR HQ). Contact: sec-ops@ncpor.res.in',
      { duration: 4500 }
    );
  };

  const handleActivationNotice = () => {
    toast.info(
      'Station / Vessel Device Enrollment: Please ensure your security token or hardware key is plugged into this terminal. Dispatching to enrollment gateway.',
      { duration: 4500 }
    );
  };

  const toggleSimulateError = () => {
    if (simulatedError || error) {
      setSimulatedError(null);
      if (error) clearError();
    } else {
      setSimulatedError('Unable to sign in. Please verify your credentials.');
    }
  };

  const activeError = error || simulatedError;

  return (
    <div style={{ width: '100%', backgroundColor: '#f7fafc', minHeight: 'calc(100vh - 112px)', color: '#181c1e', fontFamily: "'Inter', sans-serif" }}>
      {/* Secondary Status Sub-header Bar */}
      <section style={{
        backgroundColor: '#ebeef0',
        borderBottom: '1px solid #c0c7ce',
        padding: '0.5rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justify: 'space-between',
          gap: '0.5rem',
          fontSize: '0.8rem',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: '#005b7f', letterSpacing: '0.05em' }}>NIRANTAR</span>
            <span style={{ color: '#70787e' }}>/</span>
            <span style={{ color: '#40484e', fontWeight: 500 }}>AUTHENTICATION</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.15rem 0.5rem',
              borderRadius: '3px',
              backgroundColor: '#ffdbd0',
              color: '#842500',
              border: '1px solid rgba(116, 32, 0, 0.2)',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#742000', marginRight: '6px' }}></span>
              EXPEDITION GATEWAY
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
              border: '1px solid #c0c7ce',
              fontSize: '0.75rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
              <span style={{ fontWeight: 600, color: '#047857' }}>SYSTEM OPERATIONAL</span>
            </div>
            <span style={{ color: '#c0c7ce' }}>•</span>
            <span style={{ color: '#40484e', fontSize: '0.75rem' }}>NODE: GOA-HQ-GATEWAY</span>
          </div>
        </div>
      </section>

      {/* Login Card Container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        minHeight: 'calc(100vh - 180px)'
      }}>
        <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Main Card */}
          <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(192, 199, 206, 0.8)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top Accent Line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: '#005b7f' }}></div>

            {/* Card Header */}
            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #e0e3e5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#005b7f', letterSpacing: '-0.01em' }}>
                  NIRANTAR
                </span>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '3px',
                  backgroundColor: '#ebeef0',
                  color: '#40484e',
                  border: '1px solid #c0c7ce',
                  fontSize: '0.75rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600
                }}>
                  v3.1
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#181c1e', marginTop: '0.25rem' }}>
                OPERATIONAL PORTAL
              </div>
              <p style={{ fontSize: '0.875rem', color: '#40484e', marginTop: '0.15rem' }}>
                Sign in to continue
              </p>
            </div>

            {/* Dismissible Error / Alert Banner */}
            {activeError && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '4px',
                backgroundColor: '#ffdad6',
                border: '1px solid #ba1a1a',
                color: '#181c1e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '20px', shrink: 0, marginTop: '2px' }}>
                  error
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#93000a', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                    Authentication Alert
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#40484e' }}>
                    {activeError}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSimulatedError(null); if (error) clearError(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#40484e' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Email / User ID Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="govUserId" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#181c1e', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                    User ID / Email
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillDemo}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0a629e',
                      fontSize: '0.75rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Auto-fill Demo
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '18px', color: '#70787e', pointerEvents: 'none' }}>
                    badge
                  </span>
                  <input
                    id="govUserId"
                    name="email"
                    type="text"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. expedition.ops@ncpor.res.in"
                    style={{
                      width: '100%',
                      height: '40px',
                      paddingLeft: '36px',
                      paddingRight: '12px',
                      backgroundColor: '#ffffff',
                      border: formErrors.email ? '1px solid #ba1a1a' : '1px solid #c0c7ce',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      color: '#181c1e',
                      outline: 'none'
                    }}
                  />
                </div>
                {formErrors.email && <span style={{ fontSize: '0.75rem', color: '#ba1a1a' }}>{formErrors.email}</span>}
              </div>

              {/* Password Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="govPassword" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#181c1e', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                    Password
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#70787e', fontFamily: "'JetBrains Mono', monospace" }}>
                    Secured Field
                  </span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '18px', color: '#70787e', pointerEvents: 'none' }}>
                    lock
                  </span>
                  <input
                    id="govPassword"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      height: '40px',
                      paddingLeft: '36px',
                      paddingRight: '40px',
                      backgroundColor: '#ffffff',
                      border: formErrors.password ? '1px solid #ba1a1a' : '1px solid #c0c7ce',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      color: '#181c1e',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title="Toggle password visibility"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#70787e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {formErrors.password && <span style={{ fontSize: '0.75rem', color: '#ba1a1a' }}>{formErrors.password}</span>}
              </div>

              {/* Options: Remember device & Forgot password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    name="rememberDevice"
                    checked={formData.rememberDevice}
                    onChange={handleChange}
                    style={{ width: '16px', height: '16px', accentColor: '#005b7f', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#40484e' }}>Remember this device</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotNotice}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0a629e',
                    fontSize: '0.8rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer'
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#005b7f',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    fontFamily: "'Inter', sans-serif",
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => { if (!isLoading) e.target.style.backgroundColor = '#00425e'; }}
                  onMouseOut={(e) => { if (!isLoading) e.target.style.backgroundColor = '#005b7f'; }}
                >
                  <span style={{ letterSpacing: '0.05em' }}>
                    {isLoading ? 'VERIFYING CREDENTIALS...' : '[ SIGN IN ]'}
                  </span>
                  {!isLoading && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>}
                </button>
              </div>
            </form>

            {/* Statutory Policy Notice */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(192, 199, 206, 0.4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              color: '#40484e'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#70787e', shrink: 0, marginTop: '2px' }}>
                policy
              </span>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#40484e' }}>
                Authorized Nirantar personnel only. Unauthorized access is monitored under the Information Technology Act.
              </p>
            </div>

            {/* Error Preview Toggle (Stitch console tool) */}
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.5rem',
              borderTop: '1px dashed rgba(192, 199, 206, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#70787e'
            }}>
              <span>CONSOLE PREVIEW TOOL</span>
              <button
                type="button"
                onClick={toggleSimulateError}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#742000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  textDecoration: 'underline'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>toggle_on</span>
                <span>Simulate Auth Rejection</span>
              </button>
            </div>
          </div>

          {/* Account Activation Footer Box */}
          <div style={{ width: '100%', marginTop: '1rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#ebeef0',
              border: '1px solid rgba(192, 199, 206, 0.6)',
              fontSize: '0.85rem',
              color: '#40484e'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#742000' }}></span>
              <span>First time deploying on this device?</span>
              <button
                type="button"
                onClick={handleActivationNotice}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0a629e',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <span>[ Activate Account ]</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', marginLeft: '2px' }}>open_in_new</span>
              </button>
            </div>
          </div>

          {/* Institutional Identifier */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#70787e', letterSpacing: '0.05em' }}>
            GoI • MoES • NCPOR PS 26062
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
