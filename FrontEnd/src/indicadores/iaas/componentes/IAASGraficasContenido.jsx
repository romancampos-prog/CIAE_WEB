import { useState } from 'react';
import { useIAASGrafica } from '../hooks/useIAASGrafica';
import TickMesUnidad  from './graficas/TickMesUnidad';
import GraficaBarras  from '../../shared/componentes/graficas/GraficaBarras';
import PanelUnidades  from '../../shared/componentes/graficas/PanelUnidades';
import SemaforoUmbral from '../../shared/componentes/graficas/SemaforoUmbral';
import VistaToggle    from '../../shared/componentes/graficas/VistaToggle';
import { MESES_CORTOS, MESES_LARGOS } from '../../shared/constantes/meses';

const VISTAS_IAAS = [
  { id: 'unidad',    label: 'Por unidad',  path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'mes',       label: 'Por mes',     path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
  { id: 'acumulado', label: 'Acum. por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/></> },
];

const IAASGraficasContenido = ({ indSel: extIndSel, onIndSelChange, iconSrc }) => {
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);

  const {
    anio, datos, indSel,
    unidadSel, setUnidadSel,
    cargando, descargando, handleDescargar, handleDescargarInd,
    vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes,
    chartDataAcumuladoUnidad, maxTasaAcumuladoUnidad,
    chartDataAcumuladoTotal, maxTasaAcumuladoTotal,
    unidadesStatus, unidadesStatusDisplay, indInfo, hgsSet,
    rangosSem, rangosSemExtra,
    indColor, sinDatos, hayDatos,
    HGS_COLOR, HGS_BG,
    TOTAL_KEY,
  } = useIAASGrafica(extIndSel, onIndSelChange);

  const esTotal = unidadSel === TOTAL_KEY;

  return (
    <main className="ig-main">

      {/* ── Título + ficha técnica ── */}
      <div className="ig-header">
        <h1 className="ig-title" style={{ color: indColor }}>{indSel}</h1>
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
                unidades={unidadesStatusDisplay}
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
                <VistaToggle vistas={VISTAS_IAAS} actual={vistaGrafica} onChange={setVistaGrafica} color={indColor} />
                <div className="ig-controls">
                  <div className="ig-control-group">
                    <label className="ig-control-label">Año</label>
                    <span className="ig-select" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, color: indColor, cursor: 'default', userSelect: 'none' }}>
                      {anio}
                    </span>
                  </div>
                  {vistaGrafica === 'acumulado' && (
                    <div className="ig-control-group">
                      <label className="ig-control-label">Hasta</label>
                      <select className="ig-select" value={mesSel} onChange={e => setMesSel(e.target.value)}>
                        {datos?.meses_con_datos?.map(m => (
                          <option key={m} value={m}>{MESES_CORTOS[parseInt(m) - 1]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="ig-control-group">
                    <label className="ig-control-label">Descargar excel</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="ig-btn-dl"
                        onClick={() => handleDescargarInd(indSel)}
                        disabled={descargando}
                        title={`Descargar ${indSel} — ${anio}`}
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
                        onClick={handleDescargar}
                        disabled={descargando}
                        title={`Descargar todos los IAAS — ${anio}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {descargando ? '…' : 'Todos IAAS'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ig-chart-top">
                <div className="ig-chart-badges">
                  {vistaGrafica === 'unidad' && (
                    <>
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>{unidadSel}</span>
                      {indSel === 'IAAS 01' && !esTotal && (
                        <span className="ig-badge" style={{
                          background: hgsSet.has(unidadSel) ? HGS_BG : '#f1f5f9',
                          color: hgsSet.has(unidadSel) ? HGS_COLOR : '#64748b', fontWeight: 700,
                        }}>
                          {hgsSet.has(unidadSel) ? 'HGS' : 'Otros'}
                        </span>
                      )}
                      <span className="ig-badge ig-badge--neutral">{anio}</span>
                    </>
                  )}
                  {vistaGrafica === 'mes' && (
                    <>
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                        {MESES_CORTOS[parseInt(mesSel) - 1]} {anio}
                      </span>
                      <span className="ig-badge ig-badge--neutral">Todas las unidades + TOTAL</span>
                    </>
                  )}
                  {vistaGrafica === 'acumulado' && (
                    <>
                      <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                        {esTotal ? 'TOTAL OOAD' : unidadSel} — acumulado
                      </span>
                      <span className="ig-badge ig-badge--neutral">Ene – {MESES_CORTOS[parseInt(mesSel) - 1]}</span>
                      <span className="ig-badge ig-badge--neutral">Evolución mes a mes</span>
                    </>
                  )}
                </div>
                <SemaforoUmbral
                  rangos={[rangosSem, rangosSemExtra]}
                  indColor={indColor}
                />
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
                />
              )}

              {vistaGrafica === 'mes' && (
                <GraficaBarras
                  chartKey={`m-${indSel}-${mesSel}`}
                  data={chartDataMes}
                  xKey="unidad"
                  maxTasa={maxTasaMes}
                  indSel={indSel}
                  maxBarSize={44}
                  bottomMargin={64}
                  labelSize="9px"
                  tickEl={<TickMesUnidad hgsSet={hgsSet} indSel={indSel} />}
                />
              )}

              {vistaGrafica === 'acumulado' && !esTotal && (
                <GraficaBarras
                  chartKey={`au-${indSel}-${unidadSel}-${mesSel}`}
                  data={chartDataAcumuladoUnidad}
                  xKey="mes"
                  maxTasa={maxTasaAcumuladoUnidad}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                />
              )}

              {vistaGrafica === 'acumulado' && esTotal && (
                <GraficaBarras
                  chartKey={`at-${indSel}-${mesSel}`}
                  data={chartDataAcumuladoTotal}
                  xKey="mes"
                  maxTasa={maxTasaAcumuladoTotal}
                  indSel={indSel}
                  maxBarSize={56}
                  conLinea
                />
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default IAASGraficasContenido;
