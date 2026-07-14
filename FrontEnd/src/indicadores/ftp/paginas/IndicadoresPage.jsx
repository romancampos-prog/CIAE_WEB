import './ftp.css';
import './indicadores.css';
import './config.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexto/AuthContext';
import { useRol } from '../../../auth/hooks/useRol';
import logo_imss from '../../../assets/logo_imms.png';
import ModalPoblacion from '../componentes/modalPoblacion/ModalPoblacion';
import ModalLoading from '../../../shared/componentes/modal/ModalCargando';
import ModalRestricciones from '../../shared/componentes/modal/ModalRestricciones';
import { useIndicadores } from '../hooks/useIndicadores';
import InformacionIndicador from '../../reportes_grafica/componentes/InformacionIndicador/InformacionIndicador';
import { useEffect, useState } from 'react';
import SidebarCategorias from '../componentes/SidebarCategorias';
import PeriodoReporte from '../componentes/PeriodoReporte';

import iconoCama  from '../../../assets/icono_cama.png';
import iconoCacu  from '../../../assets/icono_cacu.png';
import iconoEh    from '../../../assets/icono_eh.png';
import iconoDm    from '../../../assets/icono_dm.png';
import iconoMt    from '../../../assets/icono_mt.png';
import iconoCupn  from '../../../assets/icono_cupn.png';
import iconoSOb   from '../../../assets/icono_S_Ob.png';
import iconoCe    from '../../../assets/icono_ce (2).png';

const CAT_ICON = {
  CAMA: iconoCama, CACU: iconoCacu, EH: iconoEh,  DM: iconoDm,
  MT:   iconoMt,  CUPN: iconoCupn, S_Ob: iconoSOb, CE: iconoCe,
};

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

  const catIcon = CAT_ICON[categoria];

  const [abiertas, setAbiertas] = useState(() => new Set([categoria]))

  const toggleAbrir = (cat) => {
    setAbiertas(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
        if (cat !== categoria) {
          setCategoria(cat)
          setIndicadorSel(null)
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
          <button className="ind-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP')}>
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

        <SidebarCategorias
          allIndicadores={allIndicadores}
          cargandoLista={cargandoLista}
          categoria={categoria}
          indicadorSel={indicadorSel}
          abiertas={abiertas}
          onToggle={toggleAbrir}
          onSelectIndicador={(cat, ind) => {
            setCategoria(cat)
            setIndicadorSel(ind === indicadorSel ? null : ind)
          }}
        />

        <section className="ind-config-panel">
          <div className="ind-config-layout">
          <div className="ind-config-inner">

            {indicadorSel ? (
              <>
                {/* ── 1. INDICADOR ── */}
                <div className="ind-sel-card" style={{ '--fc': catColor }}>
                  {catIcon && <img src={catIcon} alt="" className="ind-sel-card-icon" />}
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
                <PeriodoReporte
                  tipo={tipo}
                  datos={datos}
                  mesesDisponibles={mesesDisponibles}
                  catColor={catColor}
                  esVisor={esVisor}
                  onTipoChange={setTipo}
                  onDatosChange={setDatos}
                />

                {/* ── 3. ALERTAS ── */}
                {mesesFaltantes.length > 0 && tipo === 'final' && (
                  <div
                    className="cfg-warning"
                    style={confirmandoFaltantes ? {
                      background: 'rgba(234,88,12,0.1)',
                      borderColor: '#ea580c',
                      boxShadow: '0 0 0 3px rgba(234,88,12,0.15)',
                    } : undefined}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={confirmandoFaltantes ? '#ea580c' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <strong style={confirmandoFaltantes ? { color: '#ea580c' } : {}}>
                        {confirmandoFaltantes ? '¿Generar sin estos meses?' : 'Meses pendientes:'}
                      </strong>{' '}
                      {mesesFaltantes.join(', ')}
                      <p>
                        {confirmandoFaltantes
                          ? 'El historial quedará incompleto. Haz clic de nuevo para confirmar.'
                          : 'Généralos primero para tener el historial completo.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── 4. SEMÁFORO ── */}
                {semData && datos.mes && (
                  <div className="cfg-sem-section ind-sem-block">
                    <p className="cfg-sem-label">Rangos de desempeño – {MESES_LARGOS[datos.mes]}</p>
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
                    style={{ '--gen-color': confirmandoFaltantes ? '#ea580c' : catColor }}
                    disabled={!canGenerar}
                    onClick={generarReporte}
                  >
                    <span className="cfg-btn-shimmer" />
                    <span className="cfg-btn-content">
                      {cargando
                        ? <><span className="cfg-spinner" /> Generando…</>
                        : confirmandoFaltantes
                          ? <><IcoDownload /> Generar de todas formas</>
                          : <><IcoDownload /> Generar – {indicadorSel}</>
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
                  {catIcon && <img src={catIcon} alt="" className="ind-sel-card-icon" />}
                  <p className="ind-sel-eyebrow">Categoría · generar todos</p>
                  <h2 className="ind-sel-name" style={{ color: catColor }}>{categoria}</h2>
                  <p className="ind-sel-desc">
                    {indicadores.length} indicador{indicadores.length !== 1 ? 'es' : ''} · se generará un Excel con una pestaña por indicador
                  </p>
                </div>

                {/* 2. Período del batch */}
                <PeriodoReporte
                  tipo={tipo}
                  datos={datos}
                  mesesDisponibles={mesesDisponibles}
                  catColor={catColor}
                  esVisor={esVisor}
                  style={{ marginBottom: 12 }}
                  onTipoChange={setTipo}
                  onDatosChange={setDatos}
                />

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
                      style={{ '--gen-color': catColor }}
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

          </div>{/* ind-config-inner */}

          {catIcon && (
            <div className="ind-icon-side" style={{ '--ic': catColor }}>
              <div className="ind-icon-side-inner">
                <img src={catIcon} alt="" className="ind-icon-side-img" />
              </div>
            </div>
          )}
          </div>{/* ind-config-layout */}
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
