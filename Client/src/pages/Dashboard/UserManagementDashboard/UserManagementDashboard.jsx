import React, { useState, useEffect } from 'react';
import { createUserApi, getAdminUsersApi, toggleUserStatusApi } from '@/api/admin.api';
import { getStationsApi } from '@/api/station.api';

// Supported polar roles with human labels and badge styling
const ROLES = [
  { value: 'HQ_ADMIN', label: 'HQ System Administrator', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  { value: 'HQ_COMMAND', label: 'HQ Operations Commander', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  { value: 'LOGISTICS_OFFICER', label: 'Logistics Officer', bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' },
  { value: 'STATION_COMMANDER', label: 'Station Commander', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  { value: 'STATION_OPERATOR', label: 'Station Operator', bg: '#ecfeff', color: '#0e7490', border: '#cffafe' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager', bg: '#fefce8', color: '#a16207', border: '#fef08a' },
  { value: 'MEDICAL_OFFICER', label: 'Medical Officer', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  { value: 'SHIP_OFFICER', label: 'Ship Operations Officer', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  { value: 'FLIGHT_OFFICER', label: 'Flight Operations Officer', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  { value: 'SCIENTIST', label: 'Field Scientist', bg: '#f0fdfa', color: '#0f766e', border: '#ccfbf1' },
];

const UserManagementDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState(null);

  // Form State for User
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    role: 'SCIENTIST',
    designation: '',
    organization: 'NCPOR',
    phone: '',
    stationId: '', // valid ObjectId or empty string for HQ
  });

  const [showPassword, setShowPassword] = useState(false);

  // Fetch users & stations from MongoDB APIs
  const fetchUsersAndStations = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [userRes, stationRes] = await Promise.all([
        getAdminUsersApi().catch((e) => ({ success: false, users: [], error: e })),
        getStationsApi().catch((e) => ({ success: false, stations: [], error: e })),
      ]);

      if (userRes && (userRes.success || Array.isArray(userRes.users))) {
        setUsers(userRes.users || []);
      }

      if (stationRes && (stationRes.success || Array.isArray(stationRes.stations))) {
        setStations(stationRes.stations || []);
      }
    } catch (err) {
      console.error('Failed to load DB records:', err);
      setErrorMsg(err.message || 'Failed to load accounts from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndStations();
  }, []);

  // Helper to generate employee ID
  const generateEmpId = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({
      ...prev,
      employeeId: `EMP-2026-${randomNum}`,
    }));
  };

  // Helper to generate secure temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Create User Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.employeeId || !formData.email || !formData.password || !formData.role) {
      setFeedback({ type: 'error', message: 'Please fill all mandatory fields (*)' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await createUserApi({
        ...formData,
        stationId: formData.stationId || null,
      });

      if (res && (res.success || res.user)) {
        const createdUser = res.user || {
          _id: res.id || `usr_${Date.now()}`,
          name: formData.name,
          employeeId: formData.employeeId.toUpperCase(),
          email: formData.email,
          role: formData.role,
          designation: formData.designation,
          organization: formData.organization,
          phone: formData.phone,
          stationId: stations.find((s) => s._id === formData.stationId) || null,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        // Prepend created user & refresh list from DB
        setUsers((prev) => [createdUser, ...prev]);

        setCreatedCredentialsModal({
          name: formData.name,
          employeeId: createdUser.employeeId || formData.employeeId,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });

        setShowCreateModal(false);

        // Reset user form
        setFormData({
          name: '',
          employeeId: '',
          email: '',
          password: '',
          role: 'SCIENTIST',
          designation: '',
          organization: 'NCPOR',
          phone: '',
          stationId: '',
        });

        fetchUsersAndStations();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to create user in database' });
      }
    } catch (err) {
      console.error('User creation error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create user in database';
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await toggleUserStatusApi(userId);
      if (res && res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: res.user.isActive } : u))
        );
      }
    } catch (err) {
      console.error('Status toggle error:', err);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.organization?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleStyle = (roleVal) => {
    return ROLES.find((r) => r.value === roleVal) || {
      label: roleVal,
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
    };
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── HEADER TITLE & TOP ACTIONS ────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#005B7F' }}>manage_accounts</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              User Account Provisioning & Management
            </h1>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.85rem' }}>
            HQ Command portal to provision member accounts and manage expedition complements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            generateEmpId();
            generateTempPassword();
            setShowCreateModal(true);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#005B7F', color: '#ffffff',
            borderRadius: '6px', border: 'none',
            fontSize: '0.875rem', fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0, 91, 127, 0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span>
          + Provision New Member Account
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem'
      }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #005B7F',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Database Accounts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#005B7F', marginTop: '0.25rem' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
            ✓ MongoDB Authenticated
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #16a34a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Active Personnel
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {users.filter((u) => u.isActive !== false).length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Active Accounts
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #7e22ce',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Polar Stations in DB
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.25rem' }}>
            {stations.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            {stations.map(s => s.code).join(', ') || 'DB Stations'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #0f766e',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Scientists & Staff
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f766e', marginTop: '0.25rem' }}>
            {users.filter((u) => ['SCIENTIST', 'STATION_OPERATOR', 'INVENTORY_MANAGER'].includes(u.role)).length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Field & Station Team
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ───────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
        border: '1px solid #E2E8F0', display: 'flex', gap: '1rem',
        flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: '18px'
            }}>
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, Employee ID, email, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                borderRadius: '6px', border: '1px solid #CBD5E1',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '6px',
              border: '1px solid #CBD5E1', fontSize: '0.85rem',
              color: '#334155', backgroundColor: '#F8FAFC', cursor: 'pointer'
            }}
          >
            <option value="ALL">All Roles ({users.length})</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchUsersAndStations}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 0.85rem', backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1', borderRadius: '6px',
            fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Sync DB
        </button>
      </div>

      {/* ── USER ACCOUNTS TABLE ────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>
            MongoDB Member Accounts ({filteredUsers.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Showing {filteredUsers.length} of {users.length} database accounts
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Loading MongoDB user accounts...</div>
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#B91C1C' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>error</span>
            <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>{errorMsg}</div>
            <button
              onClick={fetchUsersAndStations}
              style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Retry Database Connection
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#cbd5e1' }}>person_search</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem', color: '#334155' }}>
              No database accounts found
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Click "+ Provision New Member Account" to create a user account in MongoDB.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Member Profile</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Designation & Org</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact & Station</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const roleMeta = getRoleStyle(u.role);
                  return (
                    <tr key={u._id || u.employeeId || u.email} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                      {/* Name & Initials */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            backgroundColor: roleMeta.bg, color: roleMeta.color,
                            border: `1px solid ${roleMeta.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                          }}>
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.875rem' }}>{u.name}</div>
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700, fontSize: '0.75rem',
                          backgroundColor: '#F1F5F9', color: '#0F172A',
                          padding: '0.2rem 0.5rem', borderRadius: '4px',
                          border: '1px solid #E2E8F0'
                        }}>
                          {u.employeeId}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          backgroundColor: roleMeta.bg, color: roleMeta.color,
                          border: `1px solid ${roleMeta.border}`,
                          padding: '0.2rem 0.6rem', borderRadius: '12px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: roleMeta.color }} />
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Designation & Org */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{u.designation || 'Specialist'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.organization || 'NCPOR'}</div>
                      </td>

                      {/* Station & Contact */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                          {u.stationId?.name || u.stationName || 'NCPOR HQ Command (Goa)'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {u.phone || 'No phone recorded'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px',
                          fontSize: '0.7rem', fontWeight: 700,
                          backgroundColor: u.isActive !== false ? '#DCFCE7' : '#FEE2E2',
                          color: u.isActive !== false ? '#15803D' : '#991B1B',
                          border: `1px solid ${u.isActive !== false ? '#86EFAC' : '#FCA5A5'}`
                        }}>
                          {u.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u._id)}
                          title={u.isActive !== false ? 'Suspend Account' : 'Activate Account'}
                          style={{
                            padding: '0.35rem 0.65rem',
                            backgroundColor: u.isActive !== false ? '#FEF2F2' : '#F0FDF4',
                            color: u.isActive !== false ? '#DC2626' : '#16A34A',
                            border: `1px solid ${u.isActive !== false ? '#FECACA' : '#BBF7D0'}`,
                            borderRadius: '4px', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600
                          }}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE USER MODAL ──────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '10px',
            width: '100%', maxWidth: '640px', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', backgroundColor: '#005B7F',
              color: '#ffffff', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderTopLeftRadius: '9px', borderTopRightRadius: '9px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#99F6E4' }}>person_add</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Provision New Member Account (MongoDB)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {feedback && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem',
                  backgroundColor: feedback.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                  color: feedback.type === 'error' ? '#991B1B' : '#166534',
                  border: `1px solid ${feedback.type === 'error' ? '#FCA5A5' : '#86EFAC'}`
                }}>
                  {feedback.message}
                </div>
              )}

              {/* Grid Row 1: Name & Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Dr. Ananya Sharma"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Assigned Role *
                  </label>
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff'
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid Row 2: Employee ID & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      Employee ID / Service ID *
                    </label>
                    <button
                      type="button"
                      onClick={generateEmpId}
                      style={{ background: 'none', border: 'none', color: '#005B7F', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ↻ Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    name="employeeId"
                    required
                    placeholder="EMP-2026-101"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem',
                      fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="member@ncpor.gov.in"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Grid Row 3: Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    Initial Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    style={{ background: 'none', border: 'none', color: '#005B7F', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Generate Secure Password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="Enter or generate temporary password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 2.5rem 0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem',
                      fontFamily: showPassword ? "'JetBrains Mono', monospace" : 'inherit'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid Row 4: Designation & Organization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Senior Glaciologist"
                    value={formData.designation}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Deputed Organization
                  </label>
                  <input
                    type="text"
                    name="organization"
                    placeholder="e.g. NCPOR, ISRO, NPL, Indian Navy"
                    value={formData.organization}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Grid Row 5: Station Assignment from DB & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Primary Station (from DB)
                  </label>
                  <select
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff'
                    }}
                  >
                    <option value="">NCPOR HQ Command (Goa) / Unassigned</option>
                    {stations.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem', borderRadius: '6px',
                    border: '1px solid #CBD5E1', backgroundColor: '#fff',
                    color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.5rem', borderRadius: '6px',
                    border: 'none', backgroundColor: '#005B7F',
                    color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                      Saving to DB...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                      Save & Provision Account
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── CREATED CREDENTIALS SUCCESS MODAL ─────────────────────── */}
      {createdCredentialsModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2100,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '10px',
            width: '100%', maxWidth: '480px', padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #86EFAC', textAlign: 'center'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: '#DCFCE7', color: '#16A34A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>verified</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Saved to MongoDB & Email Dispatched!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.35rem' }}>
              Account for <strong>{createdCredentialsModal.name}</strong> created in DB. An automated welcome email was dispatched to <strong>{createdCredentialsModal.email}</strong>.
            </p>

            <div style={{
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px',
              padding: '1rem', marginTop: '1.25rem', textAlign: 'left', display: 'flex',
              flexDirection: 'column', gap: '0.5rem', fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.82rem'
            }}>
              <div><strong style={{ color: '#475569' }}>Employee ID:</strong> {createdCredentialsModal.employeeId}</div>
              <div><strong style={{ color: '#475569' }}>Email:</strong> {createdCredentialsModal.email}</div>
              <div><strong style={{ color: '#475569' }}>Password:</strong> <span style={{ color: '#005B7F', fontWeight: 700 }}>{createdCredentialsModal.password}</span></div>
              <div><strong style={{ color: '#475569' }}>Role:</strong> {createdCredentialsModal.role}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `NCPOR NIRANTRA Portal Credentials:\nEmail: ${createdCredentialsModal.email}\nPassword: ${createdCredentialsModal.password}\nEmployee ID: ${createdCredentialsModal.employeeId}\nRole: ${createdCredentialsModal.role}`;
                navigator.clipboard.writeText(text);
                alert('Credentials copied to clipboard!');
              }}
              style={{
                width: '100%', marginTop: '1.25rem', padding: '0.65rem',
                backgroundColor: '#005B7F', color: '#fff', borderRadius: '6px',
                border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
              Copy Login Credentials
            </button>

            <button
              type="button"
              onClick={() => setCreatedCredentialsModal(null)}
              style={{
                marginTop: '0.5rem', padding: '0.5rem', background: 'none', border: 'none',
                color: '#64748B', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementDashboard;
