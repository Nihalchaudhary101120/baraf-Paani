import React, { useState, useEffect } from 'react';
import { useAdminData } from '@/context/AdminContext';

const STATUS_CONFIG = {
  PLANNED: { color: '#0369a1', bg: '#eff6ff', label: 'Planned' },
  IN_PROGRESS: { color: '#16a34a', bg: '#f0fdf4', label: 'In Progress' },
  COMPLETED: { color: '#475569', bg: '#f8fafc', label: 'Completed' },
  OVERDUE: { color: '#dc2626', bg: '#fef2f2', label: 'OVERDUE' },
  CANCELLED: { color: '#94a3b8', bg: '#f1f5f9', label: 'Cancelled' },
};

const AdminFieldOpsView = () => {
  const { fieldOpsData, fetchFieldOpsData, loading: contextLoading, isInitialized } = useAdminData();
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchFieldOpsData(true);
  }, [fetchFieldOpsData]);

  const data = fieldOpsData;
  const loading = !isInitialized && !data && contextLoading.fieldOps;

  const summary = data?.summary || {};
  const excursions = (data?.excursions || []).filter(e =>
    !filterStatus || e.status === filterStatus
  );

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#15803d' }}>explore</span>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Field Excursion Dispatch & Telemetry</h1>
            <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>READ ONLY</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            Live field excursion dispatch records from all stations. Monitor active, planned, and completed operations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => fetchFieldOpsData(false)} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#15803d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Excursions', value: summary.total ?? 0, color: '#15803d', icon: 'explore' },
          { label: 'Active Now', value: summary.active ?? 0, color: '#0369a1', icon: 'directions_walk' },
          { label: 'Planned', value: summary.planned ?? 0, color: '#d97706', icon: 'schedule' },
          { label: 'Completed', value: summary.completed ?? 0, color: '#475569', icon: 'check_circle' },
          { label: 'Overdue', value: summary.overdue ?? 0, color: '#dc2626', icon: 'warning' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `4px solid ${s.color}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginTop: '0.25rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Excursions Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748B' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '30px', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ marginLeft: '0.75rem' }}>Loading field ops data...</span>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {excursions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>explore</span>
              No field excursions found{filterStatus ? ` with status "${filterStatus}"` : ''}.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                  {['Excursion / Objective', 'Station', 'Type', 'Planned Departure', 'Expected Return', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excursions.map((ex, i) => {
                  const cfg = STATUS_CONFIG[ex.status] || { color: '#64748b', bg: '#f8fafc', label: ex.status };
                  return (
                    <tr key={ex._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{ex.excursionName || ex.objective || `Excursion #${i + 1}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{ex.objective || ''}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{ex.station?.name || ex.station?.code || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{ex.excursionType || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {ex.plannedDepartureTime ? new Date(ex.plannedDepartureTime).toLocaleString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {ex.expectedReturnTime ? new Date(ex.expectedReturnTime).toLocaleString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFieldOpsView;
