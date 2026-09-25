import React, { useState, useEffect } from 'react';
import { useAdminData } from '@/context/AdminContext';

const CLEARANCE_COLOR = {
  FIT: '#16a34a',
  FIT_WITH_RESTRICTIONS: '#d97706',
  NOT_FIT: '#dc2626',
  PENDING: '#64748b',
};

const AdminMedicalView = () => {
  const { medicalData, fetchMedicalData, loading: contextLoading, isInitialized } = useAdminData();
  const [filterStatus, setFilterStatus] = useState('');
  const [tab, setTab] = useState('assessments'); // 'assessments' | 'training'

  useEffect(() => {
    fetchMedicalData(filterStatus ? { status: filterStatus } : {}, true);
  }, [filterStatus, fetchMedicalData]);

  const data = medicalData;
  const loading = !isInitialized && !data && contextLoading.medical;

  const assessments = data?.assessments || [];
  const trainings = data?.trainings || [];

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#0891b2' }}>medical_information</span>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Medical & Training Records</h1>
            <span style={{ backgroundColor: '#f0f9ff', color: '#0891b2', border: '1px solid #bae6fd', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>READ ONLY</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
            View-only access to personnel medical assessments and training records. No edits permitted at this access level.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', color: '#374151', cursor: 'pointer' }}
          >
            <option value="">All Clearance Status</option>
            <option value="FIT">FIT</option>
            <option value="FIT_WITH_RESTRICTIONS">FIT with Restrictions</option>
            <option value="NOT_FIT">NOT FIT</option>
            <option value="PENDING">PENDING</option>
          </select>
          <button onClick={() => fetchMedicalData(filterStatus ? { status: filterStatus } : {}, false)} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#0891b2', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Assessments', value: assessments.length, color: '#0891b2', icon: 'fact_check' },
          { label: 'FIT', value: assessments.filter(a => a.clearance?.status === 'FIT').length, color: '#16a34a', icon: 'check_circle' },
          { label: 'Pending Clearance', value: assessments.filter(a => !a.clearance?.status || a.clearance?.status === 'PENDING').length, color: '#d97706', icon: 'pending' },
          { label: 'Not Fit', value: assessments.filter(a => a.clearance?.status === 'NOT_FIT').length, color: '#dc2626', icon: 'cancel' },
          { label: 'Training Records', value: trainings.length, color: '#7c3aed', icon: 'school' },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `4px solid ${s.color}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginTop: '0.25rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #E2E8F0' }}>
        {[['assessments', 'Medical Assessments'], ['training', 'Training Records']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.5rem 1.25rem', background: 'none', border: 'none',
              borderBottom: tab === key ? '2px solid #0891b2' : '2px solid transparent',
              marginBottom: '-2px', color: tab === key ? '#0891b2' : '#64748B',
              fontWeight: tab === key ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748B' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '30px', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ marginLeft: '0.75rem' }}>Loading records...</span>
        </div>
      ) : tab === 'assessments' ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {assessments.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>medical_information</span>
              No medical assessments found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                  {['Personnel', 'Role', 'Expedition', 'Exam Date', 'Examining Officer', 'Clearance Status'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => {
                  const person = a.personnelId?.userId;
                  const clearanceStatus = a.clearance?.status || 'PENDING';
                  return (
                    <tr key={a._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{person?.name || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{person?.employeeId || ''}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{person?.role || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {a.expeditionId?.expeditionCode ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.expeditionId.expeditionCode}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {a.examinationDate ? new Date(a.examinationDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{a.examiningOfficer?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem', borderRadius: '99px', fontSize: '0.72rem',
                          fontWeight: 700, backgroundColor: `${CLEARANCE_COLOR[clearanceStatus]}18`,
                          color: CLEARANCE_COLOR[clearanceStatus] || '#64748b'
                        }}>{clearanceStatus.replace(/_/g, ' ')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {trainings.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem' }}>school</span>
              No training records found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                  {['Personnel', 'Training Type', 'Status', 'Completion Date'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainings.map((t, i) => {
                  const person = t.personnelId?.userId;
                  return (
                    <tr key={t._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{person?.name || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{person?.employeeId || ''}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{t.trainingType || t.type || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem',
                          fontWeight: 700, backgroundColor: t.status === 'COMPLETED' ? '#f0fdf4' : '#fff7ed',
                          color: t.status === 'COMPLETED' ? '#16a34a' : '#d97706'
                        }}>{t.status || 'PENDING'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {t.completionDate ? new Date(t.completionDate).toLocaleDateString('en-IN') : '—'}
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

export default AdminMedicalView;
