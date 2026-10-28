// react
import { useEffect } from 'react';
// propios
import {
  ErroresExtraccion, EstadisticasAcciones, FiltrosAcciones, GenerarAcciones, MesesAcciones,
  TablaExtraccion, useConsultaAcciones, useGenerarAcciones,
} from '@/features/acciones';
import { useRol } from '@/features/auth';
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import TopBar from '@/components/TopBar';
import '@/styles/inicio.css';
import '@/styles/epidemiologia.css';
import '@/styles/acciones.css';

/**
 * Acciones (OC30 del FTP): el admin genera el previo o definitivo de un mes; todos navegan por
 * los meses guardados (el previo se muestra hasta que llega el definitivo). El usuario de unidad
 * solo recibe sus filas y nadie más que el admin ve los errores: eso lo decide el backend.
 * Web: panel lateral (generar + estadísticas) y la tabla a lo ancho; móvil: una columna.
 */
export default function AccionesPagina() {
  const { esAdmin } = useRol();
  const consulta = useConsultaAcciones();
  const generacion = useGenerarAcciones();
  const { datos, filtros } = consulta;
  const estadisticas = datos?.estadisticas;

  useEffect(() => { document.title = 'Acciones — Epidemiología | CIAE'; }, []);

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" aria-hidden="true" />
      <div className="epi-blob epi-blob-2" aria-hidden="true" />
      <div className="epi-grid"            aria-hidden="true" />

      <TopBar backTo="/CIAE/Epidemiologia" />

      <main className="acc-main">
        <header className="acc-encabezado">
          <div>
            <h1 className="acc-titulo">Acciones</h1>
            <p className="acc-subtitulo">Reporte OC30 del FTP · acciones configuradas en el mapeo</p>
          </div>
          {datos && (
            <span className={`acc-periodo${datos.semana !== null ? ' acc-periodo--previo' : ''}`}>
              {MESES_LARGOS_ARR[Number(datos.mes) - 1]} {datos.ano} · {datos.semana === null ? 'Definitivo' : `Previo semana ${datos.semana}`}
            </span>
          )}
        </header>

        <MesesAcciones
          anios={consulta.anios} anio={consulta.anio} onAnio={consulta.cambiarAnio}
          periodos={consulta.periodos} mes={consulta.mes} onMes={consulta.cambiarMes}
        />

        <div className="acc-cuerpo">
          <aside className="acc-lateral">
            {esAdmin && <GenerarAcciones generacion={generacion} />}
            {estadisticas && (
              <EstadisticasAcciones
                estadisticas={estadisticas}
                claveActiva={filtros.clave} onClave={clave => consulta.cambiarFiltro({ clave })}
                unidadActiva={filtros.unidad} onUnidad={unidad => consulta.cambiarFiltro({ unidad })}
              />
            )}
            {esAdmin && datos && <ErroresExtraccion errores={datos.errores} />}
          </aside>

          <section className="acc-tarjeta acc-detalle">
            {consulta.cargando && <p className="acc-vacio">Cargando…</p>}

            {!consulta.cargando && consulta.periodos.length === 0 && (
              <p className="acc-vacio">No hay meses extraídos en {consulta.anio}.</p>
            )}

            {!datos && consulta.error && <p className="acc-vacio">{consulta.error}</p>}

            {datos && estadisticas && (
              <>
                <FiltrosAcciones
                  filtros={filtros}
                  columnaClave={consulta.columnaClave}
                  claves={estadisticas.porColumna[0]?.conteos ?? []}
                  unidades={estadisticas.porUnidad}
                  total={datos.filas.length}
                  visibles={consulta.filasVisibles.length}
                  onCambiar={consulta.cambiarFiltro}
                  onLimpiar={consulta.limpiarFiltros}
                />
                <TablaExtraccion
                  filas={consulta.filasVisibles}
                  columnaClave={consulta.columnaClave}
                  onFiltrarClave={clave => consulta.cambiarFiltro({ clave })}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
