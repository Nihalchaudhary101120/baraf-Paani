import React, { useState, useEffect, useCallback } from 'react';
import {
  getExpeditionsApi,
  createExpeditionApi,
  updateExpeditionApi,
  assignPersonnelToExpeditionApi,
  getPersonnelReadinessApi,
  nominatePersonnelApi,
  getExpeditionCandidatesApi,
  confirmExpeditionCandidateApi,
  removeExpeditionCandidateApi,
} from '@/api/admin.api';
import { getManifests, createManifest } from '@/api/cargo.api';
import axiosInstance from '@/api/axiosInstance';
import { useAdminData } from '@/context/AdminContext';

// ─── Helpers & Styles ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PLANNING:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '◐' },
  APPROVED:  { color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', dot: '◑' },
  ACTIVE:    { color: '#15803d', bg: '#f0fdf4', border: '#86efac', dot: '●' },
  COMPLETED: { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', dot: '◉' },
};

const INPUT_STYLE = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
  border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box',
  outline: 'none',
};

const LABEL_STYLE = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700,
  color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em',
};

const SectionDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
  </div>
);

const ManageLink = ({ icon, label, count, note, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px',
      border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0369a1' }}>{icon}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{count !== undefined ? `${count} ${note}` : note}</span>
      <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>Manage →</span>
    </div>
  </div>
);

// ─── Create Cargo Manifest Modal ─────────────────────────────────────────────

const CreateCargoManifestModal = ({ expedition, stations, onClose, onCreated }) => {
  const [form, setForm] = useState({
    declarationType: 'EQUIPMENT',
    destination: stations?.[0]?._id || '',
    origin: 'Goa',
    items: [
      { itemCode: `ITM-${Date.now().toString().slice(-4)}`, description: '', category: 'EQUIPMENT', weightKg: 10, packageCount: 1 }
    ]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [
        ...f.items,
        { itemCode: `ITM-${Date.now().toString().slice(-4)}-${f.items.length + 1}`, description: '', category: 'EQUIPMENT', weightKg: 5, packageCount: 1 }
      ]
    }));
  };

  const removeItem = (index) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, val) => {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === index ? { ...it, [field]: val } : it)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination) {
      setError('Please select a destination station.');
      return;
    }
    if (form.items.some(it => !it.itemCode.trim() || !it.description.trim())) {
      setError('All items must have a unique Item Code and Description.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        expeditionId: expedition._id,
        declarationType: form.declarationType,
        destination: form.destination,
        origin: form.origin || 'Goa',
        items: form.items.map(it => ({
          itemCode: it.itemCode.trim(),
          description: it.description.trim(),
          category: it.category || 'EQUIPMENT',
          weightKg: Number(it.weightKg) || 1,
          packageCount: Number(it.packageCount) || 1,
        }))
      };

      const res = await createManifest(payload);
      if (res?.data?.success || res?.success || res?.manifest || res?.data?.manifest) {
        onCreated && onCreated(res.data?.manifest || res.manifest);
        onClose();
      } else {
        setError(res?.data?.message || res?.message || 'Failed to create cargo manifest');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error creating cargo manifest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3500, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#005B7F' }}>description</span>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>Create Cargo Manifest</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.1rem 0 0' }}>For Expedition: <strong>{expedition.expeditionCode}</strong></p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL_STYLE}>Declaration Type *</label>
              <select value={form.declarationType} onChange={e => setForm(f => ({ ...f, declarationType: e.target.value }))} style={{ ...INPUT_STYLE, backgroundColor: '#fff' }}>
                <option value="EQUIPMENT">Equipment & Machinery</option>
                <option value="CONSUMABLES">Food & Consumables</option>
                <option value="SCIENTIFIC_SAMPLES">Scientific Instruments</option>
                <option value="HAZMAT">Fuel & Hazmat</option>
                <option value="MEDICAL">Medical Supplies</option>
                <option value="PERSONAL_EFFECTS">Personal Effects</option>
              </select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Destination Base *</label>
              <select value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} style={{ ...INPUT_STYLE, backgroundColor: '#fff' }}>
                {stations.map(st => (
                  <option key={st._id} value={st._id}>{st.name || st.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>Port of Origin</label>
            <input type="text" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="e.g. Goa (Mormugao Port)" style={INPUT_STYLE} />
          </div>

          <SectionDivider label="Manifest Items" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {form.items.map((it, i) => (
              <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '0.15rem' }}>Item Code</div>
                  <input type="text" value={it.itemCode} onChange={e => updateItem(i, 'itemCode', e.target.value)} placeholder="Code" style={{ ...INPUT_STYLE, padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '0.15rem' }}>Description</div>
                  <input type="text" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="e.g. Weather Radar Unit" style={{ ...INPUT_STYLE, padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '0.15rem' }}>Weight (kg)</div>
                  <input type="number" value={it.weightKg} onChange={e => updateItem(i, 'weightKg', e.target.value)} style={{ ...INPUT_STYLE, padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '0.15rem' }}>Packages</div>
                  <input type="number" value={it.packageCount} onChange={e => updateItem(i, 'packageCount', e.target.value)} style={{ ...INPUT_STYLE, padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
                </div>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem', alignSelf: 'center', marginTop: '0.7rem' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addItem} style={{ alignSelf: 'flex-start', padding: '0.35rem 0.75rem', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px dashed #bae6fd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
              + Add Item
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.3rem', borderRadius: '6px', border: 'none', backgroundColor: submitting ? '#94a3b8' : '#005B7F', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Creating...' : 'Save Manifest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Nominate Personnel Modal ────────────────────────────────────────────────

const NominatePersonnelModal = ({ expedition, allPersonnel, stations, existingCandidateIds = [], onClose, onNominated }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState(expedition.stations?.[0]?.stationId?._id || '');
  const [participationType, setParticipationType] = useState(expedition.season || 'WINTER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Selected candidate IDs for new nomination
  const [selected, setSelected] = useState([]);

  // Filter available personnel pool
  const filtered = (allPersonnel || []).filter(p => {
    const name = p.name || p.userId?.name || '';
    const id = p.employeeId || p.userId?.employeeId || '';
    const role = p.role || p.userId?.role || '';
    const org = p.userId?.organization || p.organization || '';
    const q = search.toLowerCase();

    const matchSearch = !q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q) || role.toLowerCase().includes(q) || org.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || role.toUpperCase() === roleFilter.toUpperCase();

    return matchSearch && matchRole;
  });

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const unselectedFiltered = filtered.filter(p => !existingCandidateIds.includes(p._id.toString())).map(p => p._id);
    if (selected.length === unselectedFiltered.length) {
      setSelected([]);
    } else {
      setSelected(unselectedFiltered);
    }
  };

  const handleNominateSubmit = async () => {
    if (!selected.length) {
      setError('Please select at least one person to nominate for this expedition.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await nominatePersonnelApi(expedition._id, {
        personnelIds: selected,
        participationType,
        stationId: selectedStation || undefined,
      });

      if (res?.data?.success || res?.success || res?.nominatedCount) {
        onNominated && onNominated(res?.data || res);
        onClose();
      } else {
        setError(res?.data?.message || res?.message || 'Failed to nominate personnel.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error nominating personnel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3200, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #E2E8F0' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, backgroundColor: '#0f2744', color: '#fff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#38bdf8' }}>person_add</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                NOMINATE PERSONNEL FOR EXPEDITION: {expedition.expeditionCode}
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#93c5fd', margin: '0.2rem 0 0' }}>
              Select personnel from the organization pool. Nominated candidates will immediately enter the clearance pipeline and become visible to the Medical and Training Officers for assessments.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#fff', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text" placeholder="Search by name, employee ID, role..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#fff', fontWeight: 600 }}>
            <option value="ALL">All Roles</option>
            <option value="SCIENTIST">Scientist</option>
            <option value="STATION_COMMANDER">Station Commander</option>
            <option value="MEDICAL_OFFICER">Medical Officer</option>
            <option value="LOGISTICS_OFFICER">Logistics Officer</option>
            <option value="FIELD_ENGINEER">Field Engineer</option>
            <option value="TECHNICAL_SPECIALIST">Technical Specialist</option>
          </select>

          <select value={participationType} onChange={e => setParticipationType(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#fff', fontWeight: 600 }}>
            <option value="WINTER">WINTER Overwintering</option>
            <option value="SUMMER">SUMMER Season</option>
          </select>

          {stations && stations.length > 0 && (
            <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#fff', fontWeight: 600 }}>
              <option value="">Default Expedition Base</option>
              {stations.map(st => (
                <option key={st._id} value={st._id}>{st.name} ({st.code})</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleSelectAll}
            style={{ padding: '0.55rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Select All Available
          </button>
        </div>

        {error && (
          <div style={{ margin: '0.75rem 1.5rem 0', padding: '0.65rem 1rem', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        {/* Table of Personnel Pool */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#fff' }}>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '0.65rem 0.75rem', width: '36px', textAlign: 'center' }}></th>
                {['Personnel Candidate', 'Employee ID', 'Designation / Role', 'Organization', 'Current Station', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '0.35rem' }}>person_search</span>
                    No personnel found matching the specified filters.
                  </td>
                </tr>
              ) : filtered.map((p, i) => {
                const id = p._id.toString();
                const name = p.name || p.userId?.name || '—';
                const empId = p.employeeId || p.userId?.employeeId || '—';
                const role = p.role || p.userId?.role || '—';
                const org = p.userId?.organization || p.organization || 'NCPOR';
                const station = p.station || p.stationCode || p.expedition?.assignedStation?.name || '—';
                const isAlreadyCandidate = existingCandidateIds.includes(id);
                const isSelected = selected.includes(id);

                return (
                  <tr key={id || i}
                    onClick={() => !isAlreadyCandidate && toggle(id)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isAlreadyCandidate ? '#f8fafc' : isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: isAlreadyCandidate ? 'not-allowed' : 'pointer',
                      opacity: isAlreadyCandidate ? 0.65 : 1,
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected || isAlreadyCandidate}
                        disabled={isAlreadyCandidate}
                        onChange={() => toggle(id)}
                        style={{ cursor: isAlreadyCandidate ? 'not-allowed' : 'pointer', accentColor: '#005B7F' }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0F172A' }}>
                      {name}
                      {isAlreadyCandidate && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          ALREADY NOMINATED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>{empId}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#334155' }}>{role}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#64748B' }}>{org}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#64748B' }}>{station}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{
                        padding: '0.18rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700,
                        backgroundColor: isAlreadyCandidate ? '#f1f5f9' : '#dcfce7',
                        color: isAlreadyCandidate ? '#64748B' : '#15803d'
                      }}>
                        {isAlreadyCandidate ? 'IN PIPELINE' : 'AVAILABLE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
            Selected: <strong style={{ color: '#005B7F' }}>{selected.length}</strong> personnel to nominate
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleNominateSubmit} disabled={!selected.length || submitting}
              style={{
                padding: '0.55rem 1.35rem', borderRadius: '6px', border: 'none',
                backgroundColor: selected.length ? '#005B7F' : '#94a3b8',
                color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                cursor: selected.length && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              {submitting ? 'Nominating Candidates...' : `Nominate Selected (${selected.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Restriction Review Modal ────────────────────────────────────────────────

const RestrictionReviewModal = ({ candidate, onClose, onConfirm, confirming }) => {
  const [remarks, setRemarks] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const p = candidate?.personnelId || {};
  const name = p.name || p.userId?.name || 'Candidate';
  const empId = p.employeeId || p.userId?.employeeId || '—';
  const role = p.role || p.userId?.role || '—';
  const restrictions = candidate.medicalRestrictions || [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3600, backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#d97706' }}>warning</span>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e', margin: 0 }}>Review Medical Restrictions</h3>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.15rem' }}>HQ Assignment Review for Cleared Candidate with Limitations</div>
          </div>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
              Employee ID: <strong style={{ fontFamily: 'monospace', color: '#334155' }}>{empId}</strong> · Role: <strong>{role}</strong>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff7ed', padding: '1rem', borderRadius: '8px', border: '1px solid #ffedd5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              Medical Officer Restrictions & Notes:
            </div>
            {restrictions.length > 0 ? (
              <ul style={{ margin: '0.3rem 0 0.5rem 1.25rem', padding: 0, fontSize: '0.82rem', color: '#9a3412', fontWeight: 600 }}>
                {restrictions.map((r, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#9a3412', fontStyle: 'italic' }}>
                {candidate.medicalRemarks || 'Restricted field duty / Station indoor duties only'}
              </div>
            )}
            {candidate.medicalRemarks && restrictions.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#7c2d12', marginTop: '0.5rem', borderTop: '1px dashed #fed7aa', paddingTop: '0.4rem' }}>
                <strong>Medical Remarks:</strong> {candidate.medicalRemarks}
              </div>
            )}
          </div>

          <div>
            <label style={LABEL_STYLE}>HQ Confirmation Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cleared for indoor laboratory work at Maitri Station."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#334155', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              style={{ marginTop: '0.15rem', accentColor: '#005B7F' }}
            />
            <span>I have reviewed the medical restrictions and confirm that this individual is authorized for deployment within these designated operational limits.</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(candidate._id, { remarks })}
            disabled={!acknowledged || confirming}
            style={{
              padding: '0.55rem 1.3rem', borderRadius: '6px', border: 'none',
              backgroundColor: acknowledged && !confirming ? '#005B7F' : '#94a3b8',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem',
              cursor: acknowledged && !confirming ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            {confirming ? 'Confirming...' : 'Confirm Assignment with Restrictions'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Expedition Detail Panel ─────────────────────────────────────────────────

const ExpeditionDetailPanel = ({ expedition, allPersonnel, stations, onClose, onRefresh }) => {
  const [tab, setTab] = useState('overview');
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [showCreateManifest, setShowCreateManifest] = useState(false);
  const [manifests, setManifests] = useState([]);
  const [loadingManifests, setLoadingManifests] = useState(false);

  // Candidates & Readiness State
  const [candidates, setCandidates] = useState([]);
  const [candidateMetrics, setCandidateMetrics] = useState({
    totalNominated: 0,
    confirmed: 0,
    readyForConfirmation: 0,
    medicalPending: 0,
    trainingPending: 0,
    blocked: 0,
  });
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [reviewCandidate, setReviewCandidate] = useState(null);

  const statusCfg = STATUS_CONFIG[expedition.status] || STATUS_CONFIG.PLANNING;
  const stationNames = expedition.stations?.map(s => s.stationId?.name || s.stationId?.code || '—').join(', ') || 'Not configured';

  // Fetch live candidates for this expedition
  const fetchCandidates = useCallback(async () => {
    if (!expedition?._id) return;
    setLoadingCandidates(true);
    try {
      const res = await getExpeditionCandidatesApi(expedition._id);
      const data = res?.data !== undefined ? res.data : res;
      if (data && (data.success || Array.isArray(data.candidates))) {
        setCandidates(data.candidates || []);
        if (data.metrics) setCandidateMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Fetch candidates error:', e);
    } finally {
      setLoadingCandidates(false);
    }
  }, [expedition._id]);

  const fetchExpeditionManifests = useCallback(async () => {
    if (!expedition?._id) return;
    setLoadingManifests(true);
    try {
      const res = await getManifests({ expeditionId: expedition._id });
      if (res?.data?.manifests) setManifests(res.data.manifests);
      else if (res?.manifests) setManifests(res.manifests);
    } catch (e) {
      console.error('Fetch manifests error:', e);
    } finally {
      setLoadingManifests(false);
    }
  }, [expedition._id]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (tab === 'logistics' || tab === 'manifests') {
      fetchExpeditionManifests();
    }
  }, [tab, fetchExpeditionManifests]);

  const handleManifestCreated = (newManifest) => {
    setManifests(prev => [newManifest, ...prev]);
    onRefresh && onRefresh();
  };

  const handleCandidateConfirmed = async (candidateId, payload = {}) => {
    setConfirmingId(candidateId);
    try {
      const res = await confirmExpeditionCandidateApi(expedition._id, candidateId, payload);
      const data = res?.data !== undefined ? res.data : res;
      if (data?.success || data?.candidate) {
        setReviewCandidate(null);
        await fetchCandidates();
        onRefresh && onRefresh();
        alert(data?.message || 'Candidate assignment confirmed to official expedition roster!');
      } else {
        alert(data?.message || 'Failed to confirm assignment.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error confirming assignment.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRemoveCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to remove this nominated candidate from the expedition?')) return;
    setRemovingId(candidateId);
    try {
      const res = await removeExpeditionCandidateApi(expedition._id, candidateId);
      const data = res?.data !== undefined ? res.data : res;
      if (data?.success) {
        await fetchCandidates();
        onRefresh && onRefresh();
      } else {
        alert(data?.message || 'Failed to remove candidate.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error removing candidate.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleNominationSuccess = async () => {
    await fetchCandidates();
    onRefresh && onRefresh();
  };

  // Split candidates into Nominated/In Pipeline vs Confirmed Roster
  const nominatedPipeline = candidates.filter(c => c.status !== 'CONFIRMED');
  const confirmedRoster = candidates.filter(c => c.status === 'CONFIRMED');
  const existingCandidatePersonnelIds = candidates.map(c => c.personnelId?._id?.toString() || c.personnelId?.toString()).filter(Boolean);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 2500, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
        <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '820px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 50px -12px rgba(0,0,0,0.25)', borderLeft: '1px solid #E2E8F0', overflowY: 'auto' }}>

          {/* Panel Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#0f2744', color: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#7dd3fc', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>{expedition.expeditionCode}</div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.3rem', lineHeight: 1.3 }}>{expedition.name}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>{expedition.year} · {expedition.season}</span>
                  <span style={{ padding: '0.15rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: `${statusCfg.color}30`, color: statusCfg.color, border: `1px solid ${statusCfg.color}50` }}>
                    {statusCfg.dot} {expedition.status}
                  </span>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', fontSize: '1rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              {[
                { label: 'Bases', value: stationNames },
                { label: 'Confirmed Roster', value: candidateMetrics.confirmed || expedition.summary?.personnelCount || 0 },
                { label: 'Cargo Manifests', value: expedition.summary?.cargoManifestCount ?? manifests.length },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.65rem', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', flexShrink: 0, backgroundColor: '#f8fafc' }}>
            {[
              ['overview', 'Overview'],
              ['personnel', `Personnel (${candidates.length})`],
              ['manifests', 'Cargo Manifests'],
              ['projects', 'Scientific Projects'],
              ['logistics', 'Transport Plan']
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '0.7rem 1.1rem', background: 'none', border: 'none',
                borderBottom: tab === key ? '2px solid #005B7F' : '2px solid transparent',
                marginBottom: '-2px', color: tab === key ? '#005B7F' : '#64748B',
                fontWeight: tab === key ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mission Components</div>
                  <ManageLink icon="badge" label="Personnel Roster & Clearances" count={candidateMetrics.confirmed} note={`confirmed · ${candidateMetrics.totalNominated} nominated`} onClick={() => setTab('personnel')} />
                  <ManageLink icon="description" label="Cargo Manifests" count={expedition.summary?.cargoManifestCount ?? manifests.length} note="manifests" onClick={() => setTab('manifests')} />
                  <ManageLink icon="science" label="Scientific Projects" count={expedition.scientificProjects?.length ?? 0} note="projects" onClick={() => setTab('projects')} />
                  <ManageLink icon="local_shipping" label="Transport Plan" note={expedition.summary?.transportConfigured ? 'Configured' : 'Not configured'} onClick={() => setTab('logistics')} />
                </div>

                {/* Leadership */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Expedition Leadership</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {[
                      { role: 'Expedition Leader', key: 'expeditionLeader' },
                      { role: 'Deputy Leader', key: 'deputyLeader' },
                      { role: 'Logistics Lead', key: 'logisticsLead' },
                      { role: 'Medical Officer', key: 'medicalOfficer' },
                    ].map(({ role, key }) => {
                      const person = expedition.leadership?.[key];
                      return (
                        <div key={key} style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{role}</div>
                          <div style={{ fontWeight: 600, color: person ? '#0F172A' : '#94a3b8', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                            {person?.userId?.name || person?.name || 'Not Assigned'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Station Bases */}
                {expedition.stations?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Base Stations</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {expedition.stations.map((s, i) => (
                        <div key={i} style={{ padding: '0.4rem 0.85rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#0369a1' }}>location_city</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>{s.stationId?.name || s.stationId?.code || '—'}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>· {s.deploymentType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PERSONNEL TAB — 2-STAGE NOMINATION & READINESS PIPELINE */}
            {tab === 'personnel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* TOP METRICS STRIP */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Nominated', value: candidateMetrics.totalNominated, color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'Confirmed', value: candidateMetrics.confirmed, color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
                    { label: 'Ready', value: candidateMetrics.readyForConfirmation, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                    { label: 'Med Pending', value: candidateMetrics.medicalPending, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                    { label: 'Trn Pending', value: candidateMetrics.trainingPending, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                    { label: 'Blocked', value: candidateMetrics.blocked, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                  ].map(m => (
                    <div key={m.label} style={{ backgroundColor: m.bg, border: `1px solid ${m.border}`, borderRadius: '6px', padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{m.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.color, marginTop: '0.1rem' }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* ACTION BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>{candidateMetrics.totalNominated}</strong> total candidate(s) in expedition workflow.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={fetchCandidates}
                      title="Refresh readiness data"
                      style={{ padding: '0.45rem 0.65rem', backgroundColor: '#fff', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
                    </button>
                    <button
                      onClick={() => setShowNominateModal(true)}
                      style={{ padding: '0.45rem 1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
                      + Nominate Personnel
                    </button>
                  </div>
                </div>

                {/* SECTION 1: NOMINATED CANDIDATES (CLEARANCE & READINESS PIPELINE) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0369a1' }}>clinical_notes</span>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        1. Nominated Candidates (Readiness Pipeline)
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Medical & Training clearances update in parallel. HQ confirms when ready.
                    </span>
                  </div>

                  {loadingCandidates ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading nominated candidates...</div>
                  ) : nominatedPipeline.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '0.35rem' }}>how_to_reg</span>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No Active Candidate Nominations Pending</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Click "+ Nominate Personnel" to add candidate scientists and engineers for clearance.</div>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                          <tr>
                            {['Candidate', 'Role / Station', 'Medical Clearance', 'Polar Training', 'Readiness', 'HQ Action'].map(h => (
                              <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {nominatedPipeline.map((c, i) => {
                            const p = c.personnelId || {};
                            const name = p.name || p.userId?.name || '—';
                            const empId = p.employeeId || p.userId?.employeeId || '—';
                            const role = p.role || p.userId?.role || '—';
                            const stationName = c.assignedStation?.name || p.expedition?.assignedStation?.name || p.station || 'Maitri';
                            
                            const med = c.medicalStatus || 'PENDING';
                            const trn = c.trainingStatus || 'PENDING';
                            const isReady = c.status === 'READY_FOR_CONFIRMATION' || (
                              (med === 'FIT' || med === 'FIT_WITH_RESTRICTIONS') && trn === 'COMPLETED'
                            );
                            const isRestricted = med === 'FIT_WITH_RESTRICTIONS';
                            const isNotFit = med === 'NOT_FIT';
                            const isPending = med === 'PENDING' || trn === 'PENDING' || trn === 'PARTIAL';

                            return (
                              <tr key={c._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isReady ? '#f0fdf4' : isNotFit ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                {/* Candidate */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>{empId}</div>
                                </td>

                                {/* Role / Station */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <div style={{ color: '#334155', fontWeight: 600 }}>{role}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{stationName} · {c.participationType || 'WINTER'}</div>
                                </td>

                                {/* Medical Clearance */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <span style={{
                                      display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                      backgroundColor: med === 'FIT' ? '#dcfce7' : isRestricted ? '#fef3c7' : isNotFit ? '#fee2e2' : '#f1f5f9',
                                      color: med === 'FIT' ? '#15803d' : isRestricted ? '#b45309' : isNotFit ? '#dc2626' : '#64748B',
                                      width: 'fit-content'
                                    }}>
                                      {med === 'FIT' ? '✔ FIT' : isRestricted ? '⚠ RESTRICTED' : isNotFit ? '✖ NOT FIT' : '⏳ PENDING'}
                                    </span>
                                    {isRestricted && (
                                      <div style={{ fontSize: '0.65rem', color: '#b45309', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={(c.medicalRestrictions || []).join(', ') || c.medicalRemarks}>
                                        {(c.medicalRestrictions || []).join(', ') || 'Special duty limitations'}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Training Status */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                    backgroundColor: trn === 'COMPLETED' ? '#dcfce7' : trn === 'PARTIAL' ? '#fef3c7' : '#f1f5f9',
                                    color: trn === 'COMPLETED' ? '#15803d' : trn === 'PARTIAL' ? '#b45309' : '#64748B'
                                  }}>
                                    {trn === 'COMPLETED' ? '✔ COMPLETED' : trn === 'PARTIAL' ? '◐ PARTIAL' : '⏳ PENDING'}
                                  </span>
                                </td>

                                {/* Overall Readiness Status */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  {isReady ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                                      ★ READY
                                    </span>
                                  ) : isNotFit ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} title="Declared NOT FIT by Medical Officer">
                                      🔒 BLOCKED (UNFIT)
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }} title="Pending medical exam or polar training completion">
                                      🔒 BLOCKED
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {isReady ? (
                                      <button
                                        onClick={() => {
                                          if (isRestricted) {
                                            setReviewCandidate(c);
                                          } else {
                                            handleCandidateConfirmed(c._id);
                                          }
                                        }}
                                        disabled={confirmingId === c._id}
                                        style={{
                                          padding: '0.3rem 0.65rem', backgroundColor: '#005B7F', color: '#fff',
                                          border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                                          cursor: confirmingId === c._id ? 'not-allowed' : 'pointer',
                                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>how_to_reg</span>
                                        {confirmingId === c._id ? 'Confirming...' : 'Confirm'}
                                      </button>
                                    ) : (
                                      <button
                                        disabled
                                        title={isNotFit ? 'Declared NOT FIT for deployment' : 'Medical or training checks are still pending'}
                                        style={{
                                          padding: '0.3rem 0.55rem', backgroundColor: '#f1f5f9', color: '#94a3b8',
                                          border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                                          cursor: 'not-allowed'
                                        }}
                                      >
                                        Blocked
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleRemoveCandidate(c._id)}
                                      disabled={removingId === c._id}
                                      title="Remove nomination"
                                      style={{
                                        padding: '0.25rem 0.4rem', backgroundColor: '#fff', color: '#ef4444',
                                        border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION 2: CONFIRMED EXPEDITION ROSTER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#15803d' }}>verified</span>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Confirmed Expedition Roster ({confirmedRoster.length})
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Official team roster cleared & approved by HQ Command.
                    </span>
                  </div>

                  {confirmedRoster.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '0.35rem' }}>badge</span>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No Personnel Confirmed Yet</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Candidates who pass medical & training clearance can be confirmed above.</div>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #86efac', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #86efac' }}>
                          <tr>
                            {['Member Name', 'Role', 'Assigned Station', 'Medical Clearance', 'Training', 'Confirmed Date', 'Status'].map(h => (
                              <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#15803d', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {confirmedRoster.map((c, i) => {
                            const p = c.personnelId || {};
                            const name = p.name || p.userId?.name || '—';
                            const empId = p.employeeId || p.userId?.employeeId || '—';
                            const role = p.role || p.userId?.role || '—';
                            const stationName = c.assignedStation?.name || p.expedition?.assignedStation?.name || p.station || 'Maitri';
                            const confirmedDate = c.confirmedAt ? new Date(c.confirmedAt).toLocaleDateString() : 'Confirmed';

                            return (
                              <tr key={c._id || i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#fcfdfc' }}>
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>{empId}</div>
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#334155', fontWeight: 600 }}>{role}</td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#64748B' }}>{stationName} ({c.participationType || 'WINTER'})</td>
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                    backgroundColor: c.medicalStatus === 'FIT' ? '#dcfce7' : '#fef3c7',
                                    color: c.medicalStatus === 'FIT' ? '#15803d' : '#b45309'
                                  }}>
                                    {c.medicalStatus === 'FIT' ? '✔ FIT' : '⚠ RESTRICTED'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                    backgroundColor: '#dcfce7', color: '#15803d'
                                  }}>
                                    ✔ COMPLETED
                                  </span>
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#64748B', fontSize: '0.72rem' }}>{confirmedDate}</td>
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                    OFFICIAL ROSTER
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CARGO MANIFESTS TAB */}
            {tab === 'manifests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    {manifests.length} manifest(s) registered for this expedition.
                  </span>
                  <button onClick={() => setShowCreateManifest(true)} style={{ padding: '0.45rem 1rem', backgroundColor: '#005B7F', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    + Create Cargo Manifest
                  </button>
                </div>

                {loadingManifests ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading manifests...</div>
                ) : manifests.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '0.5rem' }}>description</span>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No Cargo Manifests Created Yet</div>
                    <div style={{ fontSize: '0.78rem' }}>Click "+ Create Cargo Manifest" to log equipment, samples, fuel or consumables for this expedition.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {manifests.map(m => (
                      <div key={m._id} style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0369a1', fontSize: '0.85rem' }}>{m.manifestNumber || m.manifestCode}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                            Type: <strong>{m.declarationType}</strong> · Origin: {m.origin || 'Goa'} · Items: {m.items?.length || 0}
                          </div>
                        </div>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#0369a1' }}>
                          {m.status || 'CREATED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROJECTS TAB (KEPT CLEAN AS REQUESTED) */}
            {tab === 'projects' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '0.5rem' }}>science</span>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Scientific Projects</div>
                  <div style={{ fontSize: '0.78rem' }}>Research project proposals and field experiment linkages can be registered once approved by the scientific committee.</div>
                </div>
              </div>
            )}

            {/* LOGISTICS TAB */}
            {tab === 'logistics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '0.5rem' }}>local_shipping</span>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Transport & Logistics Plan</div>
                  <div style={{ fontSize: '0.78rem' }}>Configure sea voyage (MV Vasiliy Golovnin) / chartered flight routes from Goa & Cape Town to Bharati/Maitri.</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Linked Cargo Manifests</div>
                  <ManageLink icon="description" label="Cargo Manifests" count={expedition.summary?.cargoManifestCount ?? manifests.length} note="manifests" onClick={() => setTab('manifests')} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nominate Personnel Modal */}
      {showNominateModal && (
        <NominatePersonnelModal
          expedition={expedition}
          allPersonnel={allPersonnel}
          stations={stations}
          existingCandidateIds={existingCandidatePersonnelIds}
          onClose={() => setShowNominateModal(false)}
          onNominated={handleNominationSuccess}
        />
      )}

      {/* Restriction Review Modal */}
      {reviewCandidate && (
        <RestrictionReviewModal
          candidate={reviewCandidate}
          confirming={confirmingId === reviewCandidate._id}
          onClose={() => setReviewCandidate(null)}
          onConfirm={(candId, payload) => handleCandidateConfirmed(candId, payload)}
        />
      )}

      {/* Create Cargo Manifest Modal */}
      {showCreateManifest && (
        <CreateCargoManifestModal
          expedition={expedition}
          stations={stations}
          onClose={() => setShowCreateManifest(false)}
          onCreated={handleManifestCreated}
        />
      )}
    </>
  );
};

// ─── Create Expedition Modal ─────────────────────────────────────────────────

const CreateExpeditionModal = ({ onClose, onCreated, stations, personnel }) => {
  const [form, setForm] = useState({
    expeditionCode: '',
    name: '',
    year: new Date().getFullYear(),
    season: 'WINTER',
    status: 'PLANNING',
    startDate: '',
    endDate: '',
    stationIds: [],
    expeditionLeaderId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleStation = (id) => {
    setForm(f => ({
      ...f,
      stationIds: f.stationIds.includes(id)
        ? f.stationIds.filter(x => x !== id)
        : [...f.stationIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expeditionCode.trim() || !form.name.trim()) {
      setError('Expedition Code and Mission Title are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createExpeditionApi(form);
      if (res?.success || res?.expedition) {
        onCreated(res.expedition);
        onClose();
      } else {
        setError(res?.message || 'Failed to create expedition.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error creating expedition.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #E2E8F0' }}>

        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#005B7F' }}>flag</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>Create Expedition</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          <SectionDivider label="Expedition Details" />

          {/* Code + Season */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL_STYLE}>Expedition Code *</label>
              <input
                type="text" required
                value={form.expeditionCode}
                onChange={e => set('expeditionCode', e.target.value.toUpperCase())}
                placeholder="e.g. EXP-47"
                style={{ ...INPUT_STYLE, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Season *</label>
              <select value={form.season} onChange={e => set('season', e.target.value)}
                style={{ ...INPUT_STYLE, backgroundColor: '#fff', cursor: 'pointer' }}>
                <option value="SUMMER">SUMMER</option>
                <option value="WINTER">WINTER</option>
              </select>
            </div>
          </div>

          {/* Mission Title */}
          <div>
            <label style={LABEL_STYLE}>Mission Title *</label>
            <input
              type="text" required
              placeholder="e.g. 47th Indian Scientific Expedition to Antarctica"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          {/* Year + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL_STYLE}>Year *</label>
              <input type="number" value={form.year} min="2020" max="2040"
                onChange={e => set('year', Number(e.target.value))}
                style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Initial Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ ...INPUT_STYLE, backgroundColor: '#fff', cursor: 'pointer' }}>
                <option value="PLANNING">PLANNING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={LABEL_STYLE}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>End Date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={INPUT_STYLE} />
            </div>
          </div>

          <SectionDivider label="Base Stations" />

          {/* Station Checkboxes */}
          <div>
            <label style={{ ...LABEL_STYLE, marginBottom: '0.6rem' }}>Select Operating Bases *</label>
            {stations.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                No stations found. Stations will be auto-added after you create the expedition.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {stations.map(st => {
                  const checked = form.stationIds.includes(st._id);
                  return (
                    <label key={st._id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 1rem', borderRadius: '6px', cursor: 'pointer',
                      border: `2px solid ${checked ? '#0369a1' : '#CBD5E1'}`,
                      backgroundColor: checked ? '#eff6ff' : '#fff',
                      transition: 'all 0.15s',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleStation(st._id)}
                        style={{ accentColor: '#0369a1', cursor: 'pointer' }} />
                      <span style={{ fontWeight: checked ? 700 : 500, color: checked ? '#0369a1' : '#374151', fontSize: '0.85rem' }}>
                        {st.name || st.code}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <SectionDivider label="Expedition Leadership" />

          {/* Expedition Leader */}
          <div>
            <label style={LABEL_STYLE}>Expedition Leader</label>
            <select value={form.expeditionLeaderId} onChange={e => set('expeditionLeaderId', e.target.value)}
              style={{ ...INPUT_STYLE, backgroundColor: '#fff', cursor: 'pointer' }}>
              <option value="">— Select Personnel —</option>
              {personnel.map(p => {
                const name = p.name || p.userId?.name || 'Unknown';
                const empId = p.employeeId || p.userId?.employeeId || '';
                return <option key={p._id} value={p._id}>{name} {empId ? `(${empId})` : ''}</option>;
              })}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{ padding: '0.65rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: submitting ? '#94a3b8' : '#005B7F', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flag</span>
              {submitting ? 'Creating...' : 'Create Expedition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Expedition Dashboard ───────────────────────────────────────────────

const ExpeditionDashboard = () => {
  const {
    expeditions,
    stations,
    personnel,
    addExpedition,
    fetchExpeditions,
    fetchStations,
    fetchPersonnel,
    loading: contextLoading,
    isInitialized,
  } = useAdminData();

  const [showModal, setShowModal] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchExpeditions(true);
    fetchStations(true);
    fetchPersonnel(true);
  }, [fetchExpeditions, fetchStations, fetchPersonnel]);

  const loading = !isInitialized && expeditions.length === 0 && contextLoading.expeditions;

  const handleCreated = (exp) => {
    addExpedition(exp);
  };

  const handleAssignPersonnel = async (expId, data) => {
    try {
      const res = await assignPersonnelToExpeditionApi(expId, data);
      await Promise.all([
        fetchExpeditions(true),
        fetchPersonnel(true)
      ]);
      setSelectedExp(prev => {
        if (!prev) return null;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            personnelCount: res?.totalAssigned ?? (prev.summary?.personnelCount || 0) + data.personnelIds.length
          }
        };
      });
      alert(res?.message || `Personnel roster updated successfully! Baseline medical and training clearances initialized.`);
    } catch (e) {
      console.error('Assign error', e);
      alert('Failed to assign personnel: ' + (e.response?.data?.message || e.message));
    }
  };

  const filtered = expeditions.filter(e => !filterStatus || e.status === filterStatus);

  const stats = {
    total: expeditions.length,
    planning: expeditions.filter(e => e.status === 'PLANNING').length,
    active: expeditions.filter(e => e.status === 'ACTIVE').length,
    completed: expeditions.filter(e => e.status === 'COMPLETED').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#005B7F' }}>flag</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#005B7F', margin: 0 }}>
              Indian Antarctic Scientific Expeditions
            </h1>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.82rem' }}>
            HQ mission planning — parent container for personnel, cargo manifests, base stations, and field readiness.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#005B7F', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,91,127,0.3)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
          + Create New Expedition
        </button>
      </div>

      {/* ── STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Total Expeditions', value: stats.total, color: '#005B7F', icon: 'flag' },
          { label: 'In Planning', value: stats.planning, color: '#d97706', icon: 'pending' },
          { label: 'Active Now', value: stats.active, color: '#15803d', icon: 'rocket_launch' },
          { label: 'Completed', value: stats.completed, color: '#475569', icon: 'check_circle' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderLeft: `4px solid ${s.color}`, borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: s.color, marginTop: '0.15rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER BAR */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Filter:</span>
        {['', 'PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED'].map(s => {
          const cfg = s ? STATUS_CONFIG[s] : null;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.3rem 0.85rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${filterStatus === s ? '#005B7F' : '#CBD5E1'}`,
                backgroundColor: filterStatus === s ? '#005B7F' : '#fff',
                color: filterStatus === s ? '#fff' : cfg?.color || '#475569',
              }}>
              {s || 'All'}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>{filtered.length} expeditions</span>
      </div>

      {/* ── EXPEDITIONS LIST */}
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#005B7F', margin: 0 }}>
            Expedition Registry ({filtered.length})
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Click an expedition to open its management panel</span>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>sync</span>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Loading expeditions...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.75rem' }}>flag</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>No expeditions found</div>
            <div style={{ fontSize: '0.82rem' }}>Create your first expedition using the button above.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((exp, i) => {
              const statusCfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.PLANNING;
              const stationNames = exp.stations?.map(s => s.stationId?.name || s.stationId?.code).filter(Boolean).join(' & ') || '—';
              const leaderName = exp.leadership?.expeditionLeader?.userId?.name || exp.leadership?.expeditionLeader?.name || null;

              return (
                <div
                  key={exp._id || i}
                  onClick={() => setSelectedExp(exp)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    cursor: 'pointer', transition: 'background-color 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  {/* Left: Code + Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                    <div style={{
                      minWidth: '52px', height: '52px', borderRadius: '10px',
                      backgroundColor: '#E0F2FE', color: '#0369A1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace",
                      textAlign: 'center', padding: '0.25rem', lineHeight: 1.2,
                    }}>
                      {exp.expeditionCode?.replace('EXP-', 'EXP\n') || exp.expeditionCode}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{exp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>📅 {exp.year} · {exp.season}</span>
                        <span>🏔 {stationNames}</span>
                        {leaderName && <span>👤 {leaderName}</span>}
                        <span>📦 {exp.summary?.cargoManifestCount ?? 0} manifests</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status + quick stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: '#64748B' }}>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                        👥 {exp.summary?.personnelCount ?? 0}
                      </span>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                        📦 {exp.summary?.cargoManifestCount ?? 0}
                      </span>
                    </div>
                    <span style={{
                      padding: '0.3rem 0.85rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`
                    }}>
                      {statusCfg.dot} {exp.status}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>chevron_right</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALS */}
      {showModal && (
        <CreateExpeditionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          stations={stations}
          personnel={personnel}
        />
      )}

      {selectedExp && (
        <ExpeditionDetailPanel
          expedition={selectedExp}
          allPersonnel={personnel}
          stations={stations}
          onClose={() => setSelectedExp(null)}
          onAssignPersonnel={handleAssignPersonnel}
          onRefresh={fetchExpeditions}
        />
      )}
    </div>
  );
};

export default ExpeditionDashboard;
