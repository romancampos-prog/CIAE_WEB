import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo_imss from '../../assets/logo_imms.png';
import { getUnidadesInAss, getIndicadoresInAss, generarIN_Ass } from '../../api/In_Ass';
import { UploadIcon, CheckIcon, XIcon, FileIcon } from '../../componentes/Icons';
import ModalLoading from '../modal/modalCargando';
import INASSErrorToast from './INASSErrorToast';
import './inass.css';

const INASSPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [unidades, setUnidades]       = useState([]);
  const [indicadores, setIndicadores] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [generando, setGenerando]     = useState(false);

  const hoy        = new Date();
  const anioActual = hoy.getFullYear();
  const diaHoy     = hoy.getDate();
  const mesHoy     = hoy.getMonth() + 1; // 1-12

  // Un mes está disponible solo si ya pasó el día 25 de ese mes
  // mesHoy-1 porque si hoy es 24 de febrero, enero ya está disponible pero febrero no
  const mesMaxActual = diaHoy >= 25 ? mesHoy : mesHoy - 1;
  // Si es enero antes del 25 (mesMaxActual = 0), el año actual no tiene meses disponibles
  const anioDefault  = mesMaxActual < 1 ? anioActual - 1 : anioActual;
  const mesDefault   = mesMaxActual < 1 ? 12 : mesMaxActual;

  const [anio, setAnio] = useState(String(anioDefault));
  const [mes,  setMes]  = useState(String(mesDefault).padStart(2, '0'));

  const mesDisponible = (mesNum, anioSel) => {
    if (parseInt(anioSel) < anioActual) return true; // año anterior: todos los meses
    if (mesNum < mesHoy) return true;                // meses pasados del año actual
    if (mesNum === mesHoy && diaHoy >= 25) return true; // mes actual solo desde el 25
    return false;
  };

  const [numeradores, setNumeradores]       = useState(null);
  const [dragOver, setDragOver]             = useState(false);
  const [dragOverUnidad, setDragOverUnidad] = useState(null);
  const [archivosUnidad, setArchivosUnidad] = useState({});
  const [denominadores, setDenominadores]   = useState({});
  const [advertencias, setAdvertencias]     = useState(null);
  const [errorMensaje, setErrorMensaje]     = useState('');
  const [errorTrigger, setErrorTrigger]     = useState(0);

  useEffect(() => {
    document.title = 'IASS — Nuevo reporte | CIAE';
    Promise.all([getUnidadesInAss(), getIndicadoresInAss()]).then(([unids, inds]) => {
      const denoms = inds.filter(i => i.id !== 'IN_ASS 01');
      setIndicadores(denoms);
      setUnidades(unids);
      const d = {};
      unids.forEach(u => {
        d[u] = {};
        denoms.forEach(ind => { d[u][ind.id] = ''; });
      });
      setDenominadores(d);
      setCargando(false);
    });
  }, []);

  useEffect(() => { setAdvertencias(null); }, [numeradores, archivosUnidad, denominadores]);

  const setGlobal     = (file) => { if (file?.name.endsWith('.xlsx')) setNumeradores(file); };
  const setUnidadFile = (u, file) => { if (file?.name.endsWith('.xlsx')) setArchivosUnidad(p => ({ ...p, [u]: file })); };
  const setDenom      = (u, id, v) => setDenominadores(p => ({ ...p, [u]: { ...p[u], [id]: v } }));
  const rowOk         = (u) => !!archivosUnidad[u] && indicadores.every(d => (denominadores[u]?.[d.id] ?? '') !== '');
  const completos     = unidades.filter(rowOk).length;

  const calcularFaltantes = () => {
    const lista = [];
    if (!numeradores) lista.push('Falta el Excel global de IASS 01');
    const sinExcel = unidades.filter(u => !archivosUnidad[u]);
    if (sinExcel.length) lista.push(`${sinExcel.length} unidad(es) sin Excel: ${sinExcel.join(', ')}`);
    const sinDenom = unidades.filter(u => archivosUnidad[u] && indicadores.some(d => !(denominadores[u]?.[d.id])));
    if (sinDenom.length) lista.push(`Denominadores incompletos en: ${sinDenom.join(', ')}`);
    return lista;
  };

  const handleGenerar = () => {
    const faltantes = calcularFaltantes();
    if (faltantes.length > 0 && advertencias === null) { setAdvertencias(faltantes); return; }
    setAdvertencias(null);
    setGenerando(true);
    generarIN_Ass(anio, mes, archivosUnidad, denominadores, numeradores)
      .then(res => {
        if (res.status === 'success' && res.archivo_b64) {
          const bytes = atob(res.archivo_b64);
          const arr   = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const blob  = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url   = window.URL.createObjectURL(blob);
          const link  = document.createElement('a');
          link.href   = url;
          link.setAttribute('download', res.nombre_archivo);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setGenerando(false);
      })
      .catch(err => {
        setGenerando(false);
        const detalle = err?.response?.data?.detail ?? 'Error al generar el reporte';
        const status  = err?.response?.status;
        if (status === 400) {
          // Error de validación (ej. Excel de unidad incorrecta) → toast flotante
          setErrorMensaje(detalle);
          setErrorTrigger(t => t + 1);
        } else {
          // Otro error → cuadro de advertencia existente
          setAdvertencias([detalle]);
        }
      });
  };

  return (
    <>
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
            <button className="ia-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/INASS')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              IASS
            </button>
          </div>
          <div className="ia-user-pill">
            <span className="ia-user-led" />
            {user?.user || 'Invitado'}
          </div>
        </header>

        <main className="ia-main">
          <div className="ia-hero">
            <div className="ia-hero-eyebrow">
              <span className="ia-hero-dot" />
              Infecciones Asociadas a Servicios de Salud
            </div>
            <h1 className="ia-hero-title">Nuevo reporte</h1>
            <p className="ia-hero-sub">
              Carga los archivos de cada unidad y captura los denominadores para generar los 6 reportes
            </p>
          </div>

          {/* Período */}
          <div className="ia-periodo">
            <span className="ia-periodo-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Período del reporte
            </span>
            <select className="ia-select" value={anio} onChange={e => {
              const nuevoAnio = e.target.value;
              setAnio(nuevoAnio);
              // Al cambiar a año actual, ajustar mes si ya no está disponible
              if (nuevoAnio === String(anioActual)) {
                if (mesMaxActual < 1) {
                  // Enero antes del 25: no hay meses disponibles en año actual, regresar al anterior
                  setAnio(String(anioActual - 1));
                } else if (parseInt(mes) > mesMaxActual) {
                  setMes(String(mesMaxActual).padStart(2, '0'));
                }
              }
            }}>
              {/* Ocultar año actual si aún no hay ningún mes disponible (enero antes del 25) */}
              {[anioActual - 1, ...(mesMaxActual >= 1 ? [anioActual] : [])].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select className="ia-select" value={mes} onChange={e => setMes(e.target.value)}>
              {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
                .map((m, i) => {
                  const mesNum = i + 1;
                  if (!mesDisponible(mesNum, anio)) return null;
                  return <option key={i} value={String(mesNum).padStart(2, '0')}>{m}</option>;
                })}
            </select>
          </div>

          {/* Card */}
          <div className="ia-step-card ia-step-card--green">
            <div className="ia-step-head">
              <span className="ia-step-num ia-step-num--green">1</span>
              <div>
                <p className="ia-step-title">Datos por Unidad — IN_ASS 01–06</p>
                <p className="ia-step-desc">Excel del numerador (compartido) + denominadores manuales para 02–06</p>
              </div>
              {!cargando && (
                <span className={`ia-step-progress ${completos === unidades.length && unidades.length > 0 ? 'ia-step-progress--done' : ''}`}>
                  {completos}/{unidades.length} unidades
                </span>
              )}
            </div>

            <div
              className={`ia-global-inline ${dragOver ? 'ia-global-inline--over' : ''} ${numeradores ? 'ia-global-inline--done' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); setGlobal(e.dataTransfer.files[0]); }}
            >
              <span className="ia-global-badge">IN_ASS 01</span>
              <span className="ia-global-label">Excel para calcular el denominador</span>
              {numeradores ? (
                <div className="ia-file-chip">
                  <FileIcon />
                  <span className="ia-file-chip-name">{numeradores.name.replace('.xlsx', '')}</span>
                  <button className="ia-chip-x" onClick={e => { e.stopPropagation(); setNumeradores(null); }}><XIcon /></button>
                </div>
              ) : (
                <label className="ia-upload-btn ia-upload-btn--sm">
                  <input type="file" accept=".xlsx" hidden onChange={e => setGlobal(e.target.files[0])} />
                  <UploadIcon /> Subir o arrastrar
                </label>
              )}
            </div>

            <div className="ia-table-wrap">
              {cargando ? (
                <div className="ia-shimmer-stack">
                  {[1,2,3,4].map(i => <div key={i} className="ia-shimmer-row" />)}
                </div>
              ) : (
                <table className="ia-table">
                  <thead>
                    <tr>
                      <th className="ia-col-unidad">Unidad</th>
                      <th className="ia-col-excel">
                        <div className="ia-th-inner"><FileIcon /><span>Excel unidad</span></div>
                        <small>Numerador IASS 01–06</small>
                      </th>
                      {indicadores.map(d => (
                        <th key={d.id} className="ia-col-denom">
                          <span className="ia-th-ind">{d.id}</span>
                          <small>{d.subT2}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unidades.map((u, i) => {
                      const ok = rowOk(u);
                      return (
                        <tr key={u} className={`ia-tr ${ok ? 'ia-tr--ok' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td className="ia-td-unidad">
                            <span className={`ia-row-status ${ok ? 'ia-row-status--ok' : ''}`}>
                              {ok ? <CheckIcon size={10} /> : <span>{i + 1}</span>}
                            </span>
                            <span className="ia-unit-name">{u}</span>
                          </td>
                          <td
                            className={`ia-td-excel ${dragOverUnidad === u ? 'ia-td-excel--over' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragOverUnidad(u); }}
                            onDragLeave={() => setDragOverUnidad(null)}
                            onDrop={e => { e.preventDefault(); setDragOverUnidad(null); setUnidadFile(u, e.dataTransfer.files[0]); }}
                          >
                            {archivosUnidad[u] ? (
                              <div className="ia-file-chip">
                                <FileIcon />
                                <span className="ia-file-chip-name" title={archivosUnidad[u].name}>
                                  {archivosUnidad[u].name.replace('.xlsx', '')}
                                </span>
                                <button className="ia-chip-x"
                                  onClick={() => setArchivosUnidad(p => { const n = {...p}; delete n[u]; return n; })}>
                                  <XIcon />
                                </button>
                              </div>
                            ) : (
                              <label className={`ia-upload-btn ${dragOverUnidad === u ? 'ia-upload-btn--over' : ''}`}>
                                <input type="file" accept=".xlsx" hidden onChange={e => setUnidadFile(u, e.target.files[0])} />
                                <UploadIcon /><span>Subir o arrastrar</span>
                              </label>
                            )}
                          </td>
                          {indicadores.map((d, j) => (
                            <td key={d.id} className="ia-td-denom">
                              <input
                                type="number"
                                className="ia-num"
                                placeholder="0"
                                min="0"
                                value={denominadores[u]?.[d.id] ?? ''}
                                onChange={e => setDenom(u, d.id, e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const inputs = document.querySelectorAll('.ia-num');
                                    const idx  = i * indicadores.length + j;
                                    const next = e.key === 'ArrowDown' ? idx + indicadores.length : idx - indicadores.length;
                                    inputs[next]?.focus();
                                  }
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Advertencias */}
          {advertencias && (
            <div className="ia-warn-box">
              <div className="ia-warn-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Datos incompletos — puedes generar de todas formas
              </div>
              <ul className="ia-warn-list">
                {advertencias.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Action bar */}
          <div className="ia-action-bar">
            <div className="ia-progress-pills">
              <span className={`ia-pill ${numeradores ? 'ia-pill--ok' : ''}`}>
                {numeradores ? <CheckIcon size={10} /> : '·'} Excel global
              </span>
              <span className={`ia-pill ${completos === unidades.length && unidades.length > 0 ? 'ia-pill--ok' : ''}`}>
                {completos === unidades.length && unidades.length > 0 ? <CheckIcon size={10} /> : '·'} {completos}/{unidades.length} unidades
              </span>
            </div>
            <button className={`ia-btn-gen ${advertencias ? 'ia-btn-gen--warn' : ''}`} onClick={handleGenerar}>
              {advertencias ? 'Generar de todas formas' : 'Generar reportes'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </main>
      </div>

      <ModalLoading isOpen={generando} />
      <INASSErrorToast mensaje={errorMensaje} trigger={errorTrigger} />
    </>
  );
};

export default INASSPage;
