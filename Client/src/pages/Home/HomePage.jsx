import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';
import maitriImg from '@/assets/maitri.jpg';
import bharatiImg from '@/assets/bharati.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePortalAccess = () => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    } else {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <div style={{ width: '100%', backgroundColor: '#f7fafc', color: '#181c1e', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Sovereign Institutional Masthead Notification */}
      <div style={{
        backgroundColor: '#f1f4f6',
        borderBottom: '1px solid rgba(192, 199, 206, 0.3)',
        padding: '0.4rem 1.5rem',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', backgroundColor: '#E65A28' }}></div>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justify: 'space-between',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: '#40484e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#00425e',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>IN</span>
            <span style={{ fontWeight: 600, color: '#181c1e' }}>भारत सरकार | Government of India</span>
            <span style={{ color: '#c0c7ce' }}>•</span>
            <span>Ministry of Earth Sciences (MoES)</span>
            <span style={{ color: '#c0c7ce' }}>•</span>
            <span>National Centre for Polar and Ocean Research (NCPOR)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#181c1e' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
              PORTAL STATUS: OPERATIONAL
            </span>
            <span style={{ color: '#c0c7ce' }}>|</span>
            <span style={{ color: '#40484e' }}>{utcTime || 'UTC --:--:--'}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: HERO SECTION */}
      <section style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #ebeef0',
        padding: '4rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Institutional Emblem Crest */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            backgroundColor: '#005b7f',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>shield</span>
          </div>

          {/* Overline Label */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            backgroundColor: 'rgba(230, 90, 40, 0.1)',
            color: '#E65A28',
            border: '1px solid rgba(230, 90, 40, 0.3)',
            fontSize: '0.75rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
            textTransform: 'uppercase'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E65A28' }}></span>
            Sovereign Polar Research Infrastructure
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: '2.5rem',
            letterSpacing: '-0.02em',
            fontWeight: 700,
            color: '#00425e',
            marginBottom: '0.25rem'
          }}>
            N I R A N T A R
          </h1>

          <p style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#0a629e',
            marginBottom: '1.25rem'
          }}>
            Polar Expedition Digital Operations Platform
          </p>

          <p style={{
            fontSize: '1rem',
            color: '#40484e',
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '750px'
          }}>
            A unified national digital platform supporting the planning, scientific coordination, and logistics governance of India's polar expedition operations across Antarctica, the Arctic, and the Southern Ocean.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button
              onClick={handlePortalAccess}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#00425e',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: '4px',
                border: '2px solid #E65A28',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#E65A28' }}>lock</span>
              OPERATIONAL PORTAL LOGIN
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#E65A28' }}>arrow_forward</span>
            </button>

            <a
              href="#programme-overview"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ebeef0',
                color: '#00425e',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: '4px',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease'
              }}
            >
              Explore Public Information
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>south</span>
            </a>
          </div>

          {/* Underline Institutional Lockup */}
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid #ebeef0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#40484e'
          }}>
            <span style={{ fontWeight: 600, color: '#00425e' }}>Ministry of Earth Sciences</span>
            <span>•</span>
            <span>National Centre for Polar and Ocean Research (NCPOR), Goa</span>
            <span>•</span>
            <span style={{
              backgroundColor: '#e5e9eb',
              color: '#181c1e',
              padding: '0.15rem 0.5rem',
              borderRadius: '2px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem'
            }}>PUBLIC GATEWAY V2.0</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: INDIAN ANTARCTIC PROGRAMME */}
      <section id="programme-overview" style={{ padding: '4rem 1.5rem', backgroundColor: '#f7fafc', borderBottom: '1px solid #ebeef0' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '10px', height: '24px', backgroundColor: '#E65A28', borderRadius: '2px' }}></span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#00425e', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                Indian Antarctic Programme
              </h2>
            </div>
            <div style={{ width: '96px', height: '4px', backgroundColor: '#0a629e', marginBottom: '1rem' }}></div>
            <p style={{ color: '#40484e', fontSize: '1rem', maxWidth: '900px', lineHeight: 1.6 }}>
              India conducts high-latitude scientific research in Antarctica through permanent year-round bases and annual multi-disciplinary expeditions. The National Centre for Polar and Ocean Research (NCPOR), an autonomous research institution under the Ministry of Earth Sciences, steers national logistics, vessel routing, scientific clearances, and environmental stewardship across polar realms.
            </p>
          </div>

          {/* 3 Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Card 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #ebeef0'
            }}>
              <div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f4f6',
                  color: '#00425e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>biotech</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#00425e', marginBottom: '0.5rem' }}>Scientific Research</h3>
                <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Interdisciplinary inquiry spanning polar atmospheric dynamics, paleoclimate reconstruction from ice cores, coastal glaciology, biological adaptomics, space weather observation, and Southern Ocean biogeochemistry.
                </p>
              </div>
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #ebeef0', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0a629e', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>Madrid Protocol Compliance</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #ebeef0'
            }}>
              <div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f4f6',
                  color: '#00425e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>holiday_village</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#00425e', marginBottom: '0.5rem' }}>Research Bases</h3>
                <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Sustained, continuous overwinter operations at two premier bases: Maitri in the central Dronning Maud Land ice-free Schirmacher Oasis, and Bharati on the East Antarctic coast of Larsemann Hills.
                </p>
              </div>
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #ebeef0', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0a629e', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>2 Active Year-Round Bases</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>domain</span>
              </div>
            </div>

            {/* Card 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #ebeef0'
            }}>
              <div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f4f6',
                  color: '#00425e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>anchor</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#00425e', marginBottom: '0.5rem' }}>Expedition Operations</h3>
                <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Organization and sovereign coordination of annual Indian Scientific Expeditions to Antarctica (ISEA), chartered ice-class supply vessels, specialized rotary aircraft, and heavy-cargo traverse convoys.
                </p>
              </div>
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #ebeef0', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0a629e', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>Annual ISEA Campaigns</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>navigation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: INDIAN RESEARCH STATIONS SHOWCASE */}
      <section id="stations-overview" style={{ padding: '4rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #ebeef0' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '10px', height: '24px', backgroundColor: '#E65A28', borderRadius: '2px' }}></span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#00425e', textTransform: 'uppercase' }}>
                Indian Research Stations in Antarctica
              </h2>
            </div>
            <div style={{ width: '96px', height: '4px', backgroundColor: '#0a629e', marginBottom: '1rem' }}></div>
            <p style={{ color: '#40484e', fontSize: '1rem', maxWidth: '800px' }}>
              India maintains continuous strategic and scientific presence across continental Antarctica, running state-of-the-art laboratory instrumentation, satellite relay downlinks, and long-term observational baselines.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {/* STATION 1: MAITRI */}
            <div style={{
              backgroundColor: '#f1f4f6',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #ebeef0'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e5e9eb', border: '1px solid #c0c7ce' }}>
                  <img src={maitriImg} alt="Maitri Station, Antarctica" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(0, 66, 94, 0.9)',
                    color: '#ffffff',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem'
                  }}>
                    70°45′57″ S, 11°44′09″ E
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ backgroundColor: '#d0e4ff', color: '#004c7d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Commissioned 1989
                    </span>
                    <span style={{ backgroundColor: '#ebeef0', color: '#40484e', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      Inland Station • Schirmacher Oasis
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#00425e', marginBottom: '0.25rem' }}>
                    MAITRI STATION
                  </h3>
                  <p style={{ color: '#0a629e', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                    Central Dronning Maud Land, Antarctica • Elevation 117m
                  </p>
                  <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    Commissioned in 1989 as India's second permanent research facility in Antarctica, Maitri stands on an ice-free rocky oasis approximately 100 kilometers inland from the Princess Astrid Coast. Maitri serves as an indispensable platform for geomagnetism, seismic studies, meteorological atmospheric profiling, human physiology in isolated conditions, and paleoclimatic sampling of freshwater oasis lakes such as Lake Priyadarshini.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #ebeef0' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#40484e' }}>Distance to Sea Coast</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00425e', fontFamily: "'JetBrains Mono', monospace" }}>~100 km (Shelf Ice)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#40484e' }}>Core Disciplines</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00425e', fontFamily: "'JetBrains Mono', monospace" }}>Geomagnetism, Seismology</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATION 2: BHARATI */}
            <div style={{
              backgroundColor: '#f1f4f6',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #ebeef0'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ backgroundColor: '#d0e4ff', color: '#004c7d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Commissioned 2012
                    </span>
                    <span style={{ backgroundColor: '#ebeef0', color: '#40484e', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      Coastal Station • Larsemann Hills
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#00425e', marginBottom: '0.25rem' }}>
                    BHARATI STATION
                  </h3>
                  <p style={{ color: '#0a629e', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                    East Antarctica • Thala Fjord / Quilty Bay • Elevation 35m
                  </p>
                  <p style={{ color: '#40484e', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    Operational since 2012, Bharati is India's premier aerodynamic coastal research station, assembled from 134 prefabricated shipping containers clad in high-durability thermal envelopes. Elevated on stilts to prevent snow drift accumulation, Bharati hosts advanced laboratories for oceanography, atmospheric chemistry, and continental breakup studies. It also houses dedicated satellite tracking ground stations relaying earth observation imagery directly to the National Remote Sensing Centre (NRSC) in Shadnagar, India.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #ebeef0' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#40484e' }}>Facility Architecture</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00425e', fontFamily: "'JetBrains Mono', monospace" }}>Elevated 134 Container Unit</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#40484e' }}>Core Disciplines</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00425e', fontFamily: "'JetBrains Mono', monospace" }}>Oceanography, Satellite Data</div>
                    </div>
                  </div>
                </div>

                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e5e9eb', border: '1px solid #c0c7ce' }}>
                  <img src={bharatiImg} alt="Bharati Station, Antarctica" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(0, 66, 94, 0.9)',
                    color: '#ffffff',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem'
                  }}>
                    69°24′28″ S, 76°11′14″ E
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: STATION COMPARATIVE REFERENCE TABLE */}
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #ebeef0' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '10px', height: '24px', backgroundColor: '#E65A28', borderRadius: '2px' }}></span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#00425e', textTransform: 'uppercase' }}>
                Station Comparative Reference
              </h2>
            </div>
            <div style={{ width: '96px', height: '4px', backgroundColor: '#0a629e', marginBottom: '1rem' }}></div>
            <p style={{ color: '#40484e', fontSize: '1rem', maxWidth: '800px' }}>
              Authoritative technical baseline comparing the operational and geographic environments of India's two permanent polar research facilities.
            </p>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #ebeef0', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#ebeef0', borderBottom: '2px solid #ebeef0', color: '#00425e', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.5rem', width: '25%' }}>Parameter / Baseline</th>
                  <th style={{ padding: '1rem 1.5rem', width: '37.5%', color: '#00425e' }}>Maitri Station</th>
                  <th style={{ padding: '1rem 1.5rem', width: '37.5%', color: '#00425e' }}>Bharati Station</th>
                </tr>
              </thead>
              <tbody style={{ color: '#181c1e' }}>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Year Commissioned</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>1989 (8th ISEA)</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>2012 (31st ISEA)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Geographical Coordinates</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>70°45′57″ S, 11°44′09″ E</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>69°24′28″ S, 76°11′14″ E</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Regional Sector</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Central Dronning Maud Land (CDML)</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Larsemann Hills, Ingrid Christensen Coast</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Physiographic Type</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Inland Rocky Oasis (Schirmacher Oasis)</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Coastal Rocky Promontory (Grovnes Peninsula)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Distance to Open Coast</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>~100 km (traversed over continental shelf)</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>Immediate coastal access (Thala Fjord)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Station Elevation</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>117 meters above MSL</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontFamily: "'JetBrains Mono', monospace" }}>35 meters above MSL</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ebeef0' }}>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Primary Scientific Thrusts</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Geomagnetism, Seismological array, Paleolimnology, Human physiology.</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>Physical & chemical oceanography, Upper atmospheric physics, Satellite Ground Station.</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: '#00425e' }}>Environmental Compliance</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#ebeef0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#047857' }}>check_circle</span>
                      Madrid Protocol Annex III/IV
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#ebeef0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#047857' }}>check_circle</span>
                      Madrid Protocol Annex III/IV
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 5: OPERATIONAL PERSONNEL ACCESS GATEWAY */}
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#f1f4f6' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '2.5rem',
            border: '2px solid rgba(0, 66, 94, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: '#E65A28' }}></div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justify: 'space-between', gap: '2rem' }}>
              <div style={{ maxWidth: '750px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00425e', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>verified_user</span>
                  Restricted Operational Zone
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#00425e', marginBottom: '0.5rem' }}>
                  Operational Personnel Access Gateway
                </h3>
                <p style={{ color: '#40484e', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Authorized expedition scientists, station commanders, vessel masters, logistics coordinators, and NCPOR HQ operations directors can proceed to the encrypted operational console to access mission schedules, supply chain records, station technical data, and satellite links.
                </p>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(230, 90, 40, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(230, 90, 40, 0.3)',
                  fontSize: '0.8rem',
                  color: '#181c1e'
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#E65A28', fontSize: '18px', shrink: 0, marginTop: '2px' }}>shield_with_house</span>
                  <span>
                    <strong style={{ color: '#E65A28', fontWeight: 600 }}>Statutory Notice:</strong> This is a sovereign information system of the Government of India. All logins, connection telemetry, and unauthorized access attempts are monitored and recorded under the Information Technology Act, 2000.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handlePortalAccess}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.85rem 1.75rem',
                    backgroundColor: '#E65A28',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#742000'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#E65A28'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>vpn_key</span>
                  OPERATIONAL PORTAL LOGIN
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                </button>
                <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#40484e' }}>
                  Requires MoES SSO or NCPOR Token
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
