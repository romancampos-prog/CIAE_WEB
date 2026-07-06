import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo_imss from '../../assets/logo_imms.png';
import { getAllIndicadores, getFTPDatosGrafica, getIndicador } from '../../api/traerIndicador';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import './ftp.css';

const NOMBRES_MESES = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];

const COLOR_SEMAFORO = { Verde: '#0b5445', Amarillo: '#9a7026', Rojo: '#7E0808' };

const CustomTooltip = ({ active, payload, label, indSel }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  const color = COLOR_SEMAFORO[d.color] ?? '#aaa';
  return (
    <div className="ia-chart-tooltip">
      <p className="ia-chart-tooltip-mes">{label}</p>
      <div className="ia-chart-tooltip-row" style={{ marginBottom: '6px' }}>
        <span className="ia-chart-tooltip-dot" style={{ background: color }} />
        <span className="ia-chart-tooltip-ind">{indSel}</span>
        <strong>{d.tasa != null ? Number(d.tasa).toFixed(2) : '—'}</strong>
      </div>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', gap: '10px' }}>
        <span>Num: <strong style={{ color: '#374151' }}>{d.numerador ?? '—'}</strong></span>
        <span>Den: <strong style={{ color: '#374151' }}>{d.denominador ?? '—'}</strong></span>
      </div>
    </div>
  );
};

const FTPGraficasPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anio]                          = useState('2026');
  const [listaIndicadores, setLista]    = useState({});
  const [indSel, setIndSel]             = useState('');
  const [indInfo, setIndInfo]           = useState(null);
  const [datos, setDatos]               = useState(null);
  const [unidadSel, setUnidadSel]       = useState('');
  const [cargando, setCargando]         = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('unidad');
  const [mesSel, setMesSel]             = useState('');
  const [infoAbierta, setInfoAbierta]   = useState(false);
  const [hoveredMes, setHoveredMes]     = useState(null);
  const [busqUnidad, setBusqUnidad]     = useState(''); // mesNum (1-12) de la barra bajo el cursor en vista "Por unidad"

  useEffect(() => { document.title = 'FTP Gráficas | CIAE'; }, []);

  // Cargar lista de indicadores disponibles
  useEffect(() => {
    getAllIndicadores().then(res => {
      const lista = res?.data ?? {};
      setLista(lista);
      // Seleccionar el primer sub-indicador disponible
      const cats = Object.values(lista);
      if (cats.length > 0) {
        const primero = cats[0]?.indicadores?.[0];
        if (primero) setIndSel(primero);
      }
    }).catch(() => {});
  }, []);

  // Cargar datos e info del indicador cuando cambia
  useEffect(() => {
    if (!indSel) return;
    setCargando(true);
    setDatos(null);
    setIndInfo(null);
    setUnidadSel('');
    Promise.all([
      getFTPDatosGrafica(indSel, anio),
      getIndicador(indSel).catch(() => ({ data: null })),
    ]).then(([d, infoRes]) => {
      setDatos(d);
      setIndInfo(infoRes?.data ?? null);
      if (d.unidades?.length > 0) setUnidadSel(d.unidades[0]);
      if (d.meses_con_datos?.length > 0)
        setMesSel(d.meses_con_datos[d.meses_con_datos.length - 1]);
    }).finally(() => setCargando(false));
  }, [indSel, anio]);

  // Lista plana de todos los sub-indicadores para los tabs
  const todosLosIndicadores = useMemo(() => {
    const acc = [];
    Object.values(listaIndicadores).forEach(cat => {
      (cat.indicadores ?? []).forEach(ind => acc.push(ind));
    });
    return acc;
  }, [listaIndicadores]);

  // Chart por unidad (todos sus meses)
  const chartData = useMemo(() => {
    if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
    const arr = datos.datos?.[unidadSel] ?? [];
    return datos.meses_con_datos.map(mes => {
      const reg = arr.find(r => r.mes === mes);
      return {
        mes:         NOMBRES_MESES[parseInt(mes) - 1],
        mesNum:      parseInt(mes),
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });
  }, [datos, unidadSel]);

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  // Chart por mes (todas las unidades)
  const chartDataMes = useMemo(() => {
    if (!datos?.unidades || !mesSel) return [];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[u] ?? [];
      const reg = arr.find(r => r.mes === mesSel);
      return {
        unidad:      u,
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });
  }, [datos, mesSel]);

  const maxTasaMes = useMemo(
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

  // Estado de cada unidad en el último mes (panel lateral)
  const unidadesStatus = useMemo(() => {
    if (!datos?.unidades) return [];
    const ultimoMes = datos.meses_con_datos?.[datos.meses_con_datos.length - 1];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[u] ?? [];
      const reg = arr.find(r => r.mes === ultimoMes);
      return { unidad: u, color: reg?.color ?? 'Gris' };
    });
  }, [datos]);

  const sinDatos = !cargando && (!datos || datos.meses_con_datos?.length === 0);
  const hayDatos = !cargando && datos?.meses_con_datos?.length > 0;

  const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Mes cuyo umbral se debe mostrar:
  // - "Por mes"    → mesSel (el mes del selector)
  // - "Por unidad" → mes bajo el cursor; si no hay hover, el último mes con datos
  const ultimoMesNum = useMemo(
    () => parseInt(datos?.meses_con_datos?.at(-1) ?? '1'),
    [datos]
  );
  const mesParaSem = vistaGrafica === 'unidad'
    ? (hoveredMes ?? ultimoMesNum)
    : parseInt(mesSel || '1');

  const esSemPorMes = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return false;
    return MESES_NOMBRES.some(m => m in sem);
  }, [indInfo]);

  const rangosSem = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return null;
    const nombreMes = MESES_NOMBRES[mesParaSem - 1];
    const limites = (nombreMes && sem[nombreMes]) ? sem[nombreMes] : sem;
    const esp = limites?.Esperado;
    if (esp === undefined) return null;
    const tieneAlto = 'Alto' in limites;
    const critico   = tieneAlto ? limites.Alto : limites.Bajo;
    return tieneAlto
      ? { Verde: `≤ ${esp}`, Amarillo: `> ${esp} – < ${critico}`, Rojo: `≥ ${critico}`, _mes: nombreMes }
      : { Verde: `≥ ${esp}`, Amarillo: `> ${critico} – < ${esp}`, Rojo: `≤ ${critico}`, _mes: nombreMes };
  }, [indInfo, mesParaSem]);

  // Color del indicador por categoría
  const CAT_COLOR = {
    CAMA: '#0b5445', CACU: '#1a5276', EH: '#7d4f00', DM: '#5c35a0',
    MT: '#7E0808',   CUPN: '#336699', S_Ob: '#9a7026', CE: '#2e7d32',
  };
  const indColor = CAT_COLOR[indSel?.split(' ')[0]] ?? '#0b5445';

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
                <button
                  className="ig-info-toggle"
                  onClick={() => setInfoAbierta(v => !v)}
                  title={infoAbierta ? 'Ocultar ficha' : 'Ver ficha técnica'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {infoAbierta ? 'Ocultar detalle' : 'Ver detalle'}
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: infoAbierta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              )}
            </div>

            {indInfo && infoAbierta && (
              <div className="ig-desc-block ig-desc-block--open">
                <p className="ig-desc-titulo">{indInfo.titulo}</p>
                <div className="ig-desc-meta">
                  <span className="ig-desc-row">
                    <span className="ig-desc-label">Num</span>
                    {indInfo.descripcionNumerador}
                  </span>
                  <span className="ig-desc-row">
                    <span className="ig-desc-label">Den</span>
                    {indInfo.descripcionDenominador}
                  </span>
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
              width: 'fit-content', marginBottom: '10px'
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Indicadores
            </span>
            <div className="ig-tabs" style={{ flexWrap: 'wrap' }}>
              {todosLosIndicadores.map(ind => (
                <button
                  key={ind}
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

        {/* Cargando */}
        {cargando && (
          <div className="ig-skeleton">
            {[180, 260, 220, 300, 240, 280, 200, 320, 190, 270].map((h, i) => (
              <div key={i} className="ig-skeleton-bar" style={{ height: `${h}px` }} />
            ))}
          </div>
        )}

        {/* Sin datos */}
        {sinDatos && !cargando && indSel && (
          <div className="ig-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
            </svg>
            Sin datos guardados para {indSel} – {anio}
          </div>
        )}

        {/* Gráfica */}
        {hayDatos && (
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
                      <option key={m} value={m}>{NOMBRES_MESES[parseInt(m) - 1]}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Cuerpo */}
            <div className="ig-body">

              {/* Panel de unidades */}
              <div className="ig-unit-list">
                <p className="ig-unit-list-title">Unidades</p>
                <div className="ig-unit-search-wrap">
                  <svg className="ig-unit-search-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="ig-unit-search"
                    placeholder="Buscar…"
                    value={busqUnidad}
                    onChange={e => setBusqUnidad(e.target.value)}
                  />
                  {busqUnidad && (
                    <button className="ig-unit-search-clear" onClick={() => setBusqUnidad('')}>×</button>
                  )}
                </div>
                {unidadesStatus
                  .filter(({ unidad }) => unidad.toLowerCase().includes(busqUnidad.toLowerCase()))
                  .map(({ unidad, color }) => (
                    <button
                      key={unidad}
                      className={`ig-unit-item ${unidadSel === unidad && vistaGrafica === 'unidad' ? 'ig-unit-item--active' : ''}`}
                      style={unidadSel === unidad && vistaGrafica === 'unidad' ? { borderLeftColor: indColor } : {}}
                      onClick={() => { setUnidadSel(unidad); setVistaGrafica('unidad'); }}
                    >
                      <span className="ig-unit-name">{unidad}</span>
                      {color === 'Rojo' && (
                        <span className="ig-unit-rojo-badge" title="Umbral rojo en último mes">!</span>
                      )}
                    </button>
                  ))}
              </div>

              {/* Área de gráfica */}
              <div className="ig-chart-area">

                {/* Toggle */}
                <div className="ig-vista-toggle">
                  <button
                    className={`ig-vista-btn ${vistaGrafica === 'unidad' ? 'ig-vista-btn--active' : ''}`}
                    style={vistaGrafica === 'unidad' ? { '--vc': indColor } : {}}
                    onClick={() => setVistaGrafica('unidad')}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
                    </svg>
                    Por unidad
                  </button>
                  <button
                    className={`ig-vista-btn ${vistaGrafica === 'mes' ? 'ig-vista-btn--active' : ''}`}
                    style={vistaGrafica === 'mes' ? { '--vc': indColor } : {}}
                    onClick={() => setVistaGrafica('mes')}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Por mes
                  </button>
                </div>

                {/* Badges */}
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
                          {NOMBRES_MESES[parseInt(mesSel) - 1]} {anio}
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

                {/* Gráfica: por unidad */}
                {vistaGrafica === 'unidad' && (
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart key={`u-${indSel}-${unidadSel}`} data={chartData} margin={{ top: 28, right: 16, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} domain={[0, maxTasa]} />
                      <Tooltip content={<CustomTooltip indSel={indSel} />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
                      <Bar
                        dataKey="tasa" maxBarSize={56} radius={[8, 8, 0, 0]}
                        isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out"
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

                {/* Gráfica: por mes */}
                {vistaGrafica === 'mes' && (
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart key={`m-${indSel}-${mesSel}`} data={chartDataMes} margin={{ top: 28, right: 16, left: -10, bottom: 64 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis
                        dataKey="unidad"
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false} tickLine={false}
                        angle={-38} textAnchor="end"
                        tickFormatter={v => v.length > 15 ? v.slice(0, 14) + '…' : v}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} domain={[0, maxTasaMes]} />
                      <Tooltip content={<CustomTooltip indSel={indSel} />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
                      <Bar dataKey="tasa" maxBarSize={20} radius={[6, 6, 0, 0]} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-out">
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

      </main>
    </div>
  );
};

export default FTPGraficasPage;
