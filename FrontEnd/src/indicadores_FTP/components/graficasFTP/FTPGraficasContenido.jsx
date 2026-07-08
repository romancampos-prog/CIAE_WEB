import { useState } from 'react';
import { useRol } from '../../../auth/hooks/useRol';
import { useFTPGrafica } from '../../hooks/useFTPGrafica';
import GraficaBarras  from '../../../shared/components/graficas/GraficaBarras';
import PanelUnidades  from '../../../shared/components/graficas/PanelUnidades';
import SemaforoUmbral from '../../../shared/components/graficas/SemaforoUmbral';
import VistaToggle    from '../../../shared/components/graficas/VistaToggle';
import { MESES_CORTOS } from '../../../shared/constants/meses';

const MESES = MESES_CORTOS;

const VISTAS_FTP = [
  { id: 'unidad', label: 'Por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'mes',    label: 'Por mes',    path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
];

const FTPGraficasContenido = ({ indSel: extIndSel, onIndSelChange }) => {
  const { puedeGenFTP } = useRol();
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [hoveredMes, setHoveredMes]   = useState(null);

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

  return (
    <main className="ig-main">

      {/* ── Título + ficha técnica ── */}
      <div className="ig-header">
        <div className="ig-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 className="ig-title" style={{ color: indColor, margin: 0 }}>
              {indSel || 'Indicadores FTP'}
            </h1>
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
          </div>
          {indInfo && infoAbierta && (
            <div className="ig-desc-block ig-desc-block--open">
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

          {/* Controles top */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div className="ig-controls">
              <div className="ig-control-group">
                <label className="ig-control-label">Año</label>
                <span className="ig-select" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, color: indColor, cursor: 'default' }}>
                  {anio}
                </span>
              </div>
              {vistaGrafica === 'mes' && (
                <div className="ig-control-group">
                  <label className="ig-control-label">Mes</label>
                  <select className="ig-select" value={mesSel} onChange={e => setMesSel(e.target.value)}>
                    {datos?.meses_con_datos?.map(m => (
                      <option key={m} value={m}>{MESES[parseInt(m) - 1]}</option>
                    ))}
                  </select>
                </div>
              )}
              {puedeGenFTP && mesSel && (
                <>
                  <button
                    className="ig-btn-dl"
                    disabled={descargando}
                    onClick={() => descargarIndicador(mesSel)}
                    title={`Descargar ${indSel} — ${MESES[parseInt(mesSel) - 1]} ${anio}`}
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
                    title={`Descargar todos ${categoria} — ${MESES[parseInt(mesSel) - 1]} ${anio}`}
                  >
                    {descargando ? '…' : `Todos ${categoria}`}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="ig-body">
            {/* Panel unidades */}
            <PanelUnidades
              unidades={unidadesStatus}
              unidadSel={unidadSel}
              vistaGrafica={vistaGrafica}
              indColor={indColor}
              busq={busqUnidad}
              onBusq={setBusqUnidad}
              onSelect={u => { setUnidadSel(u); setVistaGrafica('unidad'); }}
            />

            {/* Área de gráfica */}
            <div className="ig-chart-area">
              <VistaToggle vistas={VISTAS_FTP} actual={vistaGrafica} onChange={setVistaGrafica} color={indColor} />

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
                        {MESES[parseInt(mesSel) - 1]} {anio}
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
                <GraficaBarras
                  chartKey={`m-${indSel}-${mesSel}`}
                  data={chartDataMes}
                  xKey="unidad"
                  maxTasa={maxTasaMes}
                  indSel={indSel}
                  maxBarSize={20}
                  barRadius={[6, 6, 0, 0]}
                  bottomMargin={64}
                  labelSize="8px"
                />
              )}
            </div>
          </div>
        </div>
      )}


    </main>
  );
};

export default FTPGraficasContenido;
