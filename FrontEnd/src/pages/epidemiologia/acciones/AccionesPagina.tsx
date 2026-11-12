// react
import { useEffect, useRef, useState } from 'react';
// propios
import {
  AvisoMesSinReporte, DescargarExcelAcciones, ErroresExtraccion, EstadisticasAcciones, GenerarAcciones, GraficaUnidades, MesesAcciones,
  ResumenPeriodo, TablaExtraccion, useConsultaAcciones, useGenerarAcciones,
} from '@/features/acciones';
import { useRol } from '@/features/auth';
import TopBar from '@/components/TopBar';
import '@/styles/inicio.css';
import '@/styles/epidemiologia.css';
import '@/styles/acciones.css';

/**
 * Acciones (OC30 del FTP): el admin genera el previo o definitivo de un mes; todos navegan por
 * los meses guardados (el previo se muestra hasta que llega el definitivo). El usuario de unidad
 * solo recibe sus filas y nadie más que el admin ve los errores: eso lo decide el backend.
 * Arranca en el último mes con reporte, y el recuadro del periodo siempre dice qué mes se ve. Generar
 * (solo admin) no tiene botón: se abre al elegir un mes sin reporte o desde el panel de meses.
 * El botón Excel descarga un rango de fechas (varios meses si se quiere; el de unidad, solo lo suyo).
 * El reporte (tabla) es lo principal; los conteos van en una columna a su lado (abajo en pantallas chicas) con el aviso de errores (admin) hasta arriba.
 */
export default function AccionesPagina() {
  const { esUnidad, puedeEditarEpi } = useRol();
  const consulta = useConsultaAcciones();
  const generacion = useGenerarAcciones();
  const { datos, filtros } = consulta;
  const estadisticas = datos?.estadisticas;
  const ventanaGenerar = useRef<HTMLDialogElement>(null);
  const ventanaAviso   = useRef<HTMLDialogElement>(null);
  const [mesSinReporte, setMesSinReporte] = useState<number | null>(null);

  const avisarMesSinReporte = (mes: number) => { setMesSinReporte(mes); ventanaAviso.current?.showModal(); };
  // La ventana de generar siempre llega con el mes puesto: el sin reporte que se tocó o el que se está viendo
  const abrirGenerar = (mes: number | null) => {
    if (mes) generacion.prellenar(consulta.anio, mes);
    ventanaGenerar.current?.showModal();
  };

  useEffect(() => { document.title = 'Acciones — Epidemiología | CIAE'; }, []);

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" aria-hidden="true" />
      <div className="epi-blob epi-blob-2" aria-hidden="true" />
      <div className="epi-grid"            aria-hidden="true" />

      <TopBar backTo="/CIAE/Epidemiologia" />

      <main className="acc-main">
        {/* Encabezado en una sola línea (para que la tabla suba): título, el mes (que también es el control para cambiarlo) y totales; las claves ya se ven en "Por Clave de la Acción" */}
        <header className="acc-encabezado">
          <h1 className="acc-titulo">Acciones <span>Reporte OC30 del FTP</span></h1>
          <MesesAcciones
            anios={consulta.anios} anio={consulta.anio} onAnio={consulta.cambiarAnio}
            periodos={consulta.periodos} mes={consulta.mes} onMes={consulta.cambiarMes}
            onMesSinReporte={puedeEditarEpi ? avisarMesSinReporte : undefined}
            onGenerar={puedeEditarEpi ? () => abrirGenerar(consulta.mes) : undefined}
          />
          {estadisticas && <ResumenPeriodo estadisticas={estadisticas} />}
          {consulta.periodos.length > 0 && <DescargarExcelAcciones fechas={consulta.fechas} anio={consulta.anio} soloMiUnidad={esUnidad} />}
        </header>

        {puedeEditarEpi && (
          <>
            <AvisoMesSinReporte ventana={ventanaAviso} anio={consulta.anio} mes={mesSinReporte} onGenerar={() => abrirGenerar(mesSinReporte)} />
            <GenerarAcciones generacion={generacion} ventana={ventanaGenerar} />
          </>
        )}

        {/* El reporte es lo principal: la tabla a lo ancho y, en pantalla grande, los conteos en una columna angosta a su lado (abajo en pantallas chicas) */}
        <div className="acc-cuerpo">
          <section className="acc-tarjeta acc-detalle">
            {consulta.cargando && <p className="acc-vacio">Cargando…</p>}

            {!consulta.cargando && consulta.periodos.length === 0 && (
              <p className="acc-vacio">No hay meses extraídos en {consulta.anio}.</p>
            )}

            {!datos && consulta.error && <p className="acc-vacio">{consulta.error}</p>}

            {datos && estadisticas && (
              <>
                <TablaExtraccion
                  columnas={consulta.columnas}
                  filas={consulta.filasVisibles}
                  columnaClave={consulta.columnaClave}
                  columnaFecha={consulta.columnaFecha}
                  filtros={filtros}
                  onCambiar={consulta.cambiarFiltro}
                  descripciones={datos.descripcionClaves ?? {}}
                  unidades={estadisticas.porUnidad}
                  fechas={consulta.fechas}
                  onFiltrarClave={clave => consulta.alternarFiltro('claves', clave)}
                  hayFiltros={consulta.hayFiltros}
                  onLimpiar={consulta.limpiarFiltros}
                  estatus={datos.estatus ?? {}}
                  catalogoEstatus={datos.catalogoEstatus ?? []}
                  onCambiarEstatus={puedeEditarEpi ? consulta.cambiarEstatus : undefined}
                  estudios={datos.estudios ?? {}}
                  onSubirEstudio={puedeEditarEpi ? consulta.subirEstudio : undefined}
                  onLimpiarErrorEstudio={consulta.limpiarErrorEstudio}
                  onDescargarEstudio={!esUnidad ? consulta.descargarEstudio : undefined}
                  subiendoEstudio={consulta.subiendoEstudio}
                  errorEstudio={consulta.errorEstudio}
                  etiquetas={datos.etiquetasColumna ?? {}}
                  iconos={datos.iconosColumna ?? {}}
                />
                {consulta.errorEstatus && <p className="acc-vacio">{consulta.errorEstatus}</p>}
                {/* El backend pone el índice al día con la carpeta; lo que no reconoce se avisa a quien edita */}
                {puedeEditarEpi && !!datos.estudiosSinRegistro?.length && (
                  <div className="acc-estudios-sueltos">
                    <strong>{datos.estudiosSinRegistro.length} Excel en la carpeta de estudios no corresponden a ningún registro.</strong>
                    {' '}Deben ir en año/unidad/mes con el nombre fecha_clave_NSS:
                    <ul>{datos.estudiosSinRegistro.map(ruta => <li key={ruta}>{ruta}</li>)}</ul>
                  </div>
                )}
              </>
            )}
          </section>

          {/* En pantalla grande la columna mide lo mismo que la tabla: la lista de unidades llena lo que sobra y no se pasa de largo */}
          <aside className="acc-resumenes" aria-label="Resumen del periodo">
            <div className="acc-resumenes-columna">
              {!esUnidad && datos && <ErroresExtraccion errores={datos.errores} />}
              {estadisticas && (
                <EstadisticasAcciones
                  estadisticas={estadisticas}
                  descripciones={datos?.descripcionClaves ?? {}}
                  clavesActivas={filtros.claves} onClave={clave => consulta.alternarFiltro('claves', clave)}
                />
              )}
            </div>
          </aside>
        </div>

        {/* Registros por unidad: abajo de la tabla, a lo ancho, como gráfica (cada barra filtra la tabla) */}
        {estadisticas && estadisticas.porUnidad.length > 1 && (
          <GraficaUnidades
            conteos={estadisticas.porUnidad}
            activas={filtros.unidades}
            onElegir={unidad => consulta.alternarFiltro('unidades', unidad)}
          />
        )}
      </main>
    </div>
  );
}
