import './config.css';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getIndicador } from '../../ftp/api/indicadores';
import { getReporte, getMesesGenerados } from '../api/reportes';
import ModalLoading from '../../../shared/componentes/modal/ModalCargando';
import ModalExito from '../componentes/modal/ModalExito';
import ToastWarning from '../componentes/avisos/ToastWarning';
import logo_imss from '../../../assets/logo_imms.png';
import InformacionIndicador from '../componentes/InformacionIndicador/InformacionIndicador';
import { useAuth } from '../../../auth/contexto/AuthContext';

const ConfiguracionReporte = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();
  const esVisor    = user?.rol === 'visor';
  const indicadorSel = location.state?.indicador;

  /* ── Lógica de fechas ── */
  const fechaHoy     = new Date();
  const anioActual   = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1;
  const diaActual    = fechaHoy.getDate();
  const mesMaxVisor  = diaActual >= 30 ? mesActualNum : mesActualNum - 1;

  const [tipo,           setTipo]           = useState(esVisor ? 'final' : 'previo');
  const [datos,          setDatos]          = useState({ ano: anioActual.toString(), mes: '', semana: esVisor ? null : '1' });
  const [infoIndicador,  setInfoIndicador]  = useState(null);
  const [cargando,       setCargando]       = useState(false);
  const [exito,          setExito]          = useState({ abierto: false, ruta: '', restricciones: null });
  const [mostrarToast,   setMostrarToast]   = useState(false);
  const [graficar,       setGraficar]       = useState(null);
  const [verDetalle,     setVerDetalle]     = useState(false);
  const [mesesFaltantes, setMesesFaltantes] = useState([]);

  const nombreMeses = {
    "01":"Enero","02":"Febrero","03":"Marzo","04":"Abril",
    "05":"Mayo","06":"Junio","07":"Julio","08":"Agosto",
    "09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre"
  };

  /* Retorno desde gráficas */
  useEffect(() => {
    if (location.state?.retornoSeguro) {
      const { restricciones, datosPrevios, tipoPrevio, datosGrafica } = location.state.retornoSeguro;
      setDatos(datosPrevios); setTipo(tipoPrevio); setGraficar(datosGrafica);
      setExito({ abierto: true, ruta: 'Descarga Automática', restricciones });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /* Meses disponibles */
  const mesesDisponibles = useMemo(() => {
    const todos = Object.entries(nombreMeses);
    if (parseInt(datos.ano) === anioActual) {
      const limite = esVisor ? mesMaxVisor : mesActualNum;
      return todos.filter(([key]) => parseInt(key) <= limite);
    }
    return todos;
  }, [datos.ano, anioActual, mesActualNum, esVisor, mesMaxVisor]);

  /* Carga metadatos */
  useEffect(() => {
    document.title = `${indicadorSel || 'Configuración'} | CIAE`;
    if (indicadorSel) {
      getIndicador(indicadorSel).then(res => setInfoIndicador(res.data)).catch(console.error);
    }
  }, [indicadorSel]);

  /* Meses faltantes */
  useEffect(() => {
    if (!datos.mes || !indicadorSel || tipo !== 'final') { setMesesFaltantes([]); return; }
    getMesesGenerados(indicadorSel, datos.ano).then(generados => {
      const mesNum = parseInt(datos.mes);
      const faltantes = [];
      for (let i = 1; i < mesNum; i++) {
        const key = String(i).padStart(2, '0');
        if (!generados.includes(key)) faltantes.push(nombreMeses[key]);
      }
      setMesesFaltantes(faltantes);
    });
  }, [datos.mes, datos.ano, indicadorSel, tipo]);

  /* Semáforo */
  const semData = useMemo(() => {
    if (!infoIndicador?.semaforo) return null;
    const mesTexto = nombreMeses[datos.mes];
    let sem = (mesTexto && infoIndicador.semaforo[mesTexto])
      ? infoIndicador.semaforo[mesTexto] : infoIndicador.semaforo;
    if (!sem || (sem.Bajo === undefined && sem.Esperado === undefined)) return null;
    const esDesc = sem.Alto !== undefined;
    return {
      ...sem,
      labelVerde:   'Esperado',
      labelAmarillo:'Medio',
      labelRojo:    esDesc ? 'Alto' : 'Bajo',
      txtVerde:     esDesc ? `≤ ${sem.Esperado}%` : `≥ ${sem.Esperado}%`,
      txtAmarillo:  esDesc ? `> ${sem.Esperado}% — < ${sem.Alto}%` : `> ${sem.Bajo}% — < ${sem.Esperado}%`,
      txtRojo:      esDesc ? `≥ ${sem.Alto}%` : `≤ ${sem.Bajo}%`,
    };
  }, [infoIndicador, datos.mes]);

  /* Generar reporte */
  async function GenerarReporte() {
    setCargando(true); setMostrarToast(false);
    try {
      const res = await getReporte(indicadorSel, datos);
      if (res.status === 'success') {
        setGraficar(res.datos_grafica);
        const bytes = atob(res.archivo_b64);
        const arr   = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob  = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url   = window.URL.createObjectURL(blob);
        const link  = document.createElement('a');
        link.href = url; link.setAttribute('download', res.nombre_archivo);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        setExito({ abierto: true, ruta: 'Descarga Automática', restricciones: res.restricciones });
        if (res.restricciones && Object.keys(res.restricciones).length > 0) setMostrarToast(true);
      }
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargando(false); }
  }

  const canGenerar = !!datos.mes && !cargando;

  return (
    <div className="cfg-root">

      {/* Fondo */}
      <div className="cfg-bg" aria-hidden="true">
        <div className="cfg-blob cfg-blob-1" />
        <div className="cfg-blob cfg-blob-2" />
        <div className="cfg-grid-bg" />
      </div>

      {/* Nav */}
      <header className="cfg-nav">
        <div className="cfg-nav-left">
          <img src={logo_imss} alt="IMSS" className="cfg-logo" />
          <div className="cfg-nav-sep" />
          <button className="cfg-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP/Generar')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Indicadores
          </button>
        </div>
        <div className="cfg-nav-right">
          {indicadorSel && <span className="cfg-ind-badge">{indicadorSel}</span>}
          <div className="cfg-user-chip">
            <span className="cfg-user-dot" />
            {user?.user || 'Invitado'}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="cfg-main">

        {/* Hero */}
        <div className="cfg-hero">
          <p className="cfg-hero-eyebrow">Generar reporte</p>
          <h1 className="cfg-hero-title">{indicadorSel || '—'}</h1>
        </div>

        {/* Grid de dos columnas */}
        <div className="cfg-layout">

          {/* ══ PANEL FORMULARIO ══ */}
          <section className="cfg-card cfg-card-form">

            <div className="cfg-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h2 className="cfg-card-title">Período</h2>
            </div>

            {/* Tabs tipo reporte */}
            {!esVisor && (
              <div className="cfg-tabs">
                <button
                  className={`cfg-tab ${tipo === 'previo' ? 'cfg-tab--active' : ''}`}
                  onClick={() => { setTipo('previo'); setDatos(p => ({...p, semana: '1'})); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Previo
                </button>
                <button
                  className={`cfg-tab ${tipo === 'final' ? 'cfg-tab--active' : ''}`}
                  onClick={() => { setTipo('final'); setDatos(p => ({...p, semana: null})); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Final
                </button>
              </div>
            )}

            {/* Selectores */}
            <div className="cfg-fields">
              <div className="cfg-field">
                <label className="cfg-label">Año</label>
                <div className="cfg-select-wrap">
                  <svg className="cfg-select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  </svg>
                  <select
                    className="cfg-select"
                    value={datos.ano}
                    onChange={e => setDatos({...datos, ano: e.target.value, mes: ''})}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <div className="cfg-field">
                <label className="cfg-label">Mes</label>
                <div className="cfg-select-wrap">
                  <svg className="cfg-select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <select
                    className="cfg-select"
                    value={datos.mes}
                    onChange={e => setDatos({...datos, mes: e.target.value})}
                  >
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
                    <svg className="cfg-select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <select
                      className="cfg-select"
                      value={datos.semana || ''}
                      onChange={e => setDatos({...datos, semana: e.target.value})}
                    >
                      {[1,2,3,4,5].map(s => (
                        <option key={s} value={s.toString()}>Semana {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Advertencia meses faltantes */}
            {mesesFaltantes.length > 0 && tipo === 'final' && (
              <div className="cfg-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Meses pendientes:</strong> {mesesFaltantes.join(', ')}
                  <p>Genéralos primero para tener el historial completo.</p>
                </div>
              </div>
            )}

            {/* Botón generar */}
            <button
              className={`cfg-btn-generate ${!canGenerar ? 'cfg-btn-generate--disabled' : ''}`}
              disabled={!canGenerar}
              onClick={GenerarReporte}
            >
              <span className="cfg-btn-shimmer" />
              <span className="cfg-btn-content">
                {cargando ? (
                  <><span className="cfg-spinner" /> Generando…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Generar Reporte Excel
                  </>
                )}
              </span>
            </button>

          </section>

          {/* ══ PANEL INFO + SEMÁFORO ══ */}
          <section className="cfg-card cfg-card-info">

            <div className="cfg-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
              </svg>
              <h2 className="cfg-card-title">Información del indicador</h2>
            </div>

            {infoIndicador ? (
              <div className="cfg-info-body">
                <p className="cfg-ind-titulo">{infoIndicador.titulo}</p>
                <span className="cfg-fecha-mod">Última revisión: {infoIndicador.fechaModificacion}</span>

                <div className="cfg-sem-section">
                  <p className="cfg-sem-label">
                    {datos.mes
                      ? `Rangos de desempeño — ${nombreMeses[datos.mes]}`
                      : 'Selecciona un mes para ver rangos'}
                  </p>

                  {semData ? (
                    <div className="cfg-sem-grid">
                      <div className="cfg-sem-block cfg-sem-verde">
                        <span className="cfg-sem-dot" />
                        <div>
                          <small>{semData.labelVerde}</small>
                          <strong>{semData.txtVerde}</strong>
                        </div>
                      </div>
                      <div className="cfg-sem-block cfg-sem-amarillo">
                        <span className="cfg-sem-dot" />
                        <div>
                          <small>{semData.labelAmarillo}</small>
                          <strong>{semData.txtAmarillo}</strong>
                        </div>
                      </div>
                      <div className="cfg-sem-block cfg-sem-rojo">
                        <span className="cfg-sem-dot" />
                        <div>
                          <small>{semData.labelRojo}</small>
                          <strong>{semData.txtRojo}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="cfg-sem-placeholder">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>Selecciona un mes para ver los rangos de desempeño</span>
                    </div>
                  )}
                </div>

                {/* Ficha técnica inline */}
                <button className="cfg-ficha-btn" onClick={() => setVerDetalle(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Ver ficha técnica completa
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="cfg-loading">
                <div className="cfg-shimmer cfg-shimmer-title" />
                <div className="cfg-shimmer cfg-shimmer-sub" />
                <div className="cfg-shimmer cfg-shimmer-block" />
              </div>
            )}

          </section>

        </div>
      </main>

      {/* Modales */}
      <ModalLoading isOpen={cargando} />
      <ModalExito
        isOpen={exito.abierto}
        indicador={indicadorSel}
        onConfirm={() => setExito({...exito, abierto: false})}
        onClose={() => { setExito({...exito, abierto: false}); navigate('/CIAE/IndicadoresMedicos'); }}
        PageGraficar={() => {
          navigate('/CIAE/IndicadoresMedicos/Grafica/GraficaReporte', {
            state: {
              Indicador: indicadorSel,
              semaforo:  semData,
              fecha:     `${nombreMeses[datos.mes] || ''} ${datos.ano}`,
              datosMapa: graficar,
              retornoSeguro: { abierto: true, restricciones: exito.restricciones, datosPrevios: datos, tipoPrevio: tipo, datosGrafica: graficar }
            }
          });
        }}
      />
      <ToastWarning
        visible={mostrarToast}
        onClick={() => navigate('/CIAE/IndicadoresMedicos/Grafica/Restricciones', { state: { restricciones: exito.restricciones, indicador: indicadorSel } })}
        onClose={() => setMostrarToast(false)}
      />

      {/* Side Panel Ficha Técnica */}
      {verDetalle && (
        <div className="cfg-panel-overlay" onClick={() => setVerDetalle(false)}>
          <div className="cfg-panel-content" onClick={e => e.stopPropagation()}>
            <header className="cfg-panel-header">
              <h2>Ficha Técnica — {indicadorSel}</h2>
              <button className="cfg-close-panel" onClick={() => setVerDetalle(false)}>✕</button>
            </header>
            <div className="cfg-panel-scroll">
              <InformacionIndicador data={infoIndicador} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ConfiguracionReporte;
