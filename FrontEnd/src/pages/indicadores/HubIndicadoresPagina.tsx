// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoModuloGenerar, IconoModuloSeguimiento, IconoPeriodoDelDia } from '@/components/icons';
import { useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import { getGreeting } from '@/utils/horario';
import './indicadores.css';

/**
 * Página de inicio del módulo Indicadores Médicos.
 * La tarjeta "Generar indicadores" se oculta para quien no puede generar nada
 * (la unidad y edita_epidemiologia). El detalle de "IAAS sí, FTP no" se ve un
 * nivel más adentro, en GenerarHubPagina, con el patrón de tarjeta deshabilitada.
 */
const HubIndicadoresPagina = () => {
  const navigate = useNavigate();
  const { icono } = getGreeting();
  const { puedeGenFTP, puedeGenIAAS } = useRol();

  const puedeGenerar = puedeGenFTP || puedeGenIAAS;
  // Siempre al hub de seleccion (GenerarHubPagina), igual para todos los roles --
  // ahi es donde se ve FTP/IAAS habilitado o deshabilitado segun el permiso.
  const navDestGenerar = '/CIAE/IndicadoresMedicos/Generar';

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
            desc="Consulta la tendencia, el semáforo y el resultado de cada unidad, conforme al MMIM."
            chips={['Tendencias', 'Cumplimiento']}
            color="green"
            onClick={() => navigate('/CIAE/IndicadoresMedicos/Graficas')}
          >
            <IconoModuloSeguimiento />
          </NavCard>

          {puedeGenerar && (
            <NavCard
              titulo="Generar indicadores"
              eyebrow="Generación"
              desc="Genera y descarga en Excel los indicadores de cada periodo, por módulo: FTP, IAAS o Extractor."
              chips={['Reportes', 'Excel']}
              color="gold"
              onClick={() => navigate(navDestGenerar)}
            >
              <IconoModuloGenerar />
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default HubIndicadoresPagina;
