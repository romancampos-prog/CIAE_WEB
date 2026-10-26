// react
import { useNavigate } from 'react-router-dom';
// propios
import { useRol } from '@/features/auth';
import TopBar from '@/components/TopBar';
import '@/pages/indicadores/indicadores.css';

/**
 * Página de inicio del sub-módulo FTP.
 * Presenta las tarjetas Ver datos y Generar reporte según el rol del usuario.
 */
const MenuFtpPagina = () => {
  const navigate = useNavigate();
  const { puedeGenFTP, esVisitante } = useRol();

  return (
    <div className="ftp-screen-container">
      <div className="ftp-bg-decor" aria-hidden>
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
      </div>

      <TopBar backTo={esVisitante ? '/CIAE/Inicio' : '/CIAE/IndicadoresMedicos'} />

      <div className="ftp-hub-main">
        <div className="ftp-hero-hub">
          <h1 className="ftp-hub-title-main">FTP</h1>
          <p className="ftp-hub-sub">Servidor FTP · Indicadores Médicos — ¿Qué deseas hacer?</p>
        </div>

        <div className="ftp-hub-cards">

          {/* Ver datos */}
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/Graficas')}>
            <div className="hc-header hc-header--green">
              <div className="hc-icon-box hc-icon-box--green">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Consulta</p>
                <h2 className="hc-name">Ver datos</h2>
              </div>
            </div>
            <p className="hc-desc">
              Gráfica de tendencia mensual por unidad e indicador, con semáforo de desempeño.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--green">CACU</span>
                <span className="hc-chip hc-chip--green">CAMA</span>
                <span className="hc-chip hc-chip--green">EH</span>
                <span className="hc-chip hc-chip--green">DM · MT · CE…</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Generar reporte */}
          {puedeGenFTP && (
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP/Generar')}>
            <div className="hc-header hc-header--gold">
              <div className="hc-icon-box hc-icon-box--gold">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Generación</p>
                <h2 className="hc-name">Generar reporte</h2>
              </div>
            </div>
            <p className="hc-desc">
              Descarga datos del FTP y genera el reporte Excel para cualquier indicador y mes.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--gold">Todos los indicadores</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MenuFtpPagina;
