// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoActividad, IconoFlechaDerecha, IconoSubir } from '@/components/icons';
import { useRol } from '@/features/auth';
import TopBar from '@/components/TopBar';
import { useMesesGuardadosIaas } from '@/features/generar-iaas';
import './generarIaas.css';

const MenuIaasPagina = () => {
  const navigate   = useNavigate();
  const { puedeGenIAAS, esVisitante } = useRol();
  const { anioActual, meses: mesesGuardados, ultimoMes } = useMesesGuardadosIaas();

  useEffect(() => { document.title = 'IAAS | CIAE'; }, []);

  return (
    <div className="ia-root">
      <div className="ia-bg" aria-hidden>
        <div className="ia-orb ia-orb-1" />
        <div className="ia-orb ia-orb-2" />
        <div className="ia-orb ia-orb-3" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo={esVisitante ? '/CIAE/Inicio' : '/CIAE/IndicadoresMedicos'} />

      <main className="ia-hub-main">
        <div className="ia-hub-hero">
          <p className="ia-hub-acronym">Infecciones Asociadas a la Atención de la Salud</p>
          <p className="ia-hub-sub">¿Qué deseas hacer?</p>
        </div>

        <div className="ia-hub-cards">

          {/* Ver datos */}
          <div
            className={`home-card${!mesesGuardados?.length ? ' home-card--disabled' : ''}`}
            onClick={() => { if (mesesGuardados?.length) navigate('/CIAE/IndicadoresMedicos/Graficas'); }}
          >
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
              Gráfica de tendencia mensual por unidad e indicador, y descarga del reporte acumulado.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                {mesesGuardados === null && (
                  <span className="hc-chip hc-chip--green">Verificando…</span>
                )}
                {mesesGuardados !== null && mesesGuardados.length === 0 && (
                  <span className="hc-chip hc-chip--muted">Sin datos en {anioActual}</span>
                )}
                {mesesGuardados !== null && mesesGuardados.length > 0 && (
                  <>
                    <span className="hc-chip hc-chip--green">Hasta {ultimoMes}</span>
                    <span className="hc-chip hc-chip--green">{mesesGuardados.length} mes{mesesGuardados.length !== 1 ? 'es' : ''}</span>
                  </>
                )}
              </div>
              <div className="hc-arrow hc-arrow--green">
                <IconoFlechaDerecha />
              </div>
            </div>
          </div>

          {/* Nuevo reporte */}
          {puedeGenIAAS && (
          <div className="home-card" onClick={() => navigate('/CIAE/IndicadoresMedicos/IAAS/Reporte')}>
            <div className="hc-header hc-header--gold">
              <div className="hc-icon-box hc-icon-box--gold">
                <IconoSubir />
              </div>
              <div className="hc-header-text">
                <p className="hc-eyebrow">Captura</p>
                <h2 className="hc-name">Nuevo reporte</h2>
              </div>
            </div>
            <p className="hc-desc">
              Sube los archivos de cada unidad y captura los denominadores para generar los 6 indicadores.
            </p>
            <div className="hc-footer">
              <div className="hc-chips">
                <span className="hc-chip hc-chip--gold">IAAS 01–06</span>
              </div>
              <div className="hc-arrow hc-arrow--green">
                <IconoFlechaDerecha />
              </div>
            </div>
          </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default MenuIaasPagina;
