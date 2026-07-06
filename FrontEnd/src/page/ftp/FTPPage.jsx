import './ftp.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo_imss from '../../assets/logo_imms.png';
import { useAuth } from '../../context/AuthContext';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return { saludo: 'Buenos días',   icono: 'day' };
  if (h >= 12 && h < 19) return { saludo: 'Buenas tardes', icono: 'afternoon' };
  return                         { saludo: 'Buenas noches', icono: 'night' };
};

const IconDay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconAfternoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);
const IconNight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const FTPPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { icono } = getGreeting();

  useEffect(() => { document.title = "Indicadores | CIAE"; }, []);

  return (
    <div className="ftp-screen-container">

      <div className="ftp-bg-decor" aria-hidden="true">
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
        <div className="ciae-grid" />
      </div>

      {/* Nav */}
      <header className="ftp-top-bar">
        <div className="ftp-nav-left">
          <img src={logo_imss} alt="IMSS" className="ftp-logo-top" />
          <div className="ftp-nav-divider" />
          <button className="ftp-btn-back" onClick={() => navigate('/CIAE/Inicio')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Inicio
          </button>
        </div>
        <div className="ftp-nav-right">
          <div className="ftp-user-chip">
            <span className="ftp-user-dot" />
            {user?.user || 'Invitado'}
          </div>
        </div>
      </header>

      <main className="ftp-main-content ftp-hub-main">

        {/* Hero */}
        <div className="ftp-hero-hub">
          <div className="ftp-greeting">
            <span className="ftp-greeting-icon">
              {icono === 'day'       && <IconDay />}
              {icono === 'afternoon' && <IconAfternoon />}
              {icono === 'night'     && <IconNight />}
            </span>
          </div>
          <h1 className="ftp-hub-title-main">Indicadores Médicos</h1>
          <p className="ftp-hub-sub">Selecciona el tipo de indicador a trabajar</p>
        </div>

        {/* Módulos */}
        <div className="home-cards ftp-hub-cards">

          {/* FTP */}
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP')}>
            <div className="hc-header hc-header--green">
              <div className="hc-icon-box hc-icon-box--green">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Servidor FTP</p>
                <h2 className="hc-name">FTP</h2>
              </div>
            </div>
            <p className="hc-desc">
              Descarga y genera reportes de indicadores institucionales
              directamente desde el servidor FTP.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--green">CACU</span>
                <span className="hc-chip hc-chip--green">CAMA</span>
                <span className="hc-chip hc-chip--green">EH</span>
                <span className="hc-chip hc-chip--green">DM</span>
                <span className="hc-chip hc-chip--green">etc.</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

          {/* IASS */}
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/IASS')}>
            <div className="hc-header hc-header--gold">
              <div className="hc-icon-box hc-icon-box--gold">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8m-4-4v4"/>
                  <path d="M7 8h.01M11 8h6M7 12h.01M11 12h6"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Generador</p>
                <h2 className="hc-name">IASS</h2>
              </div>
            </div>
            <p className="hc-desc">
              Genera los 6 reportes de atención a la salud por unidad médica
              en un solo paso (IASS 01–06).
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--gold">IASS 01–06</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default FTPPage;
