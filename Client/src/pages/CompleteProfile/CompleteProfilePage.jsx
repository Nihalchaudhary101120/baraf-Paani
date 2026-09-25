import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { updateMyPersonnelProfileApi } from '@/api/personnel.api';
import './CompleteProfile.css';

const TOTAL_STEPS = 4;

const STEP_LABELS = [
  { icon: 'person', label: 'Personal' },
  { icon: 'contact_mail', label: 'Contact' },
  { icon: 'badge', label: 'Passport' },
  { icon: 'emergency', label: 'Emergency' },
];

const initialForm = {
  dateOfBirth: '',
  gender: '',
  nationality: 'Indian',
  maritalStatus: '',
  contact: {
    alternateEmail: '',
    alternateMobile: '',
    residentialAddress: {
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
  },
  passport: {
    passportNumber: '',
    passportType: '',
    issueDate: '',
    expiryDate: '',
    placeOfIssue: '',
  },
  emergencyContact: {
    name: '',
    relation: '',
    phone: '',
    address: '',
  },
};

export default function CompleteProfilePage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Helpers ── */
  const set = (path, value) => {
    setForm((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)); // deep clone
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await updateMyPersonnelProfileApi(form);
      // Refresh auth context so profileStatus becomes COMPLETED
      // We update user in storage manually to avoid an extra round-trip
      const updatedUser = { ...user, profileStatus: 'COMPLETED' };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      navigate('/dashboard', { replace: true });
      // Hard reload to sync AuthContext from storage
      window.location.replace('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="cp-root">
      {/* Background decoration */}
      <div className="cp-bg-orb cp-orb-1" />
      <div className="cp-bg-orb cp-orb-2" />

      <div className="cp-card">
        {/* Header */}
        <div className="cp-header">
          <span className="material-symbols-outlined cp-logo-icon">travel_explore</span>
          <div>
            <h1 className="cp-title">Complete Your Profile</h1>
            <p className="cp-subtitle">Welcome, {user?.name} — set up your personnel record before accessing the platform.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="cp-stepper">
          {STEP_LABELS.map((s, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <React.Fragment key={n}>
                <div className={`cp-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                  <div className="cp-step-circle">
                    {done
                      ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                      : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.icon}</span>}
                  </div>
                  <span className="cp-step-label">{s.label}</span>
                </div>
                {i < TOTAL_STEPS - 1 && <div className={`cp-step-line ${done ? 'done' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="cp-form-body">

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                <span className="material-symbols-outlined">person</span> Personal Information
              </h2>
              <div className="cp-grid-2">
                <div className="cp-field">
                  <label>Date of Birth <span className="required">*</span></label>
                  <input type="date" value={form.dateOfBirth}
                    onChange={e => set('dateOfBirth', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>Gender <span className="required">*</span></label>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="cp-field">
                  <label>Nationality</label>
                  <input type="text" value={form.nationality}
                    onChange={e => set('nationality', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>Marital Status</label>
                  <select value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Contact Info ── */}
          {step === 2 && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                <span className="material-symbols-outlined">contact_mail</span> Contact Details
              </h2>
              <div className="cp-grid-2">
                <div className="cp-field">
                  <label>Alternate Email</label>
                  <input type="email" value={form.contact.alternateEmail}
                    onChange={e => set('contact.alternateEmail', e.target.value)}
                    placeholder="alt@example.com" />
                </div>
                <div className="cp-field">
                  <label>Alternate Mobile</label>
                  <input type="tel" value={form.contact.alternateMobile}
                    onChange={e => set('contact.alternateMobile', e.target.value)}
                    placeholder="+91 00000 00000" />
                </div>
              </div>
              <h3 className="cp-sub-section">Residential Address</h3>
              <div className="cp-field cp-field-full">
                <label>Address Line</label>
                <input type="text" value={form.contact.residentialAddress.addressLine}
                  onChange={e => set('contact.residentialAddress.addressLine', e.target.value)}
                  placeholder="Street, Building, Apartment..." />
              </div>
              <div className="cp-grid-3">
                <div className="cp-field">
                  <label>City <span className="required">*</span></label>
                  <input type="text" value={form.contact.residentialAddress.city}
                    onChange={e => set('contact.residentialAddress.city', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>State</label>
                  <input type="text" value={form.contact.residentialAddress.state}
                    onChange={e => set('contact.residentialAddress.state', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>Postal Code</label>
                  <input type="text" value={form.contact.residentialAddress.postalCode}
                    onChange={e => set('contact.residentialAddress.postalCode', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>Country</label>
                  <input type="text" value={form.contact.residentialAddress.country}
                    onChange={e => set('contact.residentialAddress.country', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Passport ── */}
          {step === 3 && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                <span className="material-symbols-outlined">badge</span> Passport Details
              </h2>
              <div className="cp-grid-2">
                <div className="cp-field">
                  <label>Passport Number <span className="required">*</span></label>
                  <input type="text" value={form.passport.passportNumber}
                    onChange={e => set('passport.passportNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. A1234567" />
                </div>
                <div className="cp-field">
                  <label>Passport Type</label>
                  <select value={form.passport.passportType}
                    onChange={e => set('passport.passportType', e.target.value)}>
                    <option value="">Select type</option>
                    <option value="Ordinary">Ordinary (Blue)</option>
                    <option value="Official">Official (White)</option>
                    <option value="Diplomatic">Diplomatic</option>
                  </select>
                </div>
                <div className="cp-field">
                  <label>Issue Date</label>
                  <input type="date" value={form.passport.issueDate}
                    onChange={e => set('passport.issueDate', e.target.value)} />
                </div>
                <div className="cp-field">
                  <label>Expiry Date <span className="required">*</span></label>
                  <input type="date" value={form.passport.expiryDate}
                    onChange={e => set('passport.expiryDate', e.target.value)} />
                </div>
                <div className="cp-field cp-field-full">
                  <label>Place of Issue</label>
                  <input type="text" value={form.passport.placeOfIssue}
                    onChange={e => set('passport.placeOfIssue', e.target.value)}
                    placeholder="City, Country" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Emergency Contact ── */}
          {step === 4 && (
            <div className="cp-section">
              <h2 className="cp-section-title">
                <span className="material-symbols-outlined">emergency</span> Emergency Contact
              </h2>
              <div className="cp-grid-2">
                <div className="cp-field">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" value={form.emergencyContact.name}
                    onChange={e => set('emergencyContact.name', e.target.value)}
                    placeholder="Contact person's full name" />
                </div>
                <div className="cp-field">
                  <label>Relation <span className="required">*</span></label>
                  <input type="text" value={form.emergencyContact.relation}
                    onChange={e => set('emergencyContact.relation', e.target.value)}
                    placeholder="e.g. Spouse, Parent, Sibling" />
                </div>
                <div className="cp-field">
                  <label>Phone Number <span className="required">*</span></label>
                  <input type="tel" value={form.emergencyContact.phone}
                    onChange={e => set('emergencyContact.phone', e.target.value)}
                    placeholder="+91 00000 00000" />
                </div>
                <div className="cp-field">
                  <label>Address</label>
                  <input type="text" value={form.emergencyContact.address}
                    onChange={e => set('emergencyContact.address', e.target.value)}
                    placeholder="Emergency contact's address" />
                </div>
              </div>

              {/* Review Summary */}
              <div className="cp-review-box">
                <div className="cp-review-title">
                  <span className="material-symbols-outlined">fact_check</span>
                  Profile Summary
                </div>
                <div className="cp-review-grid">
                  <div><span>Date of Birth</span><strong>{form.dateOfBirth || '—'}</strong></div>
                  <div><span>Gender</span><strong>{form.gender || '—'}</strong></div>
                  <div><span>Nationality</span><strong>{form.nationality || '—'}</strong></div>
                  <div><span>Passport</span><strong>{form.passport.passportNumber || '—'}</strong></div>
                  <div><span>Emergency Contact</span><strong>{form.emergencyContact.name || '—'}</strong></div>
                  <div><span>City</span><strong>{form.contact.residentialAddress.city || '—'}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="cp-error">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="cp-footer">
          <button className="cp-btn cp-btn-ghost" onClick={logout} disabled={loading}>
            <span className="material-symbols-outlined">logout</span> Sign Out
          </button>
          <div className="cp-nav-btns">
            {step > 1 && (
              <button className="cp-btn cp-btn-secondary" onClick={back} disabled={loading}>
                <span className="material-symbols-outlined">arrow_back</span> Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button className="cp-btn cp-btn-primary" onClick={next}>
                Next <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            ) : (
              <button className="cp-btn cp-btn-submit" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? <><span className="material-symbols-outlined spin">sync</span> Saving...</>
                  : <><span className="material-symbols-outlined">check_circle</span> Complete &amp; Enter Platform</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
