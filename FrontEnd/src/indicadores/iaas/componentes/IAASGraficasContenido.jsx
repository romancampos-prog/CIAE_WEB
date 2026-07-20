import { useState, useEffect } from 'react';
import { useIAASGrafica } from '../hooks/useIAASGrafica';
import TickMesUnidad  from './graficas/TickMesUnidad';
import GraficaBarras  from '../../shared/componentes/graficas/GraficaBarras';
import PanelUnidades  from '../../shared/componentes/graficas/PanelUnidades';
import VistaToggle    from '../../shared/componentes/graficas/VistaToggle';
import TotalTile        from '../../shared/componentes/graficas/TotalTile';
import CumplimientoTile from '../../shared/componentes/graficas/CumplimientoTile';
import MenuDescarga     from '../../shared/componentes/graficas/MenuDescarga';
import { MESES_CORTOS, MESES_LARGOS } from '../../shared/constantes/meses';

const VISTAS_IAAS = [
  { id: 'unidad', label: 'Por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'mes',    label: 'Por mes',    path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
];

const POR_PAGINA = 12;

const IAASGraficasContenido = ({ indSel: extIndSel, onIndSelChange, iconSrc, indsHermanos = [] }) => {
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [colorFiltro, setColorFiltro] = useState(null);
  const [pagina, setPagina]           = useState(0);

  const {
    anio, datos, indSel,
    unidadSel, setUnidadSel,  
    cargando, descargando, handleDescargar, handleDescargarInd,
    vistaGrafica, setVistaGrafica,
    acumulado, setAcumulado,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes, totalMes,
    cumplimientoMes, cumplimientoUltimoMes,
    chartDataAcumulado, maxTasaAcumulado, totalAcumulado, cumplimientoAcumulado,
    chartDataAcumuladoUnidad, maxTasaAcumuladoUnidad,
    chartDataAcumuladoTotal, maxTasaAcumuladoTotal,
    unidadesStatus, unidadesStatusDisplay, indInfo, hgsSet,
    rangosSem,
    indColor, sinDatos, hayDatos,
    HGS_COLOR, HGS_BG,
    TOTAL_KEY,
  } = useIAASGrafica(extIndSel, onIndSelChange);

  const esTotal = unidadSel === TOTAL_KEY;

  // El filtro de color es una selección de la vista, no del indicador — se limpia al cambiar de indicador.
  useEffect(() => { setColorFiltro(null); }, [indSel]);
  // Resetear página al cambiar indicador, mes, filtro de color o modo acumulado
  useEffect(() => { setPagina(0); }, [indSel, mesSel, colorFiltro, acumulado]);

  const unidadesParaPanel = colorFiltro
    ? unidadesStatusDisplay.filter(u => u.color === colorFiltro)
    : unidadesStatusDisplay;

  const chartDataMesFiltrado = colorFiltro
    ? chartDataMes.filter(d => d.color === colorFiltro)
    : chartDataMes;

  const chartDataAcumuladoFiltrado = colorFiltro
    ? chartDataAcumulado.filter(d => d.color === colorFiltro)
    : chartDataAcumulado;

  const datosMesActivo   = acumulado ? chartDataAcumuladoFiltrado : chartDataMesFiltrado;
  const totalPaginas     = Math.ceil(datosMesActivo.length / POR_PAGINA) || 1;
  const dataMesPaginada  = datosMesActivo.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  return (
    <main className="ig-main">

      {/* ── Título + ficha técnica ── */}
      <div className="ig-header">
        <div className="ig-title-block">
          <h1 className="ig-title" style={{ color: indColor }}>{indSel}</h1>
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
              <p className="ig-desc-titulo">{indInfo.titulo}</p>
              <div className="ig-desc-meta">
                <span className="ig-desc-row"><span className="ig-desc-label">Num</span>{indInfo.descripcionNumerador}</span>
                <span className="ig-desc-row"><span className="ig-desc-label">Den</span>{indInfo.descripcionDenominador}</span>
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

      {/* ── Skeleton ── */}
      {cargando && (
        <div className="ig-skeleton">
          {[220, 320, 260, 180, 290, 240, 310, 200, 270, 230, 300, 250].map((h, i) => (
            <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
          ))}
        </div>
      )}

      {/* ── Sin datos ── */}
      {sinDatos && (
        <div className="ig-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
          </svg>
          Sin datos guardados para {anio}
        </div>
      )}

      {/* ── Gráfica ── */}
      {hayDatos && (
        <div className="ig-chart-card">

          <CumplimientoTile
            conteo={
              vistaGrafica === 'mes'
                ? (acumulado ? cumplimientoAcumulado : cumplimientoMes)
                : cumplimientoUltimoMes
            }
            colorActivo={colorFiltro}
            onSelectColor={setColorFiltro}
            rangos={rangosSem}
          />

          <div className="ig-body">
            {/* Panel izquierdo: meses en "Por mes", unidades en el resto */}
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
                unidades={unidadesParaPanel}
                unidadSel={unidadSel}
                vistaGrafica={vistaGrafica}
                indColor={indColor}
                busq={busqUnidad}
                onBusq={setBusqUnidad}
                onSelect={u => { setUnidadSel(u); if (vistaGrafica === 'mes') setVistaGrafica('unidad'); }}
                hgsSet={hgsSet}
                mostrarHgs={indSel === 'IAAS 01'}
                HGS_COLOR={HGS_COLOR}
                HGS_BG={HGS_BG}
              />
            )}

            {/* Área de gráfica */}
            <div className="ig-chart-area" style={{ position: 'relative' }}>
              {iconSrc && <img src={iconSrc} alt="" className="ig-chart-watermark" />}
              <div className="ig-chart-topbar">
                <div className="ig-chart-topbar-left">
                  <VistaToggle vistas={VISTAS_IAAS} actual={vistaGrafica} onChange={setVistaGrafica} color={indColor} />
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
                  <div className="ig-chart-badges">
                    {vistaGrafica === 'unidad' && (
                      <>
                        <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                          {unidadSel}{acumulado ? ' — acumulado' : ''}
                        </span>
                        {indSel === 'IAAS 01' && !esTotal && (
                          <span className="ig-badge" style={{
                            background: hgsSet.has(unidadSel) ? HGS_BG : '#f1f5f9',
                            color: hgsSet.has(unidadSel) ? HGS_COLOR : '#64748b', fontWeight: 700,
                          }}>
                            {hgsSet.has(unidadSel) ? 'HGS' : 'Otros'}
                          </span>
                        )}
                      </>
                    )}
                    {vistaGrafica === 'mes' && (
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                        {MESES_CORTOS[parseInt(mesSel) - 1]}{acumulado ? ' — acumulado' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ig-controls">
                  <span className="ig-year-chip">{anio}</span>
                  <MenuDescarga
                    disabled={descargando}
                    opciones={[
                      { label: `Descargar ${indSel}`, onClick: () => handleDescargarInd(indSel) },
                      { label: 'Descargar todos los IAAS', onClick: handleDescargar, multiple: true },
                    ]}
                  />
                </div>
              </div>

              {vistaGrafica === 'unidad' && !acumulado && (
                <GraficaBarras
                  chartKey={`u-${indSel}-${unidadSel}`}
                  data={chartData}
                  xKey="mes"
                  maxTasa={maxTasa}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                />
              )}

              {vistaGrafica === 'unidad' && acumulado && !esTotal && (
                <GraficaBarras
                  chartKey={`au-${indSel}-${unidadSel}`}
                  data={chartDataAcumuladoUnidad}
                  xKey="mes"
                  maxTasa={maxTasaAcumuladoUnidad}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                />
              )}

              {vistaGrafica === 'unidad' && acumulado && esTotal && (
                <GraficaBarras
                  chartKey={`at-${indSel}`}
                  data={chartDataAcumuladoTotal}
                  xKey="mes"
                  maxTasa={maxTasaAcumuladoTotal}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                />
              )}

              {vistaGrafica === 'mes' && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <GraficaBarras
                      chartKey={`m-${indSel}-${mesSel}-${acumulado ? 'a' : 'n'}-p${pagina}`}
                      data={dataMesPaginada}
                      xKey="unidad"
                      maxTasa={acumulado ? maxTasaAcumulado : maxTasaMes}
                      indSel={indSel}
                      maxBarSize={48}
                      bottomMargin={64}
                      labelSize="9px"
                      tickEl={<TickMesUnidad hgsSet={hgsSet} indSel={indSel} />}
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
                          {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, datosMesActivo.length)} de {datosMesActivo.length} unidades
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
                    <TotalTile total={acumulado ? totalAcumulado : totalMes} indColor={indColor} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default IAASGraficasContenido;
