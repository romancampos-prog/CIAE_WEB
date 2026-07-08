import './ftp.css';
import './indicadores.css';
import './config.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useRol } from '../../auth/hooks/useRol';
import logo_imss from '../../assets/logo_imms.png';
import ModalPoblacion from '../components/modalPoblacion/ModalPoblacion';
import ModalLoading from '../../shared/components/modal/ModalCargando';
import ModalRestricciones from '../../shared/components/modal/ModalRestricciones';
import { useIndicadores } from '../hooks/useIndicadores';
import InformacionIndicador from '../../reportes/components/InformacionIndicador/InformacionIndicador';
import { useEffect, useState } from 'react';

const IcoDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

const IndicadoresPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { puedeGenFTP } = useRol();
  const {
    allIndicadores, cargandoLista, categoria, setCategoria,
    indicadorSel, setIndicadorSel,
    tipo, setTipo, datos, setDatos,
    infoIndicador, mesesFaltantes, confirmandoFaltantes,
    cargando, cargandoBatch,
    restriccionesData, mostrarRestricciones, setMostrarRestricciones,
    resultadoBatch, modalPoblacion, setModalPoblacion,
    mesesDisponibles, semData, indicadores, catColor,
    canGenerar, canBatch, esVisor,
    generarReporte, generarTodos, MESES_LARGOS,
  } = useIndicadores(user);

  const [abiertas, setAbiertas] = useState(() => new Set([categoria]))
  const toggleAbrir = (cat) => {
    setAbiertas(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)                       // cerrar: sin cambio de estado
      } else {
        next.add(cat)
        if (cat !== categoria) {
          setCategoria(cat)                    // cambiar categoría solo si es diferente
          setIndicadorSel(null)               // limpiar indicador al cambiar categoría
        }
      }
      return next
    })
  }

  const [fichaAbierta, setFichaAbierta] = useState(false)
  useEffect(() => { setFichaAbierta(false) }, [indicadorSel])
  useEffect(() => { document.title = 'Indicadores FTP | CIAE'; }, []);

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
          <button className="ind-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/Generar')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Generar
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
          <p className="ind-sidebar-label">Categorías</p>
          <div className="ind-cat-list">
            {cargandoLista
              ? [1,2,3,4,5].map(i => <div key={i} className="ind-cat-shimmer" />)
              : Object.keys(allIndicadores).map(cat => {
                  const abierto  = abiertas.has(cat)
                  const esActiva = categoria === cat
                  const cc       = allIndicadores[cat]?.color ?? catColor
                  const catInds  = allIndicadores[cat]?.indicadores ?? []
                  return (
                    <div key={cat} className="ind-cat-group">
                      <button
                        className={`ind-cat-btn ${esActiva ? 'ind-cat-btn--active' : ''} ${abierto ? 'ind-cat-btn--open' : ''}`}
                        style={esActiva ? { '--cc': cc } : {}}
                        onClick={() => toggleAbrir(cat)}
                      >
                        <span>{cat}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="ind-cat-count">{catInds.length}</span>
                          <svg
                            width="10" height="10" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            className={`ind-cat-chevron ${abierto ? 'ind-cat-chevron--open' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {abierto && (
                        <div className="ind-ind-list ind-ind-list--accordion" style={{ '--acc-color': cc }}>
                          {catInds.map(ind => (
                            <button
                              key={ind}
                              className={`ind-ind-btn ${indicadorSel === ind ? 'ind-ind-btn--active' : ''}`}
                              style={indicadorSel === ind ? { '--cc': cc } : {}}
                              onClick={() => { setCategoria(cat); setIndicadorSel(ind === indicadorSel ? null : ind) }}
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
                      )}
                    </div>
                  )
                })
            }
          </div>
        </aside>

        {/* ══ PANEL DERECHO ══ */}
        <section className="ind-config-panel">
          <div className="ind-config-inner">

            {indicadorSel ? (
              <>
                {/* ── 1. INDICADOR ── */}
                <div className="ind-sel-card" style={{ '--fc': catColor }}>
                  <p className="ind-sel-eyebrow">Indicador</p>
                  <h2 className="ind-sel-name" style={{ color: catColor }}>{indicadorSel}</h2>
                  {infoIndicador?.titulo && (
                    <p className="ind-sel-desc">{infoIndicador.titulo}</p>
                  )}
                  {infoIndicador && (
                    <button
                      className="ind-btn-ficha"
                      style={{ '--fc': catColor }}
                      onClick={() => setFichaAbierta(true)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      Ver ficha técnica
                    </button>
                  )}
                </div>

                {/* ── 2. PERÍODO ── */}
                <div className="ind-period-block">
                  <p className="ind-period-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Período del reporte
                  </p>

                  {!esVisor && (
                    <div className="cfg-tabs" style={{ padding: 0 }}>
                      <button
                        className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
                        style={tipo === 'previo' ? { background: catColor, borderColor: catColor } : {}}
                        onClick={() => { setTipo('previo'); setDatos(p => ({...p, semana: '1'})); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Previo
                      </button>
                      <button
                        className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
                        style={tipo === 'final' ? { background: catColor, borderColor: catColor } : {}}
                        onClick={() => { setTipo('final'); setDatos(p => ({...p, semana: null})); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Definitivo
                      </button>
                    </div>
                  )}

                  <div className="cfg-fields" style={{ padding: 0 }}>
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
                </div>

                {/* ── 3. ALERTAS ── */}
                {mesesFaltantes.length > 0 && tipo === 'final' && (
                  <div className="cfg-warning" style={{
                    margin: '0 0 12px',
                    ...(confirmandoFaltantes ? {
                      background: 'rgba(234,88,12,0.1)',
                      borderColor: '#ea580c',
                      boxShadow: '0 0 0 3px rgba(234,88,12,0.15)',
                    } : {})
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={confirmandoFaltantes ? '#ea580c' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <strong style={confirmandoFaltantes ? { color: '#ea580c' } : {}}>
                        {confirmandoFaltantes ? '¿Generar sin estos meses?' : 'Meses pendientes:'}
                      </strong>{' '}
                      {mesesFaltantes.join(', ')}
                      <p style={{ margin: '2px 0 0', fontSize: '0.76rem' }}>
                        {confirmandoFaltantes
                          ? 'El historial quedará incompleto. Haz clic de nuevo para confirmar.'
                          : 'Genéralos primero para tener el historial completo.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── 4. SEMÁFORO ── */}
                {semData && datos.mes && (
                  <div className="cfg-sem-section ind-sem-block">
                    <p className="cfg-sem-label">Rangos de desempeño — {MESES_LARGOS[datos.mes]}</p>
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

                {/* ── 5. GENERAR ── */}
                {puedeGenFTP && (
                  <button
                    className={`cfg-btn-generate ind-gen-btn ${!canGenerar ? 'cfg-btn-generate--disabled' : ''}`}
                    style={canGenerar ? { '--gen-color': confirmandoFaltantes ? '#ea580c' : catColor } : {}}
                    disabled={!canGenerar}
                    onClick={generarReporte}
                  >
                    <span className="cfg-btn-shimmer" />
                    <span className="cfg-btn-content">
                      {cargando
                        ? <><span className="cfg-spinner" /> Generando…</>
                        : confirmandoFaltantes
                          ? <><IcoDownload /> Generar de todas formas</>
                          : <><IcoDownload /> Generar — {indicadorSel}</>
                      }
                    </span>
                  </button>
                )}
              </>

            ) : (
              <>
                {/* ── BATCH ── */}

                {/* 1. Card categoría */}
                <div className="ind-sel-card" style={{ '--fc': catColor }}>
                  <p className="ind-sel-eyebrow">Categoría · generar todos</p>
                  <h2 className="ind-sel-name" style={{ color: catColor }}>{categoria}</h2>
                  <p className="ind-sel-desc">
                    {indicadores.length} indicador{indicadores.length !== 1 ? 'es' : ''} · se generará un Excel con una pestaña por indicador
                  </p>
                </div>

                {/* 2. Período del batch */}
                <div className="ind-period-block" style={{ marginBottom: 20 }}>
                  <p className="ind-period-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Período del reporte
                  </p>
                  {!esVisor && (
                    <div className="cfg-tabs" style={{ padding: 0 }}>
                      <button
                        className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
                        style={tipo === 'previo' ? { background: catColor, borderColor: catColor } : {}}
                        onClick={() => { setTipo('previo'); setDatos(p => ({...p, semana: '1'})); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Previo
                      </button>
                      <button
                        className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
                        style={tipo === 'final' ? { background: catColor, borderColor: catColor } : {}}
                        onClick={() => { setTipo('final'); setDatos(p => ({...p, semana: null})); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Final
                      </button>
                    </div>
                  )}
                  <div className="cfg-fields" style={{ padding: 0 }}>
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
                </div>

                {/* 3. Batch panel */}
                <div className="ind-batch-panel">
                  <div className="ind-batch-ind-list">
                    {indicadores.map(ind => (
                      <div key={ind} className="ind-batch-ind-row">
                        <span className="ind-batch-ind-dot" style={{ background: catColor }} />
                        <span className="ind-batch-ind-name">{ind}</span>
                        {resultadoBatch?.completados.includes(ind) && <span className="ind-batch-ind-ok">✓</span>}
                        {resultadoBatch?.errores[ind] && <span className="ind-batch-ind-err">✗</span>}
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
                      {Object.keys(resultadoBatch.errores).length > 0 && restriccionesData && (
                        <button
                          className="ind-batch-err ind-batch-err--btn"
                          onClick={() => setMostrarRestricciones(true)}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          {Object.keys(resultadoBatch.errores).length} con errores · ver detalle
                        </button>
                      )}
                    </div>
                  )}

                  {puedeGenFTP && (
                    <button
                      className={`cfg-btn-generate ind-gen-btn ${!canBatch ? 'cfg-btn-generate--disabled' : ''}`}
                      style={canBatch ? { '--gen-color': catColor } : {}}
                      disabled={!canBatch}
                      onClick={generarTodos}
                    >
                      <span className="cfg-btn-shimmer" />
                      <span className="cfg-btn-content">
                        {cargandoBatch
                          ? <><span className="cfg-spinner" /> Generando {indicadores.length} indicadores…</>
                          : <><IcoAll /> Generar todos · {categoria} ({indicadores.length})</>
                        }
                      </span>
                    </button>
                  )}

                  <p className="ind-batch-tip">
                    O selecciona un indicador específico del panel izquierdo.
                  </p>
                </div>
              </>
            )}

          </div>
        </section>

      </main>

      {/* ══ DRAWER FICHA TÉCNICA ══ */}
      {fichaAbierta && infoIndicador && (
        <>
          <div className="ind-ficha-backdrop" onClick={() => setFichaAbierta(false)} />
          <div className="ind-ficha-drawer">
            <div className="ind-ficha-header" style={{ '--fc': catColor }}>
              <div>
                <p className="ind-ficha-eyebrow">Ficha técnica del indicador</p>
                <h3 className="ind-ficha-title" style={{ color: catColor }}>{indicadorSel}</h3>
              </div>
              <button className="ind-ficha-close" onClick={() => setFichaAbierta(false)}>✕</button>
            </div>
            <div className="ind-ficha-body">
              <InformacionIndicador data={infoIndicador} />
            </div>
          </div>
        </>
      )}

      <ModalLoading isOpen={cargando || cargandoBatch} />
      <ModalRestricciones
        isOpen={mostrarRestricciones}
        restricciones={restriccionesData}
        onClose={() => setMostrarRestricciones(false)}
      />
    </div>
  );
};

export default IndicadoresPage;
