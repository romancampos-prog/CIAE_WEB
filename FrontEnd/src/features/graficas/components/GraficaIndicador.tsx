// react
import { useState } from 'react';
// propios
import { IconoInfo, IconoTendencia } from '@/components/icons';
import { useRol } from '@/features/auth';
import { useGraficaIndicador } from '@/features/graficas/hooks/useGraficaIndicador';
import SelectorMes from './SelectorMes';
import PestanasGrafica from './PestanasGrafica';
import ResumenKpis from './ResumenKpis';
import CompararUnidades from './CompararUnidades';
import TendenciaUnidad from './TendenciaUnidad';
import TendenciaCorte from './TendenciaCorte';
import MapaCalor from './MapaCalor';
import MenuDescarga from './MenuDescarga';
import { datosDelMes, franjasPorGrupo, nombreUnidad } from '@/features/graficas/utils/datosGrafica';
import { textoAcento } from '@/utils/colorAcento';
import './graficaIndicador.css';

interface Props {
  indSel: string;
  onIndSelChange: (indicador: string) => void;
  iconSrc: string | null;
  indsHermanos?: string[];
  colorFamilia: string;
}

/**
 * Página de gráficas de un indicador (cualquier módulo): un solo mes para toda la página,
 * resumen arriba y las pestañas Tendencia / Comparar / Mapa abajo.
 * El mes, el año y la descarga van en la cabecera de la tarjeta: arriba a la derecha está
 * el botón flotante de indicadores.
 * Cada tipo de indicador (meta de un valor, de rango o por corte) se dibuja a su manera
 * según el perfil que manda el backend.
 */
const GraficaIndicador = ({ indSel, onIndSelChange, iconSrc, indsHermanos = [], colorFamilia }: Props) => {
  const [infoAbierta, setInfoAbierta] = useState(false);
  const {
    anio, cargando, descargando, ficha, perfil, reporte, estadisticas,
    meses, mesParcial, mesSel, setMesSel, resumen,
    vista, setVista, unidadSel, setUnidadSel, acumulado, setAcumulado, tieneAcumulado,
    descargarIndicador, descargarFamilia,
  } = useGraficaIndicador(indSel, indsHermanos);
  const { puedeDescargarExcel } = useRol();

  const color      = colorFamilia;
  const semana     = reporte?.SEMANA?.SEMANA;
  const esParcial  = mesSel !== '' && mesSel === mesParcial;
  const { filas, estatal } = datosDelMes(reporte, mesSel, acumulado);
  const categoria  = indSel.split(' ')[0];
  const hayDatos   = meses.length > 0;

  const verUnidad = (unidad: string) => { setUnidadSel(unidad); setVista('tendencia'); };

  return (
    <main className="ig-main gi-main" style={{ '--ic': color }}>

      {/* ── Título, ficha y controles de toda la página ── */}
      <header className="gi-encabezado">
        <div className="gi-encabezado-texto">
          <h1 className="ig-title" style={{ color: textoAcento(color) }}>{indSel}</h1>
          {ficha?.informacion?.titulo && <p className="gi-titulo-largo">{ficha.informacion.titulo}</p>}
          {ficha && (
            <button className="ig-info-toggle" onClick={() => setInfoAbierta(v => !v)} aria-expanded={infoAbierta}>
              <IconoInfo tamano={13} aria-hidden />
              {infoAbierta ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
          )}
          {ficha && infoAbierta && (
            <div className="ig-desc-panel">
              <p className="ig-desc-titulo">{ficha.informacion.titulo}</p>
              <div className="ig-desc-meta">
                <span className="ig-desc-row"><span className="ig-desc-label">Num</span>{ficha.informacion.descNum}</span>
                <span className="ig-desc-row"><span className="ig-desc-label">Den</span>{ficha.informacion.descDen}</span>
                {ficha.descripcionPeriodicidad && (
                  <span className="ig-desc-row"><span className="ig-desc-label">Per</span>{ficha.descripcionPeriodicidad}</span>
                )}
              </div>
            </div>
          )}
        </div>

      </header>

      {indsHermanos.length > 1 && (
        <div className="ig-hermanos-row gi-hermanos">
          {indsHermanos.map(ind => (
            <button
              key={ind}
              className={`ig-hermano-btn${ind === indSel ? ' ig-hermano-btn--active' : ''}`}
              onClick={() => onIndSelChange(ind)}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {cargando && !reporte && (
        <div className="ig-skeleton">
          {[180, 260, 220, 300, 240, 280, 200, 320, 190, 270].map((h, i) => (
            <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
          ))}
        </div>
      )}

      {!cargando && !hayDatos && (
        <div className="ig-empty">
          <IconoTendencia aria-hidden />
          Sin datos guardados para {indSel} – {anio}
        </div>
      )}

      {hayDatos && (
        <div className="gi-contenido" style={{ opacity: cargando ? 0.55 : 1 }}>

          {/* ── ¿Cómo vamos? ── */}
          {resumen && (
            <ResumenKpis
              resumen={resumen}
              niveles={perfil?.niveles}
              unidadMedida={perfil?.unidadMedida}
              esCorte={perfil?.esCorte}
              franjas={perfil?.franjasPorMes?.[resumen.mes]}
              porTipo={franjasPorGrupo(perfil, ficha?.grupoDeUnidad)}
              acumulado={acumulado}
              etiquetaNumerador={perfil?.etiquetaNumerador}
              etiquetaDenominador={perfil?.etiquetaDenominador}
            />
          )}
          {esParcial && (
            <p className="gi-nota">
              {mesSel} todavía no cierra: todo lo de esta página (resumen y gráficas) es con los datos parciales de la semana {semana}; cambia cuando llegue el definitivo.
            </p>
          )}

          {/* ── ¿Dónde? ── */}
          <section className="ig-chart-card gi-vista">
            {iconSrc && <img src={iconSrc} alt="" className="ig-chart-watermark" />}
            <div className="gi-vista-encabezado">
              <h2 className="gi-vista-titulo">
                {vista === 'comparar' ? 'Comparar unidades' : vista === 'tendencia' ? 'Tendencia' : 'Mapa del año'}
                <span className="gi-etiqueta-vista">
                  {vista === 'tendencia' ? nombreUnidad(unidadSel) : vista === 'comparar' ? `${perfil?.esCorte ? 'Corte ' : ''}${mesSel} ${anio}` : anio}
                  {acumulado && vista !== 'mapa' && ' — acumulado'}
                </span>
              </h2>
              <div className="gi-controles">
                <SelectorMes
                  meses={meses}
                  mesSel={mesSel}
                  mesParcial={mesParcial}
                  semana={semana}
                  anio={anio}
                  esCorte={perfil?.esCorte}
                  onCambiar={setMesSel}
                />
                {tieneAcumulado && (
                  <button
                    type="button"
                    className={`ig-acumulado-switch${acumulado ? ' ig-acumulado-switch--on' : ''}`}
                    onClick={() => setAcumulado(!acumulado)}
                    role="switch"
                    aria-checked={acumulado}
                  >
                    <span className="ig-acumulado-switch-track"><span className="ig-acumulado-switch-thumb" /></span>
                    Acumulado
                  </button>
                )}
                <span className="ig-year-chip">{anio}</span>
                {puedeDescargarExcel && (
                  <MenuDescarga
                    disabled={descargando || !hayDatos}
                    cargando={descargando}
                    opciones={[
                      { label: `Descargar ${indSel}`, onClick: descargarIndicador },
                      { label: `Descargar todo ${categoria}`, onClick: descargarFamilia, multiple: true },
                    ]}
                  />
                )}
              </div>
              <PestanasGrafica actual={vista} onCambiar={setVista} />
            </div>

            {vista === 'comparar' && !filas.length && (
              <p className="ige-vacio">No hay datos {acumulado ? 'acumulados ' : ''}de {mesSel.toLowerCase()}.</p>
            )}
            {vista === 'comparar' && filas.length > 0 && (
              <CompararUnidades key={indSel} filas={filas} estatal={estatal} perfil={perfil} mes={mesSel} grupoDeUnidad={ficha?.grupoDeUnidad} onVerUnidad={verUnidad} />
            )}

            {vista === 'tendencia' && (perfil?.serieCortes
              ? <TendenciaCorte
                  reporte={reporte} perfil={perfil} mesSel={mesSel} anio={anio}
                  unidadSel={unidadSel} onElegirUnidad={setUnidadSel}
                />
              : <TendenciaUnidad
                  reporte={reporte} perfil={perfil} meses={meses} mesSel={mesSel}
                  mesParcial={mesParcial} semana={semana} acumulado={acumulado}
                  unidadSel={unidadSel} onElegirUnidad={setUnidadSel} onElegirMes={setMesSel}
                  grupoDeUnidad={ficha?.grupoDeUnidad}
                />
            )}

            {vista === 'mapa' && (
              <MapaCalor
                mapa={estadisticas?.mapaCalor}
                unidadSel={unidadSel}
                mesActivo={mesSel}
                onSelectUnidad={verUnidad}
                niveles={perfil?.niveles}
              />
            )}

            {ficha?.descripcionPeriodicidad && (
              <div className="ig-periodicidad-pie">
                <span className="ig-periodicidad-pildora" style={{ background: `${color}14`, color: textoAcento(color) }}>
                  {ficha.descripcionPeriodicidad}
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      <p className="ig-legal-footer">
        La información contenida en los archivos generados desde esta plataforma se proporciona únicamente con fines de consulta y análisis interno. Una vez descargado el archivo, el uso, resguardo y tratamiento posterior de estos datos es responsabilidad exclusiva de quien los descarga.
      </p>
    </main>
  );
};

export default GraficaIndicador;
