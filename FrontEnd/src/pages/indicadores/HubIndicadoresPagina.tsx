// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoActividad, IconoPeriodoDelDia, IconoSubir } from '@/components/icons';
import { useAuth, useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import { getGreeting } from '@/utils/horario';
import './indicadores.css';

/**
 * Página de inicio del módulo Indicadores Médicos.
 * La tarjeta "Generar indicadores" se oculta solo para quien no puede
 * generar NADA (hoy, únicamente el visitante) -- admin/trabajador_ftp/
 * trabajador_IAAS siempre tienen al menos un permiso de generación, así
 * que siempre la ven habilitada aquí. El detalle de "FTP sí, IAAS no" (o
 * viceversa) se ve un nivel más adentro, en GenerarHubPagina, con el patrón
 * de tarjeta deshabilitada.
 */
const HubIndicadoresPagina = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { icono } = getGreeting();
  const { puedeGenFTP, puedeGenIAAS, esVisitante } = useRol();

  const puedeGenerar = puedeGenFTP || puedeGenIAAS;
  // Siempre al hub de seleccion (GenerarHubPagina), igual para todos los roles --
  // ahi es donde se ve FTP/IAAS habilitado o deshabilitado segun el permiso.
  const navDestGenerar = '/CIAE/IndicadoresMedicos/Generar';

  const handleLogout = () => {
    logout();
    navigate('/CIAE/LOGIN');
  };

  useEffect(() => { document.title = 'Indicadores | CIAE'; }, []);

  return (
    <div className="ftp-screen-container">

      <div className="ftp-bg-decor" aria-hidden="true">
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
        <div className="ciae-grid" />
      </div>

      {esVisitante ? <TopBar onLogout={handleLogout} /> : <TopBar backTo="/CIAE/Inicio" />}

      <main className="ftp-main-content ftp-hub-main">

        <div className="ftp-hero-hub">
          <div className="ftp-greeting">
            <span className="ftp-greeting-icon">
              <IconoPeriodoDelDia periodo={icono} tamano={18} />
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
            <IconoActividad />
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
              <IconoSubir />
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default HubIndicadoresPagina;
