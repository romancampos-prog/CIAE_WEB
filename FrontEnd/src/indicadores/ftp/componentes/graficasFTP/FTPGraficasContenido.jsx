import { useState, useEffect } from 'react';
import { useFTPGrafica } from '../../hooks/useFTPGrafica';
import GraficaBarras  from '../../../shared/componentes/graficas/GraficaBarras';
import PanelUnidades  from '../../../shared/componentes/graficas/PanelUnidades';
import PanelSelector  from '../../../shared/componentes/graficas/PanelSelector';
import VistaToggle    from '../../../shared/componentes/graficas/VistaToggle';
import TotalTile        from '../../../shared/componentes/graficas/TotalTile';
import CumplimientoTile from '../../../shared/componentes/graficas/CumplimientoTile';
import MenuDescarga     from '../../../shared/componentes/graficas/MenuDescarga';
import { MESES_CORTOS, MESES_LARGOS } from '../../../shared/constantes/meses';
import { etiquetaMesLarga, etiquetaMesCorta } from '../../utils/calculos';
import { useEsMovil } from '../../../shared/utils/useEsMovil';
import { textoAcento } from '../../../../shared/utils/colorAcento';



const VISTAS_FTP = [
  { id: 'unidad', label: 'Por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'mes',    label: 'Por mes',    path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
];

const POR_PAGINA = 12;

// Resalta menos el año dentro de una etiqueta tipo "Noviembre 2025 - Enero
// 2026" -- lo envuelve en un span más chico y apagado (ig-mes-anio) para que
// el mes, que es el dato que se lee rápido, no compita por espacio/atención.
const conAnioChico = (texto) =>
  texto.split(/(\d{4})/).map((parte, i) =>
    /^\d{4}$/.test(parte) ? <span key={i} className="ig-mes-anio">{parte}</span> : parte
  );

const FTPGraficasContenido = ({ indSel: extIndSel, onIndSelChange, iconSrc, indsHermanos = [] }) => {
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [hoveredMes, setHoveredMes]   = useState(null);
  const [pagina, setPagina]           = useState(0);
  const [colorFiltro, setColorFiltro] = useState(null);

  const {
    anio, indSel, indInfo,
    reporte, unidadSel, setUnidadSel,
    cargando, descargando, vistaGrafica, setVistaGrafica,
    mesSel, setMesSel, mesesDisponibles,
    acumulado, setAcumulado, tieneAcumulado,
    chartData, maxTasa,
    chartDataMes, maxTasaMes, totalMes, unidadesStatus,
    cumplimientoMes, cumplimientoUltimoMes,
    rangosSem, esSemPorMes, indColor, categoria,
    descargarIndicador, descargarCategoria,
  } = useFTPGrafica(hoveredMes, extIndSel, onIndSelChange);

  const rangosSemConMes  = rangosSem && esSemPorMes ? rangosSem : rangosSem ? { ...rangosSem, _mes: undefined } : null;

  // Resetear página al cambiar indicador, mes, filtro de color o modo acumulado
  useEffect(() => { setPagina(0); }, [indSel, mesSel, colorFiltro, acumulado]);

  const conAcumulado = tieneAcumulado && acumulado;
  const sufijoAcumulado = conAcumulado ? ' — acumulado' : '';
  // El filtro de color es una selección de la vista, no del indicador — se limpia al cambiar de indicador.
  useEffect(() => { setColorFiltro(null); }, [indSel]);

  const unidadesParaPanel = colorFiltro
    ? unidadesStatus.filter(u => u.color === colorFiltro)
    : unidadesStatus;

  const chartDataMesFiltrado = colorFiltro
    ? chartDataMes.filter(d => d.color === colorFiltro)
    : chartDataMes;

  // En mobile no hay páginas -- se ve todo el listado de una vez, deslizable
  // horizontal (ver el min-width por barra en GraficaBarras); en desktop
  // sigue paginado de POR_PAGINA en POR_PAGINA como siempre.
  const esMovil = useEsMovil();
  const totalPaginas = Math.ceil(chartDataMesFiltrado.length / POR_PAGINA);
  const dataPaginada = esMovil
    ? chartDataMesFiltrado
    : chartDataMesFiltrado.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  return (
    <main className="ig-main">

      {/* ── Título + ficha técnica ── */}
      <div className="ig-header">
        <div className="ig-title-block">
          <h1 className="ig-title" style={{ color: textoAcento(indColor) }}>{indSel || 'Indicadores FTP'}</h1>
        </div>

        <div className="ig-header-detail-row">
          {indInfo && (
            <button className="ig-info-toggle" onClick={() => setInfoAbierta(v => !v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {infoAbierta ? 'Ocultar detalle' : 'Ver detalle'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: infoAbierta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}
          {indInfo && infoAbierta && (
            <div className="ig-desc-panel" style={{ '--ic': indColor }}>
              <p className="ig-desc-titulo">{indInfo.informacion.titulo}</p>
              <div className="ig-desc-meta">
                <span className="ig-desc-row"><span className="ig-desc-label">Num</span>{indInfo.informacion.descNum}</span>
                <span className="ig-desc-row"><span className="ig-desc-label">Den</span>{indInfo.informacion.descDen}</span>
                {indInfo.descripcionPeriodicidad && (
                  <span className="ig-desc-row"><span className="ig-desc-label">Per</span>{indInfo.descripcionPeriodicidad}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {indsHermanos.length > 1 && (
        <div className="ig-hermanos-row">
          {indsHermanos.map(ind => (
            <button
              key={ind}
              className={`ig-hermano-btn${ind === indSel ? ' ig-hermano-btn--active' : ''}`}
              style={ind === indSel ? { '--ic': indColor } : {}}
              onClick={() => onIndSelChange(ind)}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {/* ── Skeleton (solo primera carga, sin datos previos que mostrar) ── */}
      {cargando && !reporte && (
        <div className="ig-skeleton">
          {[180, 260, 220, 300, 240, 280, 200, 320, 190, 270].map((h, i) => (
            <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
          ))}
        </div>
      )}

      {/* ── Sin datos ── */}
      {!cargando && (!reporte || mesesDisponibles.length === 0) && indSel && (
        <div className="ig-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
          </svg>
          Sin datos guardados para {indSel} – {anio}
        </div>
      )}

      {/* ── Gráfica ── */}
      {mesesDisponibles.length > 0 && (
        <div className="ig-chart-card" style={{ opacity: cargando ? 0.55 : 1, transition: 'opacity 0.15s' }}>

          <CumplimientoTile
            conteo={vistaGrafica === 'mes' ? cumplimientoMes : cumplimientoUltimoMes}
            colorActivo={colorFiltro}
            onSelectColor={setColorFiltro}
            rangos={rangosSemConMes}
          />

          <div className="ig-body">
            {/* Panel izquierdo */}
            {vistaGrafica === 'mes' ? (
              <PanelSelector
                triggerLabel="Mes"
                triggerValue={mesSel ? etiquetaMesLarga(parseInt(mesSel)) : ''}
                panelTitle="Mes"
                indColor={indColor}
                extraClass="ig-unit-panel--mes"
              >
                {(cerrar) => (
                  <div className="ig-unit-list">
                    {mesesDisponibles.map(m => (
                      <button
                        key={m}
                        className={`ig-unit-item${mesSel === m ? ' ig-unit-item--active' : ''}`}
                        style={mesSel === m ? { borderLeftColor: indColor } : {}}
                        onClick={() => { setMesSel(m); cerrar(); }}
                      >
                        <span className="ig-unit-name">{conAnioChico(etiquetaMesLarga(parseInt(m)))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </PanelSelector>
            ) : (
              <PanelUnidades
                unidades={unidadesParaPanel}
                unidadSel={unidadSel}
                vistaGrafica={vistaGrafica}
                indColor={indColor}
                busq={busqUnidad}
                onBusq={setBusqUnidad}
                onSelect={u => { setUnidadSel(u); setVistaGrafica('unidad'); }}
              />
            )}

            {/* Área de gráfica */}
            <div className="ig-chart-area" style={{ position: 'relative' }}>
              {iconSrc && <img src={iconSrc} alt="" className="ig-chart-watermark" />}
              <div className="ig-chart-topbar">
                <div className="ig-chart-topbar-left">
                  <VistaToggle vistas={VISTAS_FTP} actual={vistaGrafica} onChange={setVistaGrafica} color={indColor} />
                  {tieneAcumulado && (
                    <button
                      className={`ig-acumulado-switch${acumulado ? ' ig-acumulado-switch--on' : ''}`}
                      onClick={() => setAcumulado(v => !v)}
                      style={{ '--ic': indColor }}
                      role="switch"
                      aria-checked={acumulado}
                    >
                      <span className="ig-acumulado-switch-track"><span className="ig-acumulado-switch-thumb" /></span>
                      Acumulado
                    </button>
                  )}
                  <div className="ig-chart-badges">
                    {vistaGrafica === 'unidad' && (
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: textoAcento(indColor) }}>
                        {unidadSel === 'TOTAL_OOAD' ? 'TOTAL OOAD' : unidadSel}{sufijoAcumulado}
                      </span>
                    )}
                    {vistaGrafica === 'mes' && (
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: textoAcento(indColor) }}>
                        {etiquetaMesCorta(parseInt(mesSel))}{sufijoAcumulado}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ig-controls">
                  <span className="ig-year-chip">{anio}</span>
                  {mesSel && (
                    <MenuDescarga
                      disabled={descargando}
                      opciones={[
                        {
                          label: `Descargar ${indSel}`,
                          onClick: () => descargarIndicador(),
                        },
                        {
                          label: `Descargar todo ${categoria}`,
                          onClick: () => descargarCategoria(),
                          multiple: true,
                        },
                      ]}
                    />
                  )}
                </div>
              </div>

              {vistaGrafica === 'unidad' && (
                <div style={{ marginTop: '14px' }}>
                  <GraficaBarras
                    chartKey={`u-${indSel}-${unidadSel}-${conAcumulado ? 'a' : 'n'}`}
                    data={chartData}
                    xKey="mes"
                    maxTasa={maxTasa}
                    indSel={indSel}
                    maxBarSize={56}
                    conLinea
                    onBarHover={esSemPorMes ? setHoveredMes : undefined}
                    onBarLeave={esSemPorMes ? () => setHoveredMes(null) : undefined}
                  />
                </div>
              )}

              {vistaGrafica === 'mes' && (
                <div className="ig-mes-chart-row">
                  <div className="ig-mes-chart-col">
                    <GraficaBarras
                      chartKey={`m-${indSel}-${mesSel}-${conAcumulado ? 'a' : 'n'}-p${pagina}`}
                      data={dataPaginada}
                      xKey="unidad"
                      maxTasa={maxTasaMes}
                      indSel={indSel}
                      maxBarSize={48}
                      barRadius={[6, 6, 0, 0]}
                      bottomMargin={64}
                      labelSize="9px"
                    />
                    {!esMovil && totalPaginas > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
                        <button
                          className="ig-btn-dl ig-btn-dl--secondary"
                          onClick={() => setPagina(p => p - 1)}
                          disabled={pagina === 0}
                          style={{ padding: '4px 14px', fontSize: '0.78rem' }}
                        >
                          ‹ Anterior
                        </button>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--texto-suave)' }}>
                          {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, chartDataMesFiltrado.length)} de {chartDataMesFiltrado.length} unidades
                        </span>
                        <button
                          className="ig-btn-dl ig-btn-dl--secondary"
                          onClick={() => setPagina(p => p + 1)}
                          disabled={pagina >= totalPaginas - 1}
                          style={{ padding: '4px 14px', fontSize: '0.78rem' }}
                        >
                          Siguiente ›
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="ig-mes-total-col">
                    <TotalTile total={totalMes} indColor={indColor} />
                  </div>
                </div>
              )}

              {indInfo?.descripcionPeriodicidad && (
                <div className="ig-periodicidad-pie">
                  <span className="ig-periodicidad-pildora" style={{ background: `${indColor}14`, color: textoAcento(indColor) }}>
                    {indInfo.descripcionPeriodicidad}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="ig-legal-footer">
        La información contenida en los archivos generados desde esta plataforma se proporciona únicamente con fines de consulta y análisis interno. Una vez descargado el archivo, el uso, resguardo y tratamiento posterior de estos datos es responsabilidad exclusiva de quien los descarga.
      </p>

    </main>
  );
};

export default FTPGraficasContenido;
