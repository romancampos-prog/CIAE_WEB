import './indicadores.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
// propios
import { IconoModuloExtractor, IconoModuloFtp, IconoModuloIaas } from '@/components/icons';

/**
 * Hub de selección de módulo de generación.
 * Muestra las tarjetas FTP e IAAS; las deshabilita si el usuario no tiene permiso.
 */
const GenerarHubPagina = () => {
  const navigate = useNavigate();
  const { puedeGenFTP, puedeGenIAAS, puedeGenExtractor } = useRol();

  useEffect(() => { document.title = 'Generar | CIAE'; }, []);

  return (
    <div className="ftp-screen-container">

      <div className="ftp-bg-decor" aria-hidden="true">
        <div className="ftp-circle ftp-c1" />
        <div className="ftp-circle ftp-c2" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos" />

      <main className="ftp-main-content ftp-hub-main">

        <div className="ftp-hero-hub">
          <h1 className="ftp-hub-title-main">Generar indicadores</h1>
          <p className="ftp-hub-sub">Selecciona el módulo a generar</p>
        </div>

        <div className="home-cards ftp-hub-cards">

          <NavCard
            titulo="FTP"
            eyebrow="Servidor FTP"
            desc="Lee los reportes SIAIS del servidor FTP y genera los indicadores en Excel, por mes o por semana."
            chips={['CACU', 'CAMA', 'EH', 'DM', 'etc.']}
            color="green"
            disabled={!puedeGenFTP}
            onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP/Generar')}
          >
            <IconoModuloFtp />
          </NavCard>

          <NavCard
            titulo="IAAS"
            eyebrow="Infecciones asociadas"
            desc="Sube el Excel de cada unidad y genera los 6 indicadores de infecciones asociadas a la atención."
            chips={['IAAS 01–06']}
            color="gold"
            disabled={!puedeGenIAAS}
            onClick={() => navigate('/CIAE/IndicadoresMedicos/IAAS/Reporte')}
          >
            <IconoModuloIaas />
          </NavCard>

          <NavCard
            titulo="Extractor"
            eyebrow="Archivos mensuales"
            desc="Sube SUI-13, Egresos y Defunciones mes a mes y sigue el avance de cada indicador."
            chips={['DM', 'EH', 'MT', 'Neonatal']}
            color="tinto"
            disabled={!puedeGenExtractor}
            onClick={() => navigate('/CIAE/IndicadoresMedicos/Extractor/Generar')}
          >
            <IconoModuloExtractor />
          </NavCard>

        </div>
      </main>
    </div>
  );
};

export default GenerarHubPagina;
