import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import logo_imss from '../../../assets/logo_imms.png';
import NavCard from '../../components/NavCard';
import "./inicio.css";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return { saludo: 'Buenos días',   icono: 'day' };
  if (h >= 12 && h < 19) return { saludo: 'Buenas tardes', icono: 'afternoon' };
  return                         { saludo: 'Buenas noches', icono: 'night' };
};

const IconDay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconAfternoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 12h.01M12 2a10 10 0 0 1 0 20"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);
const IconNight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SeleccionPage = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { saludo, icono } = getGreeting();

  const handleLogout = () => {
    logout();
    navigate('/CIAE/LOGIN');
  };

  useEffect(() => {
    document.title = "Inicio | CIAE";
    console.log(user)
  }, []);

  return (
    <div className="home-root">

      <div className="home-bg" aria-hidden="true">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
        <div className="home-grid" />
      </div>

      <nav className="home-nav">
        <div className="home-nav-left">
          <img src={logo_imss} alt="IMSS" className="home-logo" />
          <div className="home-nav-divider" />
          <span className="home-nav-label">Panel de Control</span>
        </div>
        <div className="home-nav-right">
          <div className="home-user-chip">
            <span className="home-user-dot" />
            <span>{user?.user || 'Invitado'}</span>
          </div>
          <button className="home-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </nav>

      <main className="home-main">

        <div className="home-hero">
          <div className="home-hero-greeting">
            <span className="home-hero-greeting-icon">
              {icono === 'day'       && <IconDay />}
              {icono === 'afternoon' && <IconAfternoon />}
              {icono === 'night'     && <IconNight />}
            </span>
            <span className="home-hero-saludo">{saludo},</span>
          </div>
          <h1 className="home-hero-name-big">
            {user?.user || 'Usuario'}
          </h1>
          <p className="home-hero-sub">
            Selecciona el módulo con el que deseas trabajar
          </p>
        </div>

        <div className="home-cards">

          <NavCard
            titulo="Indicadores Médicos"
            eyebrow="Módulo activo"
            desc="Consulta y generación de indicadores mediante la integración de archivos FTP y Exceles de bases."
            chips={['FTP', 'Excel']}
            color="green"
            onClick={() => navigate('/CIAE/IndicadoresMedicos')}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </NavCard>

          {user.rol === 'admin' && (
            <NavCard
              titulo="Epidemiología"
              eyebrow="Módulo activo"
              desc="Vigilancia Epidemiológica: Análisis y seguimiento de enfermedades prioritarias en el OOAD Guanajuato."
              chips={['Dengue']}
              color="tinto"
              onClick={() => navigate('/CIAE/Epidemiologia')}
            >
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="19" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9"/>
                <ellipse cx="18" cy="19" rx="5" ry="12" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
                <line x1="6" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
                <path d="M8 13.5 Q18 10.5 28 13.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
                <path d="M8 24.5 Q18 27.5 28 24.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
                <circle cx="31" cy="30" r="8" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.95" fill="none"/>
                <line x1="37" y1="36" x2="43" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.95"/>
                <circle cx="31" cy="30" r="2.6" fill="currentColor" fillOpacity="0.85"/>
                <line x1="31" y1="25.8" x2="31" y2="24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="31" y1="34.2" x2="31" y2="36" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="26.8" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="35.2" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="27.9" y1="27.1" x2="26.7" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="34.1" y1="32.9" x2="35.3" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="34.1" y1="27.1" x2="35.3" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="27.9" y1="32.9" x2="26.7" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="24" cy="24" r="1.3" fill="currentColor" fillOpacity="0.55"/>
                <circle cx="37" cy="24" r="1.1" fill="currentColor" fillOpacity="0.45"/>
              </svg>
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default SeleccionPage;
