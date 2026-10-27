// react
import { useNavigate } from 'react-router-dom';
// propios
import { IconoActividad, IconoFlechaDerecha, IconoSubir } from '@/components/icons';
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
                <IconoActividad />
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
                <IconoFlechaDerecha />
              </div>
            </div>
          </div>

          {/* Generar reporte */}
          {puedeGenFTP && (
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP/Generar')}>
            <div className="hc-header hc-header--gold">
              <div className="hc-icon-box hc-icon-box--gold">
                <IconoSubir />
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
                <IconoFlechaDerecha />
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
