import './ftp.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo_imss from '../../assets/logo_imms.png';
import { useAuth } from '../../auth/context/AuthContext';
import { useRol } from '../../auth/hooks/useRol';
import NavCard from '../../shared/components/NavCard';

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const GenerarHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { puedeGenFTP, puedeGenIASS } = useRol();

  useEffect(() => { document.title = 'Generar | CIAE'; }, []);

  return (
    <div className="ftp-screen-container">

      <div className="ftp-bg-decor" aria-hidden="true">
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
        <div className="ciae-grid" />
      </div>

      <header className="ftp-top-bar">
        <div className="ftp-nav-left">
          <img src={logo_imss} alt="IMSS" className="ftp-logo-top" />
          <div className="ftp-nav-divider" />
          <button className="ftp-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Indicadores Médicos
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

        <div className="ftp-hero-hub">
          <h1 className="ftp-hub-title-main">Generar indicadores</h1>
          <p className="ftp-hub-sub">Selecciona el módulo a generar</p>
        </div>

        <div className="home-cards ftp-hub-cards">

          <NavCard
            titulo="FTP"
            eyebrow="Servidor FTP"
            desc="Descarga datos del servidor FTP y genera reportes Excel por indicador, mes o semana."
            chips={['CACU', 'CAMA', 'EH', 'DM', 'etc.']}
            color="green"
            disabled={!puedeGenFTP}
            onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP/Generar')}
          >
            <UploadIcon />
          </NavCard>

          <NavCard
            titulo="IASS"
            eyebrow="Generador"
            desc="Sube archivos por unidad y genera los 6 reportes de atención a la salud en un solo paso."
            chips={['IASS 01–06']}
            color="gold"
            disabled={!puedeGenIASS}
            onClick={() => navigate('/CIAE/IndicadoresMedicos/IASS/Reporte')}
          >
            <UploadIcon />
          </NavCard>

        </div>
      </main>
    </div>
  );
};

export default GenerarHub;
