import React, { useState, useEffect } from 'react';
import { registerDeviceApi, toggleDeviceStatusApi } from '@/api/admin.api';
import { useAdminData } from '@/context/AdminContext';

const DeviceManagementDashboard = () => {
  const { devices, stations, users, addDevice, toggleDeviceStatus, fetchDevices, fetchStations, fetchUsers, loading: contextLoading, isInitialized } = useAdminData();
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [form, setForm] = useState({
    deviceCode: '',
    deviceName: '',
    deviceType: 'TABLET',
    platform: 'ANDROID',
    stationId: '',
    assignedUser: '',
    appVersion: 'v1.3.0',
  });

  useEffect(() => {
    fetchDevices(true);
    fetchStations(true);
    fetchUsers(true);
  }, [fetchDevices, fetchStations, fetchUsers]);

  const loading = !isInitialized && devices.length === 0 && contextLoading.devices;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.deviceCode || !form.deviceName) {
      setFeedback({ type: 'error', message: 'Device Code and Name are required' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await registerDeviceApi(form);
      if (res && (res.success || res.device)) {
        const newDevice = res.device || form;
        addDevice(newDevice);
        setShowModal(false);
        setForm({
          deviceCode: '',
          deviceName: '',
          deviceType: 'TABLET',
          platform: 'ANDROID',
          stationId: '',
          assignedUser: '',
          appVersion: 'v1.3.0',
        });
        fetchDevices(true);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to register device' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Error registering device' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (deviceId, currentStatus) => {
    const nextStatus = currentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      toggleDeviceStatus(deviceId, nextStatus);
      await toggleDeviceStatusApi(deviceId, nextStatus);
    } catch (err) {
      console.error('Toggle device error:', err);
      toggleDeviceStatus(deviceId, currentStatus); // revert on error
    }
  };

  const filtered = devices.filter((d) => {
    const matchesSearch =
      d.deviceCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.stationId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.assignedUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#005B7F' }}>devices</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              Device Registry & Sync Tracker
            </h1>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.85rem' }}>
            HQ Admin management of rugged tablets, base PCs, offline sync nodes, and field telemetry hardware.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const randomCode = `DEV-${Math.floor(100 + Math.random() * 900)}`;
            setForm((f) => ({ ...f, deviceCode: randomCode }));
            setShowModal(true);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.25rem', backgroundColor: '#005B7F', color: '#ffffff',
            borderRadius: '6px', border: 'none', fontSize: '0.875rem', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0, 91, 127, 0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_to_queue</span>
          + Register New Device
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', borderLeft: '4px solid #005B7F' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Registered Hardware</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#005B7F', marginTop: '0.25rem' }}>{devices.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>PouchDB & Web Nodes</div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Online & Syncing</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{onlineCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>Active Satellite / LAN Link</div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', borderLeft: '4px solid #e11d48' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Offline / Field Devices</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e11d48', marginTop: '0.25rem' }}>{offlineCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>Local Cache Buffering</div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', borderLeft: '4px solid #7e22ce' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Base Stations Covered</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.25rem' }}>{stations.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>Maitri, Bharati & Transit</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px' }}>search</span>
            <input
              type="text"
              placeholder="Search by code, model, station, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#F8FAFC' }}
          >
            <option value="ALL">All Statuses ({devices.length})</option>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => { fetchDevices(false); fetchStations(false); fetchUsers(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.85rem', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span> Refresh
        </button>
      </div>

      {/* ── DEVICES TABLE ──────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>Registered Hardware Nodes ({filtered.length})</h3>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Real-time sync telemetry</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Loading device registry...</div>
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#B91C1C' }}>{errorMsg}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#cbd5e1' }}>devices_off</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem' }}>No devices registered yet</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Click "+ Register New Device" to add rugged field tablets or base station PCs.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Device ID & Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Type & OS</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Station Deployment</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Assigned Personnel</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Last Sync Telemetry</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Link Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d._id || d.deviceCode} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#005B7F' }}>
                          {d.deviceType === 'TABLET' ? 'tablet_mac' : d.deviceType === 'PHONE' ? 'smartphone' : d.deviceType === 'LAPTOP' ? 'laptop_chromebook' : 'desktop_windows'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{d.deviceName}</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#005B7F', fontWeight: 600 }}>{d.deviceCode}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, marginRight: '0.35rem' }}>
                        {d.deviceType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{d.platform} ({d.appVersion || 'v1.3'})</span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0F172A' }}>
                      {d.stationId?.name ? `${d.stationId.name} (${d.stationId.code})` : 'NCPOR HQ / Field Pool'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {d.assignedUser ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{d.assignedUser.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{d.assignedUser.role}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned / Station Shared</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748B' }}>
                      <div>Sync: <strong style={{ color: '#334155' }}>{d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleTimeString() : 'Just now'}</strong></div>
                      <div>Seen: <span style={{ color: '#64748B' }}>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleDateString() : 'Active today'}</span></div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
                        backgroundColor: d.status === 'ONLINE' ? '#DCFCE7' : d.status === 'OFFLINE' ? '#FEF2F2' : '#F1F5F9',
                        color: d.status === 'ONLINE' ? '#15803D' : d.status === 'OFFLINE' ? '#B91C1C' : '#64748B',
                        border: `1px solid ${d.status === 'ONLINE' ? '#86EFAC' : d.status === 'OFFLINE' ? '#FCA5A5' : '#CBD5E1'}`
                      }}>
                        ● {d.status || 'ONLINE'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(d._id, d.status)}
                        style={{
                          padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          backgroundColor: d.status === 'ONLINE' ? '#FEF2F2' : '#F0FDF4',
                          color: d.status === 'ONLINE' ? '#DC2626' : '#16A34A',
                          border: `1px solid ${d.status === 'ONLINE' ? '#FECACA' : '#BBF7D0'}`
                        }}
                      >
                        {d.status === 'ONLINE' ? 'Set Offline' : 'Set Online'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── REGISTER DEVICE MODAL ──────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', width: '100%', maxWidth: '520px', padding: '1.75rem', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#005B7F' }}>add_to_queue</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>Register New Device Hardware</h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            {feedback && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', marginBottom: '1rem' }}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Device Code *</label>
                  <input
                    type="text"
                    required
                    value={form.deviceCode}
                    onChange={(e) => setForm((f) => ({ ...f, deviceCode: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Device Type</label>
                  <select
                    value={form.deviceType}
                    onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="TABLET">Rugged Tablet</option>
                    <option value="PHONE">Field Phone</option>
                    <option value="LAPTOP">Rugged Laptop</option>
                    <option value="STATION_PC">Station Base PC</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Hardware / Device Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panasonic Toughbook CF-33 / Samsung Active Tab 4"
                  value={form.deviceName}
                  onChange={(e) => setForm((f) => ({ ...f, deviceName: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Operating Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="ANDROID">Android</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="LINUX">Linux</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Station Deployment</label>
                  <select
                    value={form.stationId}
                    onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="">NCPOR HQ / General Pool</option>
                    {stations.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Assigned Personnel (Optional)</label>
                <select
                  value={form.assignedUser}
                  onChange={(e) => setForm((f) => ({ ...f, assignedUser: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                >
                  <option value="">Shared / Station Pool Device</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.employeeId} - {u.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#005B7F', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {submitting ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeviceManagementDashboard;
