import React, { useState, useEffect } from 'react';
import { createStationApi } from '@/api/station.api';
import { useAdminData } from '@/context/AdminContext';

const StationDashboard = () => {
  const { stations, users, addStation, fetchStations, fetchUsers, loading: contextLoading, isInitialized } = useAdminData();
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form state for creating a new station
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    stationType: 'COASTAL',
    coordinates: '70.7667, -11.7333',
    elevationMeters: 130,
    summerCapacity: 45,
    winterCapacity: 25,
    emergencyCapacity: 60,
  });

  useEffect(() => {
    fetchStations(true);
    fetchUsers(true);
  }, [fetchStations, fetchUsers]);

  const loading = !isInitialized && stations.length === 0 && contextLoading.stations;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      setFeedback({ type: 'error', message: 'Station code and name are required' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const coords = formData.coordinates.split(',').map((c) => parseFloat(c.trim()) || 0);
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        stationType: formData.stationType,
        location: {
          type: 'Point',
          coordinates: coords.length === 2 ? coords : [70.0, -70.0],
          elevationMeters: Number(formData.elevationMeters) || 100,
        },
        capacity: {
          summer: Number(formData.summerCapacity) || 40,
          winter: Number(formData.winterCapacity) || 25,
          emergency: Number(formData.emergencyCapacity) || 60,
        },
      };

      const res = await createStationApi(payload);
      if (res && (res.success || res.station)) {
        const newSt = res.station || payload;
        addStation(newSt);
        setShowCreateModal(false);
        setFormData({
          code: '',
          name: '',
          stationType: 'COASTAL',
          coordinates: '70.7667, -11.7333',
          elevationMeters: 130,
          summerCapacity: 45,
          winterCapacity: 25,
          emergencyCapacity: 60,
        });
        fetchStations(true);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to create station' });
      }
    } catch (err) {
      console.error('Create station error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Error creating station' });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute personnel assigned per station
  const getAssignedPersonnelCount = (stationId, stationCode) => {
    return users.filter(
      (u) =>
        u.stationId === stationId ||
        u.stationId?._id === stationId ||
        (stationCode && u.stationName && u.stationName.toUpperCase().includes(stationCode.toUpperCase()))
    ).length;
  };

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || s.stationType === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalSummerCap = stations.reduce((sum, s) => sum + (s.capacity?.summer || 0), 0);
  const totalWinterCap = stations.reduce((sum, s) => sum + (s.capacity?.winter || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── HEADER TITLE & ACTIONS ────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#005B7F' }}>location_city</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              Antarctic & Polar Station Operations
            </h1>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.85rem' }}>
            HQ Command management of polar stations, life-support capacities, and complement assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
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
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_location_alt</span>
          + Add New Station to DB
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem'
      }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #005B7F',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Active Polar Stations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#005B7F', marginTop: '0.25rem' }}>
            {stations.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
            ✓ Synchronized in MongoDB
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #0284c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Summer Season Capacity
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>
            {totalSummerCap} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>beds</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Peak Expedition Season
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #7e22ce',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Winter Overwinter Capacity
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.25rem' }}>
            {totalWinterCap} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>beds</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Extreme Polar Isolation
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', borderLeft: '4px solid #16a34a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Assigned Personnel
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {users.length} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>members</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Mapped across bases & HQ
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTERS ───────────────────────────────────────── */}
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
              placeholder="Search station by name or code..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '6px',
              border: '1px solid #CBD5E1', fontSize: '0.85rem',
              color: '#334155', backgroundColor: '#F8FAFC', cursor: 'pointer'
            }}
          >
            <option value="ALL">All Station Types</option>
            <option value="COASTAL">Coastal Stations</option>
            <option value="INLAND">Inland Stations</option>
            <option value="HEADQUARTERS">Headquarters</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => { fetchStations(false); fetchUsers(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 0.85rem', backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1', borderRadius: '6px',
            fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* ── STATIONS GRID ───────────────────────────────────────────── */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#005B7F', marginBottom: '0.85rem' }}>
          Polar Bases & Stations ({filteredStations.length})
        </h3>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>sync</span>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Loading station records...</div>
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#B91C1C', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>error</span>
            <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>{errorMsg}</div>
          </div>
        ) : filteredStations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#cbd5e1' }}>domain_disabled</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem', color: '#334155' }}>
              No stations found
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Click "+ Add New Station to DB" to create a station.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filteredStations.map((s) => {
              const assignedCount = getAssignedPersonnelCount(s._id, s.code);
              return (
                <div key={s._id || s.code} style={{
                  backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0',
                  padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem'
                }}>
                  {/* Card Top */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
                        fontSize: '0.8rem', backgroundColor: '#E0F2FE', color: '#0369A1',
                        padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #BAE6FD'
                      }}>
                        {s.code}
                      </span>
                      <span style={{
                        backgroundColor: s.operationalStatus === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                        color: s.operationalStatus === 'ACTIVE' ? '#15803D' : '#B91C1C',
                        border: `1px solid ${s.operationalStatus === 'ACTIVE' ? '#86EFAC' : '#FCA5A5'}`,
                        padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700
                      }}>
                        ● {s.operationalStatus || 'ACTIVE'}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: '0.65rem', marginBottom: '0.2rem' }}>
                      {s.name}
                    </h2>

                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#005B7F' }}>explore</span>
                      <span>Type: <strong>{s.stationType || 'COASTAL'}</strong></span>
                    </div>
                  </div>

                  {/* Card Capacity & Personnel Metrics */}
                  <div style={{
                    backgroundColor: '#F8FAFC', borderRadius: '6px', padding: '0.75rem',
                    border: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Summer</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F' }}>{s.capacity?.summer || 40}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Winter</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7e22ce' }}>{s.capacity?.winter || 25}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assigned</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>{assignedCount}</div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      Elev: {s.location?.elevationMeters || 100}m
                    </span>
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155',
                        padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                      View Base
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE STATION MODAL ────────────────────────────────────── */}
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
            width: '100%', maxWidth: '520px', padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#005B7F' }}>add_location_alt</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
                  Create New Station in MongoDB
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', marginBottom: '1rem' }}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Station Code * (e.g. MAITRI, HIMADRI)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HIMADRI"
                    value={formData.code}
                    onChange={handleInputChange}
                    name="code"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Station Type
                  </label>
                  <select
                    name="stationType"
                    value={formData.stationType}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="COASTAL">COASTAL</option>
                    <option value="INLAND">INLAND</option>
                    <option value="HEADQUARTERS">HEADQUARTERS</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Full Station Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Himadri Station (Svalbard, Arctic)"
                  value={formData.name}
                  onChange={handleInputChange}
                  name="name"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Summer Capacity (Beds)
                  </label>
                  <input
                    type="number"
                    name="summerCapacity"
                    value={formData.summerCapacity}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Winter Capacity (Beds)
                  </label>
                  <input
                    type="number"
                    name="winterCapacity"
                    value={formData.winterCapacity}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#005B7F', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {submitting ? 'Saving to DB...' : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StationDashboard;
