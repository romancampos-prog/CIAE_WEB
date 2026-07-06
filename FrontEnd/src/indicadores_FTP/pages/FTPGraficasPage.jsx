import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useRol } from '../../auth/hooks/useRol';
import logo_imss from '../../assets/logo_imms.png';
import { useFTPGrafica } from '../hooks/useFTPGrafica';
import ChartTooltip from '../components/graficasFTP/ChartTooltip';
import { COLOR_SEMAFORO } from '../../shared/constants/semaforo';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import './ftp.css';

const FTPGraficasPage = () => {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const { puedeGenFTP }  = useRol();
  const [busqUnidad, setBusqUnidad]   = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [hoveredMes, setHoveredMes]   = useState(null);

  const [mesDl, setMesDl] = useState('');

  const {
    anio, indSel, setIndSel, indInfo,
    datos, unidadSel, setUnidadSel,
    cargando, descargando, vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    todosLosIndicadores, chartData, maxTasa,
    chartDataMes, maxTasaMes, unidadesStatus,
    rangosSem, esSemPorMes, indColor, categoria,
    descargarIndicador, descargarCategoria,
  } = useFTPGrafica(hoveredMes);

  const mesesDisponibles = datos?.meses_con_datos ?? [];
  const MESES_CORTOS_ARR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  useEffect(() => { document.title = 'FTP Gráficas | CIAE'; }, []);

  return (
    <div className="ia-root">
      <div className="ia-bg" aria-hidden>
        <div className="ia-orb ia-orb-1" />
        <div className="ia-orb ia-orb-2" />
        <div className="ia-orb ia-orb-3" />
        <div className="ciae-grid" />
      </div>

      <header className="ia-nav">
        <div className="ia-nav-left">
          <img src={logo_imss} alt="IMSS" className="ia-logo" />
          <div className="ia-nav-sep" />
          <button className="ia-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            FTP
          </button>
        </div>
        <div className="ia-user-pill">
          <span className="ia-user-led" />
          {user?.user || 'Invitado'}
        </div>
      </header>

      <main className="ig-main">

        {/* Cabecera */}
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

        {/* Selector de indicador */}
        {todosLosIndicadores.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1.2px', color: indColor,
              background: `${indColor}14`, borderLeft: `3px solid ${indColor}`,
              padding: '3px 10px 3px 8px', borderRadius: '0 6px 6px 0',
              width: 'fit-content', marginBottom: '10px',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Indicadores
            </span>
            <div className="ig-tabs" style={{ flexWrap: 'wrap' }}>
              {todosLosIndicadores.map(ind => (
                <button key={ind}
                  className={`ig-tab ${indSel === ind ? 'ig-tab--active' : ''}`}
                  style={indSel === ind ? { '--c': indColor } : {}}
                  onClick={() => setIndSel(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        )}

        {cargando && (
          <div className="ig-skeleton">
            {[180, 260, 220, 300, 240, 280, 200, 320, 190, 270].map((h, i) => (
              <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
            ))}
          </div>
        )}

        {!cargando && (!datos || datos.meses_con_datos?.length === 0) && indSel && (
          <div className="ig-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
            </svg>
            Sin datos guardados para {indSel} – {anio}
          </div>
        )}

        {!cargando && datos?.meses_con_datos?.length > 0 && (
          <div className="ig-chart-card">

            {/* Controles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
                      <option key={m} value={m}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m)-1]}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="ig-body">

              {/* Panel de unidades */}
              <div className="ig-unit-list">
                <p className="ig-unit-list-title">Unidades</p>
                <div className="ig-unit-search-wrap">
                  <svg className="ig-unit-search-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input className="ig-unit-search" placeholder="Buscar…" value={busqUnidad} onChange={e => setBusqUnidad(e.target.value)} />
                  {busqUnidad && <button className="ig-unit-search-clear" onClick={() => setBusqUnidad('')}>×</button>}
                </div>
                {unidadesStatus
                  .filter(({ unidad }) => unidad.toLowerCase().includes(busqUnidad.toLowerCase()))
                  .map(({ unidad, color }) => (
                    <button key={unidad}
                      className={`ig-unit-item ${unidadSel === unidad && vistaGrafica === 'unidad' ? 'ig-unit-item--active' : ''}`}
                      style={unidadSel === unidad && vistaGrafica === 'unidad' ? { borderLeftColor: indColor } : {}}
                      onClick={() => { setUnidadSel(unidad); setVistaGrafica('unidad'); }}
                    >
                      <span className="ig-unit-name">{unidad}</span>
                      {color === 'Rojo' && <span className="ig-unit-rojo-badge" title="Umbral rojo en último mes">!</span>}
                    </button>
                  ))}
              </div>

              {/* Área de gráfica */}
              <div className="ig-chart-area">

                <div className="ig-vista-toggle">
                  {[
                    { id: 'unidad', label: 'Por unidad', path: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
                    { id: 'mes',    label: 'Por mes',    path: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
                  ].map(({ id, label, path }) => (
                    <button key={id}
                      className={`ig-vista-btn ${vistaGrafica === id ? 'ig-vista-btn--active' : ''}`}
                      style={vistaGrafica === id ? { '--vc': indColor } : {}}
                      onClick={() => setVistaGrafica(id)}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="ig-chart-top">
                  <div className="ig-chart-badges">
                    {vistaGrafica === 'unidad' && (
                      <>
                        <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>{unidadSel}</span>
                        <span className="ig-badge ig-badge--neutral">{anio}</span>
                      </>
                    )}
                    {vistaGrafica === 'mes' && (
                      <>
                        <span className="ig-badge" style={{ background: `${indColor}14`, color: indColor }}>
                          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mesSel)-1]} {anio}
                        </span>
                        <span className="ig-badge ig-badge--neutral">Todas las unidades</span>
                      </>
                    )}
                  </div>
                  <div className="ig-semaforo" style={{ alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', paddingTop: '2px', paddingRight: '6px', whiteSpace: 'nowrap' }}>
                      Umbral
                      {rangosSem && esSemPorMes && (
                        <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#cbd5e1', marginTop: '1px' }}>
                          {rangosSem._mes ?? ''}
                        </span>
                      )}
                    </span>
                    {Object.entries(COLOR_SEMAFORO).map(([k, v]) => (
                      <span key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span className="ig-sem-dot" style={{ background: v }} />
                          <span style={{ color: v, fontWeight: 700, fontSize: '0.72rem' }}>{k}</span>
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {rangosSem?.[k] ?? '—'}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Gráfica por unidad */}
                {vistaGrafica === 'unidad' && (
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart key={`u-${indSel}-${unidadSel}`} data={chartData} margin={{ top: 28, right: 16, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} domain={[0, maxTasa]} />
                      <Tooltip content={<ChartTooltip indSel={indSel} />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
                      <Bar dataKey="tasa" maxBarSize={56} radius={[8,8,0,0]} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out"
                        onMouseEnter={(d) => esSemPorMes && setHoveredMes(d.mesNum)}
                        onMouseLeave={() => esSemPorMes && setHoveredMes(null)}
                      >
                        {chartData.map((d, i) => <Cell key={i} fill={COLOR_SEMAFORO[d.color] ?? '#aaa'} fillOpacity={0.9} />)}
                        <LabelList dataKey="tasa" position="top" formatter={v => v > 0 ? Number(v).toFixed(2) : ''} style={{ fontSize: '10px', fontWeight: 700, fill: '#475569' }} />
                      </Bar>
                      <Line dataKey="tasa" type="monotone" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls isAnimationActive animationBegin={300} animationDuration={900} animationEasing="ease-out" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

                {/* Gráfica por mes */}
                {vistaGrafica === 'mes' && (
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart key={`m-${indSel}-${mesSel}`} data={chartDataMes} margin={{ top: 28, right: 16, left: -10, bottom: 64 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="unidad" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} angle={-38} textAnchor="end"
                        tickFormatter={v => v.length > 15 ? v.slice(0, 14) + '…' : v} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} domain={[0, maxTasaMes]} />
                      <Tooltip content={<ChartTooltip indSel={indSel} />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
                      <Bar dataKey="tasa" maxBarSize={20} radius={[6,6,0,0]} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out">
                        {chartDataMes.map((d, i) => <Cell key={i} fill={COLOR_SEMAFORO[d.color] ?? '#aaa'} fillOpacity={0.9} />)}
                        <LabelList dataKey="tasa" position="top" formatter={v => v > 0 ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fontWeight: 700, fill: '#475569' }} />
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ── Panel de descarga — solo admin y trabajador_ftp ── */}
        {puedeGenFTP && mesesDisponibles.length > 0 && (
          <div className="ig-dl-panel">
            <span className="ig-dl-titulo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar Excel
            </span>

            <select
              className="ig-select"
              value={mesDl}
              onChange={e => setMesDl(e.target.value)}
            >
              <option value="">— Mes —</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>
                  {MESES_CORTOS_ARR[parseInt(m) - 1]}
                </option>
              ))}
            </select>

            <button
              className="ig-dl-btn"
              style={{ '--c': indColor }}
              disabled={!mesDl || descargando}
              onClick={() => descargarIndicador(mesDl)}
            >
              {descargando ? '…' : indSel}
            </button>

            <button
              className="ig-dl-btn ig-dl-btn--cat"
              style={{ '--c': indColor }}
              disabled={!mesDl || descargando}
              onClick={() => descargarCategoria(mesDl)}
            >
              {descargando ? '…' : `Todos ${categoria}`}
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default FTPGraficasPage;
