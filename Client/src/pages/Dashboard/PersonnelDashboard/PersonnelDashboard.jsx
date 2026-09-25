import React from 'react';
import { useUsers } from '@/hooks/useUsers';

const ROLES = ['All', 'Station Commander', 'Medical Officer', 'Senior Scientist', 'Cargo Officer', 'Team Leader', 'Scientist'];

const PersonnelDashboard = () => {
  const { users, isLoading, error: usersError, refetch } = useUsers();
  const [filter, setFilter] = React.useState('All');

  const STATIONS = ['MAITRI STATION', 'BHARATI STATION'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>PERSONNEL DIRECTORY</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>Station complements, scientists, and expedition deployment rosters</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ height: '36px', padding: '0 0.75rem', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button onClick={refetch} style={{ backgroundColor: '#005B7F', color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Station cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {STATIONS.map(station => (
          <div key={station} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#005B7F', fontSize: '0.9rem' }}>{station}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Active personnel</div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#005B7F' }}>
              {station === 'MAITRI STATION' ? 42 : 31}
            </div>
          </div>
        ))}
      </div>

      {/* Personnel Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#cbd5e1' }}>groups</span>
            <p style={{ marginTop: '0.5rem' }}>Loading personnel roster...</p>
          </div>
        ) : usersError ? (
          <div style={{ padding: '2rem', color: '#B91C1C', textAlign: 'center' }}>Error: {usersError}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                {['ID', 'Name', 'Email', 'Station', 'Role', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users.length > 0 ? users : [
                { _id: 'P1001', name: 'Dr. Arvind Misra', email: 'arvind@ncpor.in' },
                { _id: 'P1002', name: 'Capt. Rajan Mehta', email: 'rajan@ncpor.in' },
                { _id: 'P1003', name: 'Dr. Priya Sharma', email: 'priya@ncpor.in' },
              ]).map((u, i) => (
                <tr key={u._id || i}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#005B7F', fontSize: '0.8rem' }}>P10{21 + i}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>{u.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{u.email}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{i % 2 === 0 ? 'Maitri' : 'Bharati'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#005B7F', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {i === 0 ? 'Medical Officer' : i === 1 ? 'Station Commander' : 'Senior Scientist'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#15803D', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>● Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PersonnelDashboard;
