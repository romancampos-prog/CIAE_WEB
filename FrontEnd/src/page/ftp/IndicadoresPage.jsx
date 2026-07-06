import './ftp.css';
import './indicadores.css';
import '../configurarIndicador/config.css';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logo_imss from '../../assets/logo_imms.png';
import ModalPoblacion from '../../componentes/modalPoblacion/ModalPoblacion';
import ModalLoading from '../modal/modalCargando';
import ModalExito from '../modal/modalExito';
import ToastWarning from '../../toast/ToastWarning';
import { useAuth } from '../../context/AuthContext';
import { getAllIndicadores, getIndicador } from '../../api/traerIndicador';
import { getReporte, getMesesGenerados, generarCategoria } from '../../api/generarReporte';

const COLORS = {
  CAMA:         '#0b5445',
  CACU:         '#7e0808',
  EH:           '#9a7026',
  DM:           '#1a3a8f',
  MT:           '#065f46',
  CUPN:         '#336699',
  S_Ob:         '#b45309',
  CE:           '#0369a1',
};

const NOMBRES_MESES = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril',
  '05':'Mayo','06':'Junio','07':'Julio','08':'Agosto',
  '09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
};

const IcoDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IcoAll = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8m-4-4v4"/>
    <path d="M6 8h.01M10 8h8M6 12h.01M10 12h8"/>
  </svg>
);

function descargarB64(b64, nombre) {
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombre);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

const IndicadoresPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const esVisor   = user?.rol === 'visor';

  const fechaHoy     = new Date();
  const anioActual   = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1;
  const diaActual    = fechaHoy.getDate();
  const mesMaxVisor  = diaActual >= 30 ? mesActualNum : mesActualNum - 1;

  /* ── Indicadores ── */
  const [allIndicadores, setAllIndicadores] = useState({});
  const [cargandoLista, setCargandoLista]   = useState(true);
  const [categoria, setCategoria]           = useState(
    () => sessionStorage.getItem('categoria_actual') || 'CAMA'
  );
  const [indicadorSel, setIndicadorSel]     = useState(null);

  /* ── Config form ── */
  const [tipo,          setTipo]          = useState(esVisor ? 'final' : 'previo');
  const [datos,         setDatos]         = useState({ ano: anioActual.toString(), mes: '', semana: esVisor ? null : '1' });
  const [infoIndicador, setInfoIndicador] = useState(null);
  const [mesesFaltantes, setMesesFaltantes] = useState([]);

  /* ── Generación individual ── */
  const [cargando,     setCargando]     = useState(false);
  const [exito,        setExito]        = useState({ abierto: false, restricciones: null });
  const [mostrarToast, setMostrarToast] = useState(false);
  const [graficar,     setGraficar]     = useState(null);

  /* ── Generación batch ── */
  const [cargandoBatch, setCargandoBatch]   = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState(null);

  /* ── Modales ── */
  const [modalPoblacion, setModalPoblacion] = useState(false);

  useEffect(() => { document.title = 'Indicadores FTP | CIAE'; }, []);

  /* Cargar lista */
  useEffect(() => {
    getAllIndicadores()
      .then(res => {
        const data = res?.data ?? {};
        setAllIndicadores(data);
        if (!data[categoria] && Object.keys(data).length > 0)
          setCategoria(Object.keys(data)[0]);
      })
      .finally(() => setCargandoLista(false));
  }, []);

  /* Resetear indicador al cambiar categoría */
  useEffect(() => {
    sessionStorage.setItem('categoria_actual', categoria);
    setIndicadorSel(null);
    setInfoIndicador(null);
    setMesesFaltantes([]);
    setResultadoBatch(null);
  }, [categoria]);

  /* Info del indicador */
  useEffect(() => {
    if (!indicadorSel) { setInfoIndicador(null); return; }
    getIndicador(indicadorSel).then(res => setInfoIndicador(res.data)).catch(console.error);
  }, [indicadorSel]);

  /* Meses disponibles */
  const mesesDisponibles = useMemo(() => {
    const todos = Object.entries(NOMBRES_MESES);
    if (parseInt(datos.ano) === anioActual) {
      const limite = esVisor ? mesMaxVisor : mesActualNum;
      return todos.filter(([k]) => parseInt(k) <= limite);
    }
    return todos;
  }, [datos.ano, anioActual, mesActualNum, esVisor, mesMaxVisor]);

  /* Meses faltantes */
  useEffect(() => {
    if (!datos.mes || !indicadorSel || tipo !== 'final') { setMesesFaltantes([]); return; }
    getMesesGenerados(indicadorSel, datos.ano).then(generados => {
      const mesNum = parseInt(datos.mes);
      const faltantes = [];
      for (let i = 1; i < mesNum; i++) {
        const k = String(i).padStart(2, '0');
        if (!generados.includes(k)) faltantes.push(NOMBRES_MESES[k]);
      }
      setMesesFaltantes(faltantes);
    });
  }, [datos.mes, datos.ano, indicadorSel, tipo]);

  /* Semáforo */
  const semData = useMemo(() => {
    if (!infoIndicador?.semaforo) return null;
    const mesTexto = NOMBRES_MESES[datos.mes];
    const sem = (mesTexto && infoIndicador.semaforo[mesTexto])
      ? infoIndicador.semaforo[mesTexto] : infoIndicador.semaforo;
    if (!sem || (sem.Bajo === undefined && sem.Esperado === undefined)) return null;
    const esDesc = sem.Alto !== undefined;
    return {
      txtVerde:    esDesc ? `≤ ${sem.Esperado}%` : `≥ ${sem.Esperado}%`,
      txtAmarillo: esDesc ? `> ${sem.Esperado}% — < ${sem.Alto}%` : `> ${sem.Bajo}% — < ${sem.Esperado}%`,
      txtRojo:     esDesc ? `≥ ${sem.Alto}%`     : `≤ ${sem.Bajo}%`,
    };
  }, [infoIndicador, datos.mes]);

  const catData    = allIndicadores[categoria];
  const indicadores = catData?.indicadores ?? [];
  const catColor   = COLORS[categoria] ?? '#0b5445';
  const canGenerar = !!indicadorSel && !!datos.mes && !cargando && !cargandoBatch;
  const canBatch   = !!datos.mes && !cargando && !cargandoBatch && indicadores.length > 0;

  /* ── Generar individual ── */
  async function GenerarReporte() {
    if (!canGenerar) return;
    setCargando(true);
    try {
      const res = await getReporte(indicadorSel, datos);
      if (res.status === 'success') {
        setGraficar(res.datos_grafica);
        descargarB64(res.archivo_b64, res.nombre_archivo);
        setExito({ abierto: true, restricciones: res.restricciones });
        if (res.restricciones && Object.keys(res.restricciones).length > 0) setMostrarToast(true);
      } else {
        alert(res.mensaje || 'Error al generar el reporte.');
      }
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargando(false); }
  }

  /* ── Generar todos ── */
  async function GenerarTodos() {
    if (!canBatch) return;
    setCargandoBatch(true);
    setResultadoBatch(null);
    try {
      const res = await generarCategoria(categoria, datos);
      if (res.status === 'success') {
        descargarB64(res.archivo_b64, res.nombre_archivo);
        setResultadoBatch({ completados: res.completados, errores: res.errores });
        if (res.restricciones && Object.keys(res.restricciones).length > 0) {
          setExito({ abierto: true, restricciones: res.restricciones });
          setMostrarToast(true);
        }
      } else {
        alert(res.mensaje || 'Error al generar la categoría.');
      }
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargandoBatch(false); }
  }

  return (
    <div className="ind-root">
      <div className="ind-bg" aria-hidden>
        <div className="ind-blob ind-blob-1" />
        <div className="ind-blob ind-blob-2" />
        <div className="ind-grid" />
      </div>

      <header className="ind-nav">
        <div className="ind-nav-left">
          <img src={logo_imss} alt="IMSS" className="ind-logo" />
          <div className="ind-nav-div" />
          <button className="ind-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            FTP
          </button>
        </div>
        <div className="ind-nav-right">
          {!esVisor && (
            <button className="ind-btn-pob" onClick={() => setModalPoblacion(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Actualizar Población
            </button>
          )}
          <div className="ind-user-chip">
            <span className="ind-user-dot" />
            {user?.user || 'Invitado'}
          </div>
        </div>
      </header>

      {modalPoblacion && <ModalPoblacion onClose={() => setModalPoblacion(false)} />}

      <main className="ind-hub-main">

        {/* ══ SIDEBAR ══ */}
        <aside className="ind-sidebar">

          {/* Categorías */}
          <p className="ind-sidebar-label">Categorías</p>
          <div className="ind-cat-list">
            {cargandoLista
              ? [1,2,3,4,5].map(i => <div key={i} className="ind-cat-shimmer" />)
              : Object.keys(allIndicadores).map(cat => (
                  <button
                    key={cat}
                    className={`ind-cat-btn ${categoria === cat ? 'ind-cat-btn--active' : ''}`}
                    style={categoria === cat ? { '--cc': COLORS[cat] ?? '#0b5445' } : {}}
                    onClick={() => setCategoria(cat)}
                  >
                    <span>{cat}</span>
                    <span className="ind-cat-count" style={categoria === cat ? { background: (COLORS[cat] ?? '#0b5445') + '22', color: COLORS[cat] ?? '#0b5445' } : {}}>
                      {allIndicadores[cat]?.indicadores?.length ?? 0}
                    </span>
                  </button>
                ))
            }
          </div>

          {/* Separador */}
          <div className="ind-sidebar-sep" />

          {/* Indicadores de la categoría */}
          <p className="ind-sidebar-label">
            <span style={{ color: catColor }}>{categoria}</span>
            <span style={{ color: '#94a3b8' }}> · {indicadores.length} indicadores</span>
          </p>
          <div className="ind-ind-list">
            {indicadores.map(ind => (
              <button
                key={ind}
                className={`ind-ind-btn ${indicadorSel === ind ? 'ind-ind-btn--active' : ''}`}
                style={indicadorSel === ind ? { '--cc': catColor } : {}}
                onClick={() => setIndicadorSel(ind === indicadorSel ? null : ind)}
              >
                <span className="ind-ind-name">{ind}</span>
                {indicadorSel === ind && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

        </aside>

        {/* ══ PANEL DE CONFIGURACIÓN ══ */}
        <section className="ind-config-panel">
          <div className="ind-config-inner">

            {/* ── Período — siempre visible ── */}
            <div className="ind-config-header">
              <p className="ind-config-eyebrow">
                {indicadorSel ? 'Período' : `Configuración · ${categoria}`}
              </p>
              {!indicadorSel && (
                <p className="ind-config-subtitle" style={{ marginTop: '2px' }}>
                  Estos parámetros aplican a todos los indicadores de la categoría
                </p>
              )}
            </div>

            {/* Tipo Previo/Final */}
            {!esVisor && (
              <div className="cfg-tabs" style={{ marginBottom: '16px' }}>
                <button
                  className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
                  onClick={() => { setTipo('previo'); setDatos(p => ({...p, semana: '1'})); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Previo
                </button>
                <button
                  className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
                  onClick={() => { setTipo('final'); setDatos(p => ({...p, semana: null})); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Final
                </button>
              </div>
            )}

            {/* Selectores — siempre visibles */}
            <div className="cfg-fields">
              <div className="cfg-field">
                <label className="cfg-label">Año</label>
                <div className="cfg-select-wrap">
                  <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  </svg>
                  <select className="cfg-select" value={datos.ano}
                    onChange={e => setDatos({...datos, ano: e.target.value, mes: ''})}>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <div className="cfg-field">
                <label className="cfg-label">Mes</label>
                <div className="cfg-select-wrap">
                  <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <select className="cfg-select" value={datos.mes}
                    onChange={e => setDatos({...datos, mes: e.target.value})}>
                    <option value="">Seleccionar mes…</option>
                    {mesesDisponibles.map(([val, name]) => (
                      <option key={val} value={val}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {tipo === 'previo' && !esVisor && (
                <div className="cfg-field cfg-field-full">
                  <label className="cfg-label">Semana Epidemiológica</label>
                  <div className="cfg-select-wrap">
                    <svg className="cfg-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <select className="cfg-select" value={datos.semana || ''}
                      onChange={e => setDatos({...datos, semana: e.target.value})}>
                      {[1,2,3,4,5].map(s => <option key={s} value={s.toString()}>Semana {s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="ind-config-sep" />

            {indicadorSel ? (
              /* ── Modo individual ── */
              <>
                <div>
                  <p className="ind-config-eyebrow">Indicador</p>
                  <h2 className="ind-config-title" style={{ color: catColor }}>{indicadorSel}</h2>
                  {infoIndicador?.titulo && (
                    <p className="ind-config-subtitle">{infoIndicador.titulo}</p>
                  )}
                </div>

                {mesesFaltantes.length > 0 && tipo === 'final' && (
                  <div className="cfg-warning">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <strong>Meses pendientes:</strong> {mesesFaltantes.join(', ')}
                      <p style={{ margin: '2px 0 0', fontSize: '0.76rem' }}>Genéralos primero para tener el historial completo.</p>
                    </div>
                  </div>
                )}

                {semData && datos.mes && (
                  <div className="cfg-sem-section" style={{ marginTop: '12px' }}>
                    <p className="cfg-sem-label">Rangos de desempeño — {NOMBRES_MESES[datos.mes]}</p>
                    <div className="cfg-sem-grid">
                      <div className="cfg-sem-block cfg-sem-verde">
                        <span className="cfg-sem-dot" /><div><small>Esperado</small><strong>{semData.txtVerde}</strong></div>
                      </div>
                      <div className="cfg-sem-block cfg-sem-amarillo">
                        <span className="cfg-sem-dot" /><div><small>Medio</small><strong>{semData.txtAmarillo}</strong></div>
                      </div>
                      <div className="cfg-sem-block cfg-sem-rojo">
                        <span className="cfg-sem-dot" /><div><small>Rojo</small><strong>{semData.txtRojo}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className={`cfg-btn-generate ${!canGenerar ? 'cfg-btn-generate--disabled' : ''}`}
                  style={canGenerar ? { '--gen-color': catColor } : {}}
                  disabled={!canGenerar}
                  onClick={GenerarReporte}
                >
                  <span className="cfg-btn-shimmer" />
                  <span className="cfg-btn-content">
                    {cargando
                      ? <><span className="cfg-spinner" /> Generando…</>
                      : <><IcoDownload /> Generar — {indicadorSel}</>
                    }
                  </span>
                </button>
              </>
            ) : (
              /* ── Modo batch (ningún indicador específico) ── */
              <div className="ind-batch-panel">
                <div className="ind-batch-panel-header">
                  <IcoAll />
                  <div>
                    <p className="ind-config-eyebrow">Generar todos</p>
                    <h2 className="ind-config-title" style={{ color: catColor }}>{categoria}</h2>
                    <p className="ind-config-subtitle">
                      {indicadores.length} indicador{indicadores.length !== 1 ? 'es' : ''} · se generará un Excel con una pestaña por indicador
                    </p>
                  </div>
                </div>

                <div className="ind-batch-ind-list">
                  {indicadores.map(ind => (
                    <div key={ind} className="ind-batch-ind-row">
                      <span className="ind-batch-ind-dot" style={{ background: catColor }} />
                      <span className="ind-batch-ind-name">{ind}</span>
                      {resultadoBatch?.completados.includes(ind) && (
                        <span className="ind-batch-ind-ok">✓</span>
                      )}
                      {resultadoBatch?.errores[ind] && (
                        <span className="ind-batch-ind-err">✗</span>
                      )}
                    </div>
                  ))}
                </div>

                {resultadoBatch && (
                  <div className="ind-batch-summary">
                    <span className="ind-batch-ok">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {resultadoBatch.completados.length} generados correctamente
                    </span>
                    {Object.keys(resultadoBatch.errores).length > 0 && (
                      <span className="ind-batch-err">⚠ {Object.keys(resultadoBatch.errores).length} con errores</span>
                    )}
                  </div>
                )}

                <button
                  className={`cfg-btn-generate ${!canBatch ? 'cfg-btn-generate--disabled' : ''}`}
                  style={canBatch ? { '--gen-color': catColor } : {}}
                  disabled={!canBatch}
                  onClick={GenerarTodos}
                >
                  <span className="cfg-btn-shimmer" />
                  <span className="cfg-btn-content">
                    {cargandoBatch
                      ? <><span className="cfg-spinner" /> Generando {indicadores.length} indicadores…</>
                      : <><IcoAll /> Generar todos · {categoria} ({indicadores.length})</>
                    }
                  </span>
                </button>

                <p className="ind-batch-tip">
                  O selecciona un indicador específico del panel izquierdo para generarlo individualmente.
                </p>
              </div>
            )}

          </div>
        </section>

      </main>

      <ModalLoading isOpen={cargando || cargandoBatch} />
      <ModalExito
        isOpen={exito.abierto}
        indicador={indicadorSel}
        onConfirm={() => setExito({ ...exito, abierto: false })}
        onClose={() => setExito({ ...exito, abierto: false })}
        PageGraficar={() => {
          navigate('/CIAE/graficas', {
            state: {
              Indicador: indicadorSel,
              semaforo:  semData,
              fecha:     `${NOMBRES_MESES[datos.mes] || ''} ${datos.ano}`,
              datosMapa: graficar,
            }
          });
        }}
      />
      <ToastWarning
        visible={mostrarToast}
        onClick={() => navigate('/CIAE/restricciones', { state: { restricciones: exito.restricciones, indicador: indicadorSel } })}
        onClose={() => setMostrarToast(false)}
      />
    </div>
  );
};

export default IndicadoresPage;
