import './ftp.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRol } from '../../../auth/hooks/useRol';
import NavCard from '../../../shared/componentes/NavCard';
import TopBar from '../../../shared/componentes/TopBar';
import { getGreeting } from '../utils/horario';

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

/**
 * Página de inicio del módulo Indicadores Médicos.
 * Es la MISMA vista para todos los roles -- lo único que cambia es que la
 * tarjeta "Generar indicadores" solo aparece si el rol puede generar algo
 * (el visitante ve exactamente esta pantalla, nada más ni menos).
 */
const FTPPage = () => {
  const navigate = useNavigate();
  const { icono } = getGreeting();
  const { puedeGenFTP, puedeGenIAAS } = useRol();

  const puedeGenerar   = puedeGenFTP || puedeGenIAAS;
  const navDestGenerar =
    puedeGenFTP && puedeGenIAAS ? '/CIAE/IndicadoresMedicos/Generar'     :
    puedeGenFTP                 ? '/CIAE/IndicadoresMedicos/FTP/Generar' :
                                  '/CIAE/IndicadoresMedicos/IAAS/Reporte';

  useEffect(() => { document.title = 'Indicadores | CIAE'; }, []);

  return (
    <div className="ftp-screen-container">

      <div className="ftp-bg-decor" aria-hidden="true">
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/Inicio" />

      <main className="ftp-main-content ftp-hub-main">

        <div className="ftp-hero-hub">
          <div className="ftp-greeting">
            <span className="ftp-greeting-icon">
              {icono === 'day'       && <IconDay />}
              {icono === 'afternoon' && <IconAfternoon />}
              {icono === 'night'     && <IconNight />}
            </span>
          </div>
          <h1 className="ftp-hub-title-main">Indicadores Médicos</h1>
          <p className="ftp-hub-sub">¿Qué deseas hacer?</p>
        </div>

        <div className="home-cards ftp-hub-cards">

          <NavCard
            titulo="Seguimiento de Indicadores"
            eyebrow="Consulta"
            desc="Identifica tendencias de cumplimiento y resultados por unidad médica conforme al MMIM."
            chips={['Tendencias', 'Cumplimiento']}
            color="green"
            onClick={() => navigate('/CIAE/IndicadoresMedicos/Graficas')}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </NavCard>

          {puedeGenerar && (
            <NavCard
              titulo="Generar indicadores"
              eyebrow="Generación"
              desc="Produce los reportes de indicadores médicos para evaluación del desempeño por unidad conforme al MMIM."
              chips={['Reportes', 'Excel']}
              color="gold"
              onClick={() => navigate(navDestGenerar)}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default FTPPage;
