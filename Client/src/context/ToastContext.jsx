import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info'
};

const TOAST_STYLES = {
  success: {
    borderLeft: '4px solid #10B981',
    iconColor: '#10B981',
    bg: '#ffffff',
    titleColor: '#065f46',
    progressBg: '#10B981'
  },
  error: {
    borderLeft: '4px solid #EF4444',
    iconColor: '#EF4444',
    bg: '#ffffff',
    titleColor: '#991b1b',
    progressBg: '#EF4444'
  },
  warning: {
    borderLeft: '4px solid #F59E0B',
    iconColor: '#F59E0B',
    bg: '#ffffff',
    titleColor: '#92400e',
    progressBg: '#F59E0B'
  },
  info: {
    borderLeft: '4px solid #005B7F',
    iconColor: '#005B7F',
    bg: '#ffffff',
    titleColor: '#005B7F',
    progressBg: '#005B7F'
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const duration = options.duration !== undefined ? options.duration : 3000;
    const title = options.title || (type === 'success' ? 'Success' : type === 'error' ? 'Notice' : type === 'warning' ? 'Warning' : 'System Alert');

    const newToast = {
      id,
      message,
      type,
      title,
      duration
    };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    show: showToast,
    success: (msg, opts) => showToast(msg, 'success', opts),
    error: (msg, opts) => showToast(msg, 'error', opts),
    warning: (msg, opts) => showToast(msg, 'warning', opts),
    info: (msg, opts) => showToast(msg, 'info', opts),
    remove: removeToast
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: '420px',
          width: 'calc(100vw - 2.5rem)',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((t) => {
          const config = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          const icon = TOAST_ICONS[t.type] || 'info';

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: config.bg,
                borderLeft: config.borderLeft,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                backdropFilter: 'blur(8px)'
              }}
            >
              {/* Icon */}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '22px',
                  color: config.iconColor,
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                {icon}
              </span>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: config.titleColor, lineHeight: 1.2 }}>
                    {t.title}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: t.title ? '0.2rem' : 0, lineHeight: 1.35, wordBreak: 'break-word' }}>
                  {t.message}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.1rem 0.2rem',
                  fontSize: '1rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                ✕
              </button>

              {/* 3-Second Visual Progress Indicator */}
              {t.duration > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    backgroundColor: config.progressBg,
                    opacity: 0.35,
                    width: '100%',
                    animation: `toastProgress ${t.duration}ms linear forwards`
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
