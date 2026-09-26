import React, { useState, useEffect, useCallback } from 'react';
import {
  getCandidateTrainingClearanceApi,
  assignRequiredTrainingApi,
  addTrainingRecordApi,
  verifyTrainingClearanceApi
} from '@/api/training.api';

const POLAR_MODULES_CATALOG = [
  { category: 'SURVIVAL', trainingName: 'Antarctic Survival & Glacier Navigation', defaultChecked: true, icon: 'ac_unit' },
  { category: 'FIRE', trainingName: 'Station Fire Safety & Firefighting', defaultChecked: true, icon: 'local_fire_department' },
  { category: 'RADIO', trainingName: 'HF/VHF & Satcom Radio Protocol', defaultChecked: true, icon: 'cell_tower' },
  { category: 'MEDICAL', trainingName: 'Polar First Aid & Cold Injury Treatment', defaultChecked: true, icon: 'medical_services' },
  { category: 'FIELD', trainingName: 'Crevasse Rescue & Field Safety', defaultChecked: true, icon: 'hiking' },
  { category: 'ENVIRONMENT', trainingName: 'Antarctic Protocol & Waste Management', defaultChecked: false, icon: 'eco' },
  { category: 'EQUIPMENT', trainingName: 'Cold Weather Machinery & Equipment Handling', defaultChecked: false, icon: 'build' },
];

export const TrainingWorkflowModal = ({ candidate, expedition, onClose, onUpdated }) => {
  const personnel = candidate?.personnelId || {};
  const personnelId = personnel._id || candidate?.personnelId;
  const expeditionId = expedition?._id;

  const candidateName = personnel.name || personnel.userId?.name || 'Nominated Candidate';
  const employeeId = personnel.employeeId || personnel.userId?.employeeId || '—';
  const candidateRole = personnel.role || personnel.userId?.role || 'Expedition Member';

  const [clearance, setClearance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState('summary'); // 'summary' | 'assign' | 'record'
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Step 1: Assign Modules State
  const [selectedModules, setSelectedModules] = useState({});
  const [savingModules, setSavingModules] = useState(false);

  // Step 2: Record Result State
  const [recordingCat, setRecordingCat] = useState(null);
  const [recordForm, setRecordForm] = useState({
    trainingName: '',
    category: '',
    completedOn: new Date().toISOString().split('T')[0],
    instructorName: 'Vikram Sharma (Polar Instructor)',
    passed: true,
    certificateNumber: `ANT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: 'Successfully cleared practical and field assessment.'
  });
  const [savingRecord, setSavingRecord] = useState(false);

  // Step 3: Verify State
  const [verifying, setVerifying] = useState(false);
  const [verifyRemarks, setVerifyRemarks] = useState('');

  const fetchClearance = useCallback(async () => {
    if (!expeditionId || !personnelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCandidateTrainingClearanceApi(expeditionId, personnelId);
      const data = res?.data !== undefined ? res.data : res;
      if (data?.clearance) {
        setClearance(data.clearance);
        
        // Sync selected modules map
        const selMap = {};
        POLAR_MODULES_CATALOG.forEach(m => {
          const exists = (data.clearance.trainings || []).some(t => t.category === m.category);
          selMap[m.category] = exists;
        });
        setSelectedModules(selMap);
      }
    } catch (err) {
      console.error('Fetch training clearance error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch training clearance.');
    } finally {
      setLoading(false);
    }
  }, [expeditionId, personnelId]);

  useEffect(() => {
    fetchClearance();
  }, [fetchClearance]);

  const handleToggleModule = (category) => {
    setSelectedModules(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSaveAssignedModules = async () => {
    const modulesToAssign = POLAR_MODULES_CATALOG
      .filter(m => selectedModules[m.category])
      .map(m => ({ category: m.category, trainingName: m.trainingName }));

    if (modulesToAssign.length === 0) {
      setError('Please select at least one required training module.');
      return;
    }

    setSavingModules(true);
    setError(null);
    try {
      const res = await assignRequiredTrainingApi({
        personnelId,
        expeditionId,
        modules: modulesToAssign
      });
      const data = res?.data !== undefined ? res.data : res;
      if (data?.success) {
        setSuccessMsg('Training modules successfully assigned by HQ Command.');
        await fetchClearance();
        setActiveStep('summary');
        onUpdated && onUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error assigning training modules.');
    } finally {
      setSavingModules(false);
    }
  };

  const handleOpenRecordResult = (training) => {
    setRecordingCat(training.category);
    setRecordForm({
      trainingName: training.trainingName,
      category: training.category,
      completedOn: training.completedOn ? new Date(training.completedOn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      instructorName: training.instructorName || 'Vikram Sharma (Polar Training Lead)',
      passed: training.passed !== false,
      certificateNumber: training.certificateNumber || `ANT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      validUntil: training.validUntil ? new Date(training.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarks: training.remarks || 'Standard polar curriculum completed and verified.'
    });
    setActiveStep('record');
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!clearance?._id) return;
    setSavingRecord(true);
    setError(null);
    try {
      const res = await addTrainingRecordApi(clearance._id, {
        ...recordForm,
        passed: recordForm.passed === true || recordForm.passed === 'true',
        status: (recordForm.passed === true || recordForm.passed === 'true') ? 'PASSED' : 'FAILED'
      });
      const data = res?.data !== undefined ? res.data : res;
      if (data?.success) {
        setSuccessMsg(`Result for "${recordForm.trainingName}" recorded successfully.`);
        await fetchClearance();
        setActiveStep('summary');
        onUpdated && onUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error recording training result.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleVerifyHQClearance = async () => {
    if (!clearance?._id) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await verifyTrainingClearanceApi(clearance._id, { remarks: verifyRemarks });
      const data = res?.data !== undefined ? res.data : res;
      if (data?.success) {
        setSuccessMsg(data.message || 'HQ Command verified all training modules. Training status is now COMPLETED!');
        await fetchClearance();
        onUpdated && onUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error verifying training clearance.');
    } finally {
      setVerifying(false);
    }
  };

  const trainings = clearance?.trainings || [];
  const totalAssigned = trainings.length;
  const passedCount = trainings.filter(t => t.passed || t.status === 'PASSED').length;
  const allPassed = totalAssigned > 0 && passedCount === totalAssigned;
  const isCompleted = clearance?.overallStatus === 'COMPLETED';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3200, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#0f2744', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '22px' }}>school</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                POLAR TRAINING CLEARANCE WORKFLOW
              </h3>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#93c5fd' }}>
              Nominee: <strong>{candidateName}</strong> ({employeeId}) · {candidateRole} · Expedition <strong>{expedition?.expeditionCode || 'EXP-47'}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Workflow Progression Stepper */}
        <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0', padding: '0.6rem 1.5rem', gap: '1rem', alignItems: 'center' }}>
          {[
            { step: '1', title: 'Assign Training', desc: 'HQ Configures Modules', active: activeStep === 'assign' || totalAssigned === 0 },
            { step: '2', title: 'Conduct & Record', desc: 'Instructor Logs Results', active: activeStep === 'record' || (totalAssigned > 0 && !allPassed) },
            { step: '3', title: 'HQ Verification', desc: 'Certify & Complete', active: allPassed && !isCompleted }
          ].map((s, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: s.active ? 1 : 0.65 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: s.active ? '#0284c7' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: s.active ? '#0369a1' : '#475569' }}>{s.title}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B' }}>{s.desc}</div>
              </div>
              {idx < 2 && <span style={{ color: '#cbd5e1', marginLeft: '0.5rem' }}>➔</span>}
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.65rem 1rem', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.65rem 1rem', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC', fontSize: '0.8rem' }}>
            {successMsg}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading candidate polar training records...</div>
          ) : activeStep === 'assign' ? (
            /* ── VIEW A: ASSIGN MODULES ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>Step 1: Configure Required Polar Training Modules</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>HQ Command selects the mandatory Antarctic pre-deployment training programs for this candidate.</div>
                </div>
                <button onClick={() => setActiveStep('summary')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  ← Back to Records
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                {POLAR_MODULES_CATALOG.map((m) => {
                  const checked = !!selectedModules[m.category];
                  return (
                    <label key={m.category} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
                      border: `1px solid ${checked ? '#bae6fd' : '#E2E8F0'}`,
                      backgroundColor: checked ? '#f0f9ff' : '#fff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleModule(m.category)}
                          style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{m.trainingName}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>Category: {m.category}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: checked ? '#0284c7' : '#94a3b8' }}>
                        {m.icon}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep('summary')}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignedModules}
                  disabled={savingModules}
                  style={{ padding: '0.55rem 1.3rem', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                  {savingModules ? 'Saving Modules...' : 'Save Assigned Modules'}
                </button>
              </div>
            </div>
          ) : activeStep === 'record' ? (
            /* ── VIEW B: RECORD / UPDATE TRAINING RESULT ── */
            <form onSubmit={handleSaveResult} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>Step 2: Record Training Result (Instructor / Authority)</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Log evaluation date, certifying instructor, certificate ID and outcome.</div>
                </div>
                <button type="button" onClick={() => setActiveStep('summary')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  ← Back to Records
                </button>
              </div>

              <div style={{ backgroundColor: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Selected Module</div>
                <div style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.95rem', marginTop: '0.1rem' }}>{recordForm.trainingName}</div>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontFamily: 'monospace' }}>Category: {recordForm.category}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Training Date *</label>
                  <input
                    type="date"
                    required
                    value={recordForm.completedOn}
                    onChange={e => setRecordForm({ ...recordForm, completedOn: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Certifying Instructor *</label>
                  <input
                    type="text"
                    required
                    value={recordForm.instructorName}
                    onChange={e => setRecordForm({ ...recordForm, instructorName: e.target.value })}
                    placeholder="e.g. Vikram Sharma (ITBP / Polar Wing)"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Certificate Number</label>
                  <input
                    type="text"
                    value={recordForm.certificateNumber}
                    onChange={e => setRecordForm({ ...recordForm, certificateNumber: e.target.value })}
                    placeholder="e.g. ANT-2026-4421"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Valid Until</label>
                  <input
                    type="date"
                    value={recordForm.validUntil}
                    onChange={e => setRecordForm({ ...recordForm, validUntil: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Result Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Assessment Result *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRecordForm({ ...recordForm, passed: true })}
                    style={{
                      padding: '0.65rem', borderRadius: '6px', border: `2px solid ${recordForm.passed ? '#16a34a' : '#CBD5E1'}`,
                      backgroundColor: recordForm.passed ? '#dcfce7' : '#fff', color: recordForm.passed ? '#15803d' : '#64748B',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                    PASSED / CLEARED
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordForm({ ...recordForm, passed: false })}
                    style={{
                      padding: '0.65rem', borderRadius: '6px', border: `2px solid ${!recordForm.passed ? '#dc2626' : '#CBD5E1'}`,
                      backgroundColor: !recordForm.passed ? '#fee2e2' : '#fff', color: !recordForm.passed ? '#b91c1c' : '#64748B',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                    FAILED / RETEST REQUIRED
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Remarks & Performance Notes</label>
                <input
                  type="text"
                  value={recordForm.remarks}
                  onChange={e => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  placeholder="e.g. Demonstrated exemplary crevasse rescue technique"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep('summary')}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  style={{ padding: '0.55rem 1.3rem', borderRadius: '6px', border: 'none', backgroundColor: '#005B7F', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                  {savingRecord ? 'Recording...' : 'Record Training Result'}
                </button>
              </div>
            </form>
          ) : (
            /* ── VIEW C: MAIN SUMMARY & VERIFICATION ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Top Overview Status Box */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.25rem', borderRadius: '8px',
                backgroundColor: isCompleted ? '#f0fdf4' : allPassed ? '#ecfdf5' : '#f8fafc',
                border: `1px solid ${isCompleted ? '#86efac' : allPassed ? '#a7f3d0' : '#E2E8F0'}`
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748B' }}>
                    Overall Polar Clearance Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{
                      padding: '0.2rem 0.65rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 800,
                      backgroundColor: isCompleted ? '#dcfce7' : allPassed ? '#fef3c7' : '#f1f5f9',
                      color: isCompleted ? '#15803d' : allPassed ? '#b45309' : '#475569'
                    }}>
                      {isCompleted ? '✔ TRAINING COMPLETED' : allPassed ? '★ READY FOR HQ VERIFICATION' : `⏳ IN PROGRESS (${passedCount}/${totalAssigned} PASSED)`}
                    </span>
                    {clearance?.verifiedBy && (
                      <span style={{ fontSize: '0.72rem', color: '#15803d' }}>
                        Verified by <strong>{clearance.verifiedBy?.name || 'HQ Command'}</strong> on {clearance.verifiedAt ? new Date(clearance.verifiedAt).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setActiveStep('assign')}
                  style={{
                    padding: '0.45rem 0.85rem', backgroundColor: '#fff', color: '#0369a1',
                    border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>tune</span>
                  Configure Modules
                </button>
              </div>

              {/* Module Records Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                    Assigned Training Modules ({trainings.length})
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Click "Record / Update Result" to enter instructor clearance
                  </span>
                </div>

                {trainings.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94a3b8' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No Training Modules Configured</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Click "Configure Modules" above to assign required courses.</div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          {['Training Module', 'Instructor', 'Date / Cert No.', 'Result', 'Action'].map(h => (
                            <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trainings.map((t, idx) => {
                          const isPassed = t.passed || t.status === 'PASSED';
                          const isFailed = t.status === 'FAILED';
                          return (
                            <tr key={t._id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isPassed ? '#fcfdfc' : '#fff' }}>
                              {/* Module */}
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{t.trainingName}</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>Category: {t.category}</div>
                              </td>

                              {/* Instructor */}
                              <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>
                                {t.instructorName || t.instructor?.name || '—'}
                              </td>

                              {/* Date & Cert */}
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <div style={{ color: '#334155' }}>
                                  {t.completedOn ? new Date(t.completedOn).toLocaleDateString() : 'Not completed'}
                                </div>
                                {t.certificateNumber && (
                                  <div style={{ fontSize: '0.68rem', color: '#0369a1', fontFamily: 'monospace' }}>
                                    {t.certificateNumber}
                                  </div>
                                )}
                              </td>

                              {/* Result */}
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <span style={{
                                  display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                  backgroundColor: isPassed ? '#dcfce7' : isFailed ? '#fee2e2' : '#f1f5f9',
                                  color: isPassed ? '#15803d' : isFailed ? '#dc2626' : '#64748B'
                                }}>
                                  {isPassed ? '✓ PASSED' : isFailed ? '✕ FAILED' : '⏳ PENDING'}
                                </span>
                              </td>

                              {/* Action */}
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <button
                                  onClick={() => handleOpenRecordResult(t)}
                                  style={{
                                    padding: '0.28rem 0.6rem', backgroundColor: isPassed ? '#f8fafc' : '#005B7F',
                                    color: isPassed ? '#0369a1' : '#fff', border: isPassed ? '1px solid #cbd5e1' : 'none',
                                    borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  {isPassed ? 'Update Result' : 'Record Result'}
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

              {/* Step 3: HQ Command Final Verification Panel */}
              <div style={{
                padding: '1.25rem', borderRadius: '8px',
                backgroundColor: isCompleted ? '#f0fdf4' : allPassed ? '#fffbeb' : '#f8fafc',
                border: `1px solid ${isCompleted ? '#86efac' : allPassed ? '#fde68a' : '#E2E8F0'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isCompleted ? '#15803d' : allPassed ? '#d97706' : '#64748B' }}>
                    {isCompleted ? 'verified' : allPassed ? 'verified_user' : 'lock_clock'}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: isCompleted ? '#15803d' : allPassed ? '#92400e' : '#334155', textTransform: 'uppercase' }}>
                    Step 3: HQ Command Final Verification & Clearance
                  </h4>
                </div>

                {isCompleted ? (
                  <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.35rem' }}>
                    ✓ <strong>Training clearance officially certified by HQ Command.</strong> All required polar modules are passed and valid.
                  </div>
                ) : allPassed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                      All {totalAssigned} assigned training modules have been completed and passed. HQ Command can now verify and complete this candidate's polar training clearance.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="HQ Verification remarks (e.g. All practical survival & VHF radio scores verified)"
                        value={verifyRemarks}
                        onChange={e => setVerifyRemarks(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                      />
                      <button
                        onClick={handleVerifyHQClearance}
                        disabled={verifying}
                        style={{
                          padding: '0.55rem 1.25rem', backgroundColor: '#15803d', color: '#fff',
                          border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.82rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                        {verifying ? 'Verifying...' : 'Verify Training Clearance'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
                    HQ Verification is locked until all required training modules are marked as PASSED by the instructors. ({passedCount}/{totalAssigned} completed).
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
