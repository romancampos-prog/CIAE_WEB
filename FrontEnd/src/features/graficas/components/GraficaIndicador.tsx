// react
import { useState } from 'react';
// propios
import { useGraficaIndicador } from '@/features/graficas/hooks/useGraficaIndicador';
import SelectorMes from './SelectorMes';
import PestanasGrafica from './PestanasGrafica';
import ResumenKpis from './ResumenKpis';
import CompararUnidades from './CompararUnidades';
import CompararRango from './CompararRango';
import TendenciaUnidad from './TendenciaUnidad';
import TendenciaCorte from './TendenciaCorte';
import MapaCalor from './MapaCalor';
import BrechaMeta from './BrechaMeta';
import AvisoDenominador from './AvisoDenominador';
import MenuDescarga from './MenuDescarga';
import { datosDelMes, nombreUnidad } from '@/features/graficas/utils/datosGrafica';
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
 * resumen arriba, las pestañas Tendencia / Comparar / Mapa en medio y la brecha abajo.
 * Cada tipo de indicador (meta de un valor, de rango o por corte) se dibuja a su manera
 * según el perfil que manda el backend.
 */
const GraficaIndicador = ({ indSel, onIndSelChange, iconSrc, indsHermanos = [], colorFamilia }: Props) => {
  const [infoAbierta, setInfoAbierta] = useState(false);
  const {
    anio, cargando, descargando, ficha, perfil, reporte, estadisticas,
    meses, mesParcial, mesSel, setMesSel, resumen, mesAnterior,
    vista, setVista, unidadSel, setUnidadSel, acumulado, setAcumulado, tieneAcumulado,
    descargarIndicador, descargarFamilia,
  } = useGraficaIndicador(indSel, indsHermanos);

  const color      = colorFamilia;
  const semana     = reporte?.SEMANA?.SEMANA;
  const esParcial  = mesSel !== '' && mesSel === mesParcial;
  const esRango    = perfil?.tipoMeta === 'rango';
  const { filas }  = datosDelMes(reporte, mesSel, acumulado);
  const brechas    = estadisticas?.brechas?.[mesSel] ?? [];
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
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
          <MenuDescarga
            disabled={descargando || !hayDatos}
            cargando={descargando}
            opciones={[
              { label: `Descargar ${indSel}`, onClick: descargarIndicador },
              { label: `Descargar todo ${categoria}`, onClick: descargarFamilia, multiple: true },
            ]}
          />
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
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
          </svg>
          Sin datos guardados para {indSel} – {anio}
        </div>
      )}

      {hayDatos && (
        <div className="gi-contenido" style={{ opacity: cargando ? 0.55 : 1 }}>

          {/* ── ¿Cómo vamos? ── */}
          {resumen && (
            <ResumenKpis
              resumen={resumen}
              mesAnterior={mesAnterior}
              niveles={perfil?.niveles}
              unidadMedida={perfil?.unidadMedida}
              esCorte={perfil?.esCorte}
            />
          )}
          {esParcial && (
            <p className="gi-nota">
              {mesSel} todavía no cierra (semana {semana}): se ven sus datos parciales; el resumen y la brecha aparecen cuando cierre el mes.
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
              <PestanasGrafica actual={vista} onCambiar={setVista} />
            </div>

            {vista === 'comparar' && !filas.length && (
              <p className="ige-vacio">No hay datos {acumulado ? 'acumulados ' : ''}de {mesSel.toLowerCase()}.</p>
            )}
            {vista === 'comparar' && filas.length > 0 && (esRango
              ? <CompararRango key={indSel} filas={filas} perfil={perfil} mes={mesSel} grupoDeUnidad={ficha?.grupoDeUnidad} onVerUnidad={verUnidad} />
              : <CompararUnidades key={indSel} filas={filas} perfil={perfil} mes={mesSel} onVerUnidad={verUnidad} />
            )}

            {vista === 'tendencia' && (perfil?.serieCortes
              ? <TendenciaCorte
                  reporte={reporte} perfil={perfil} mesSel={mesSel} anio={anio}
                  unidadSel={unidadSel} onElegirUnidad={setUnidadSel}
                  brecha={brechas.find(b => b.unidad === unidadSel) ?? null}
                  brechaAplica={resumen?.brechaAplica}
                />
              : <TendenciaUnidad
                  reporte={reporte} perfil={perfil} meses={meses} mesSel={mesSel}
                  mesParcial={mesParcial} semana={semana} acumulado={acumulado}
                  unidadSel={unidadSel} onElegirUnidad={setUnidadSel} onElegirMes={setMesSel}
                  brecha={brechas.find(b => b.unidad === unidadSel) ?? null}
                  brechaAplica={resumen?.brechaAplica}
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

          {/* ── ¿Qué hacer? ── */}
          <div className="ige-detalle gi-que-hacer">
            {resumen && (
              <BrechaMeta
                key={`${indSel}-${mesSel}`}
                brechas={brechas}
                mes={mesSel}
                aplica={resumen.brechaAplica}
                tipoMeta={perfil?.tipoMeta}
                onSelectUnidad={verUnidad}
              />
            )}
            <AvisoDenominador filas={filas} umbral={perfil?.umbralDenominadorChico} mes={mesSel} />
          </div>
        </div>
      )}

      <p className="ig-legal-footer">
        La información contenida en los archivos generados desde esta plataforma se proporciona únicamente con fines de consulta y análisis interno. Una vez descargado el archivo, el uso, resguardo y tratamiento posterior de estos datos es responsabilidad exclusiva de quien los descarga.
      </p>
    </main>
  );
};

export default GraficaIndicador;
