import { useState, useEffect } from 'react';
import { useRol } from '../../../../auth/hooks/useRol';
import { useFTPGrafica } from '../../hooks/useFTPGrafica';
import GraficaBarras  from '../../../shared/componentes/graficas/GraficaBarras';
import PanelUnidades  from '../../../shared/componentes/graficas/PanelUnidades';
import SemaforoUmbral from '../../../shared/componentes/graficas/SemaforoUmbral';
import VistaToggle    from '../../../shared/componentes/graficas/VistaToggle';
import { MESES_CORTOS, MESES_LARGOS } from '../../../shared/constantes/meses';

const VISTAS_FTP = [
  { id: 'unidad', label: 'Por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'mes',    label: 'Por mes',    path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
];

const POR_PAGINA = 20;

const FTPGraficasContenido = ({ indSel: extIndSel, onIndSelChange, iconSrc }) => {
  const { puedeGenFTP } = useRol();
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [hoveredMes, setHoveredMes]   = useState(null);
  const [pagina, setPagina]           = useState(0);

  const {
    anio, indSel, indInfo,
    datos, unidadSel, setUnidadSel,
    cargando, descargando, vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes, unidadesStatus,
    rangosSem, esSemPorMes, indColor, categoria,
    descargarIndicador, descargarCategoria,
  } = useFTPGrafica(hoveredMes, extIndSel, onIndSelChange);

  const rangosSemConMes  = rangosSem && esSemPorMes ? rangosSem : rangosSem ? { ...rangosSem, _mes: undefined } : null;

  // Resetear página al cambiar indicador o mes
  useEffect(() => { setPagina(0); }, [indSel, mesSel]);

  const totalPaginas = Math.ceil(chartDataMes.length / POR_PAGINA);
  const dataPaginada = chartDataMes.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  return (
    <main className="ig-main">

      {/* ── Título + ficha técnica ── */}
      <div className="ig-header">
        <h1 className="ig-title" style={{ color: indColor }}>{indSel || 'Indicadores FTP'}</h1>
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
              <p className="ig-desc-titulo">{indInfo.titulo}</p>
              <div className="ig-desc-meta">
                <span className="ig-desc-row"><span className="ig-desc-label">Num</span>{indInfo.descripcionNumerador}</span>
                <span className="ig-desc-row"><span className="ig-desc-label">Den</span>{indInfo.descripcionDenominador}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Skeleton ── */}
      {cargando && (
        <div className="ig-skeleton">
          {[180, 260, 220, 300, 240, 280, 200, 320, 190, 270].map((h, i) => (
            <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
          ))}
        </div>
      )}

      {/* ── Sin datos ── */}
      {!cargando && (!datos || datos.meses_con_datos?.length === 0) && indSel && (
        <div className="ig-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
          </svg>
          Sin datos guardados para {indSel} – {anio}
        </div>
      )}

      {/* ── Gráfica ── */}
      {!cargando && datos?.meses_con_datos?.length > 0 && (
        <div className="ig-chart-card">

          <div className="ig-body">
            {/* Panel izquierdo */}
            {vistaGrafica === 'mes' ? (
              <div className="ig-unit-panel ig-unit-panel--mes">
                <p className="ig-unit-list-title">Mes</p>
                <div className="ig-unit-list">
                  {datos?.meses_con_datos?.map(m => (
                    <button
                      key={m}
                      className={`ig-unit-item${mesSel === m ? ' ig-unit-item--active' : ''}`}
                      style={mesSel === m ? { borderLeftColor: indColor } : {}}
                      onClick={() => setMesSel(m)}
                    >
                      <span className="ig-unit-name">{MESES_LARGOS[m]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <PanelUnidades
                unidades={unidadesStatus}
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
                <VistaToggle vistas={VISTAS_FTP} actual={vistaGrafica} onChange={setVistaGrafica} color={indColor} />
                <div className="ig-controls">
                  <div className="ig-control-group">
                    <label className="ig-control-label">Año</label>
                    <span className="ig-select" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, color: indColor, cursor: 'default' }}>
                      {anio}
                    </span>
                  </div>
                  {puedeGenFTP && mesSel && (
                    <div className="ig-control-group">
                      <label className="ig-control-label">Descargar excel</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="ig-btn-dl"
                          disabled={descargando}
                          onClick={() => descargarIndicador(mesSel)}
                          title={`Descargar ${indSel} — ${MESES_CORTOS[parseInt(mesSel) - 1]} ${anio}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          {descargando ? '…' : indSel}
                        </button>
                        <button
                          className="ig-btn-dl ig-btn-dl--secondary"
                          disabled={descargando}
                          onClick={() => descargarCategoria(mesSel)}
                          title={`Descargar todos ${categoria} — ${MESES_CORTOS[parseInt(mesSel) - 1]} ${anio}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          {descargando ? '…' : `Todos ${categoria}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ig-chart-top">
                <div className="ig-chart-badges">
                  {vistaGrafica === 'unidad' && (
                    <>
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                        {unidadSel === 'TOTAL' ? 'TOTAL OOAD' : unidadSel}
                      </span>
                      <span className="ig-badge ig-badge--neutral">{anio}</span>
                    </>
                  )}
                  {vistaGrafica === 'mes' && (
                    <>
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                        {MESES_CORTOS[parseInt(mesSel) - 1]} {anio}
                      </span>
                      <span className="ig-badge ig-badge--neutral">Todas las unidades</span>
                    </>
                  )}
                </div>
                <SemaforoUmbral rangos={[rangosSemConMes]} indColor={indColor} />
              </div>

              {vistaGrafica === 'unidad' && (
                <GraficaBarras
                  chartKey={`u-${indSel}-${unidadSel}`}
                  data={chartData}
                  xKey="mes"
                  maxTasa={maxTasa}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                  onBarHover={esSemPorMes ? setHoveredMes : undefined}
                  onBarLeave={esSemPorMes ? () => setHoveredMes(null) : undefined}
                />
              )}

              {vistaGrafica === 'mes' && (
                <>
                  <GraficaBarras
                    chartKey={`m-${indSel}-${mesSel}-p${pagina}`}
                    data={dataPaginada}
                    xKey="unidad"
                    maxTasa={maxTasaMes}
                    indSel={indSel}
                    maxBarSize={32}
                    barRadius={[6, 6, 0, 0]}
                    bottomMargin={64}
                    labelSize="9px"
                  />
                  {totalPaginas > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
                      <button
                        className="ig-btn-dl ig-btn-dl--secondary"
                        onClick={() => setPagina(p => p - 1)}
                        disabled={pagina === 0}
                        style={{ padding: '4px 14px', fontSize: '0.78rem' }}
                      >
                        ‹ Anterior
                      </button>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                        {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, chartDataMes.length)} de {chartDataMes.length} unidades
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
                </>
              )}
            </div>
          </div>
        </div>
      )}


    </main>
  );
};

export default FTPGraficasContenido;
