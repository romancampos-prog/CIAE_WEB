// react
import { useState, useEffect, useCallback, useMemo } from 'react';
// propios
import TopBar from '../../../shared/componentes/TopBar';
import ModalLoading from '../../../shared/componentes/modal/ModalCargando';
import {
  getIndicadoresExtractor, getEstadoArchivosExtractor, getEstadoExtractor,
  subirArchivoMensualExtractor, subirCruceExtractor,
} from '../api/extractor';
import { getMesesGenerados } from '../../reportes_grafica/api/reportes';
import { descargarExcelIndicadores } from '../../shared/api/excel';
import { descargarB64 } from '../../shared/utils/download';
import FichaTecnicaBoton from '../../shared/componentes/FichaTecnica/FichaTecnicaBoton';
import { urlIcono } from '../../shared/utils/iconos';
import './extractor.css';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Años del selector: el actual y los anteriores, calculados con la fecha (en 2027 aparece solo).
const ANIOS_HACIA_ATRAS = 1;

// Cómo se ve cada estado de mes que manda /estado-archivos.
const ESTADO_MES = {
  completo:      { clase: 'ok',       texto: 'Subido' },
  parcial:       { clase: 'parcial',  texto: 'Incompleto' },
  pendiente:     { clase: 'pendiente', texto: 'Pendiente' },
  sin_principal: { clase: 'bloqueado', texto: 'Falta SUI-13' },
  sin_registro:  { clase: 'previo',   texto: 'Subido antes' },
};
const ESTADO_FUTURO = { clase: 'futuro', texto: 'Todavía no llega' };

// Qué dice el panel lateral sobre el mes elegido antes de subir.
const DESCRIPCION_ESTADO = {
  completo:     'Este mes ya está subido.',
  parcial:      'Este mes está incompleto: vuelve a subirlo para generarlo.',
  pendiente:    'Este mes todavía no se ha subido.',
  sin_registro: 'Este mes se subió antes de llevar este registro; puedes volver a subirlo.',
};

const numeroMes = (mes) => String(MESES.indexOf(mes) + 1).padStart(2, '0');

// "Materna 04 - Cobertura de..." -> "Cobertura de...": la clave ya va arriba en la tarjeta.
const tituloSinClave = (titulo = '') => titulo.replace(/^[^-–]*?\d+\s*[-–]\s*/, '');

// "Mensual - Mensual Acumulado: dato de cada mes..." -> "Dato de cada mes...": la periodicidad ya va en la etiqueta.
const explicacionPeriodo = (texto = '') => {
  const despues = texto.includes(':') ? texto.slice(texto.indexOf(':') + 1).trim() : texto;
  return despues.charAt(0).toUpperCase() + despues.slice(1);
};

const RADIO = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const AnilloProgreso = ({ subidos, total }) => {
  const offset = CIRCUNFERENCIA * (1 - (total ? subidos / total : 0));
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="exv-anillo">
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-fondo" />
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-relleno" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offset} />
      <text x="28" y="32" textAnchor="middle" className="exv-anillo-num">{subidos}/{total}</text>
    </svg>
  );
};

const IconoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12.5 10 17 19 7" />
  </svg>
);

// Un icono por estado: la celda de la tabla no tiene espacio para texto.
const IconoEstadoMes = ({ clase }) => {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (clase === 'ok' || clase === 'previo') return <svg {...props}><polyline points="5 12.5 10 17 19 7" /></svg>;
  if (clase === 'parcial') return <svg {...props} strokeWidth={2}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>;
  if (clase === 'bloqueado') return <svg {...props} strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
  if (clase === 'futuro') return <svg {...props}><line x1="7" y1="12" x2="17" y2="12" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /></svg>;
};

const IconoDescarga = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconoArchivo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const EXTENSIONES_EXCEL = ['.xlsx', '.xls'];
const esExcel = (archivo) => EXTENSIONES_EXCEL.some(ext => archivo.name.toLowerCase().endsWith(ext));

const ZonaArchivo = ({ sugerido, archivo, onSeleccionar }) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [rechazado, setRechazado] = useState('');

  // El input filtra por extensión, pero al arrastrar puede llegar cualquier archivo.
  const elegir = (file) => {
    if (!file) return;
    if (!esExcel(file)) {
      setRechazado(`"${file.name}" no es un Excel. Solo se aceptan archivos .xlsx o .xls.`);
      return;
    }
    setRechazado('');
    onSeleccionar(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files?.[0]);
  };

  if (archivo) {
    return (
      <div className="ex-dz-seleccionado">
        <IconoArchivo />
        <span className="ex-dz-nombre">{archivo.name}</span>
        <button type="button" className="ex-dz-quitar" onClick={() => onSeleccionar(null)}>Quitar</button>
      </div>
    );
  }
  return (
    <>
      <div
        className={`ex-dz-area${arrastrando ? ' ex-dz-area--activo' : ''}`}
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
      >
        <input type="file" accept={EXTENSIONES_EXCEL.join(',')} onChange={e => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /><polyline points="8 17 12 13 16 17" /><line x1="12" y1="13" x2="12" y2="22" />
        </svg>
        <p className="ex-dz-texto">Arrastra o <span>selecciona</span> el archivo</p>
        <p className="exv-dz-formato">Solo archivos Excel (.xlsx o .xls)</p>
        <p className="ex-dz-sugerido">Ejemplo: {sugerido}.xlsx · el nombre puede ser otro</p>
      </div>
      {rechazado && <p className="ex-error">{rechazado}</p>}
    </>
  );
};

const ChipIndicador = ({ clave, icono }) => (
  <span className="exv-chip-ind">{icono && <img src={icono} alt="" />}{clave}</span>
);

const ExtractorPage = () => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const aniosDisponibles = Array.from({ length: ANIOS_HACIA_ATRAS + 1 }, (_, i) => anioActual - i);

  const [anio, setAnio]                     = useState(anioActual);
  const [indicadores, setIndicadores]       = useState([]);
  const [archivos, setArchivos]             = useState([]);
  const [cortes, setCortes]                 = useState({});
  const [mesesGenerados, setMesesGenerados] = useState({});
  const [cargando, setCargando]             = useState(true);
  const [errorCarga, setErrorCarga]         = useState('');
  const [panel, setPanel]                   = useState(null);   // { archivo, tipo, prefijo, mes }
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendo, setSubiendo]             = useState(false);
  const [error, setError]                   = useState('');
  const [resultado, setResultado]           = useState(null);
  const [descargando, setDescargando]       = useState(null);

  useEffect(() => { document.title = 'Extractor | CIAE'; }, []);

  // Qué indicadores maneja el Extractor y qué usa cada uno: todo del mapeo, vía backend.
  useEffect(() => {
    getIndicadoresExtractor()
      .then(lista => setIndicadores(lista.map(i => ({ ...i, icono: urlIcono(i.imagen) }))))
      .catch(() => setErrorCarga('No se pudieron cargar los indicadores del Extractor.'));
  }, []);

  const iconoDe = useMemo(() => Object.fromEntries(indicadores.map(i => [i.indicador, i.icono])), [indicadores]);

  const cargarEstado = useCallback(async () => {
    if (!indicadores.length) return;
    setCargando(true);
    const mensuales = indicadores.filter(i => i.tipo === 'mensual');
    // /estado responde por ventana de corte: Jul-Dic del año elegido viven en la
    // ventana "Junio del año siguiente", así que se piden los dos años.
    const [estadoArchivos, cortesAnio, cortesSiguiente, generados] = await Promise.all([
      getEstadoArchivosExtractor(anio),
      getEstadoExtractor(anio),
      getEstadoExtractor(anio + 1),
      Promise.all(mensuales.map(i => getMesesGenerados(i.indicador, String(anio)))),
    ]);
    setArchivos(estadoArchivos?.archivos ?? []);
    setCortes({ ...(cortesSiguiente ?? {}), ...(cortesAnio ?? {}) });
    setMesesGenerados(Object.fromEntries(mensuales.map((i, k) => [i.indicador, generados[k]])));
    setCargando(false);
  }, [anio, indicadores]);

  useEffect(() => { cargarEstado(); }, [cargarEstado]);

  const esFuturo = (mes) => anio > anioActual || (anio === anioActual && MESES.indexOf(mes) > hoy.getMonth());

  const cortesDelAnio = useMemo(
    () => Object.entries(cortes).filter(([, v]) => v.anioCorte === anio),
    [cortes, anio],
  );

  const abrir = (archivo, mes) => {
    setPanel({ archivo: archivo.archivo, tipo: archivo.tipo, prefijo: archivo.prefijoArchivo, mes });
    setArchivoSeleccionado(null);
    setResultado(null);
    setError('');
  };

  const cerrarPanel = useCallback(() => {
    if (subiendo) return;
    setPanel(null);
    setResultado(null);
    setArchivoSeleccionado(null);
    setError('');
  }, [subiendo]);

  useEffect(() => {
    if (!panel) return;
    const alPresionar = (e) => { if (e.key === 'Escape') cerrarPanel(); };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [panel, cerrarPanel]);

  const cambiarAnio = (a) => {
    setAnio(a);
    setPanel(null);
    setResultado(null);
  };

  const procesar = async () => {
    if (!archivoSeleccionado) return;
    setSubiendo(true);
    setError('');
    try {
      const res = panel.tipo === 'principal'
        ? await subirArchivoMensualExtractor(anio, panel.mes, archivoSeleccionado, null, panel.prefijo)
        : await subirCruceExtractor(anio, panel.mes, archivoSeleccionado);
      // El resultado se queda en el mismo panel donde se subió, para que no se pierda.
      setResultado({ archivo: panel.archivo, mes: panel.mes, anio, porIndicador: res.data, mensaje: res.message });
      setArchivoSeleccionado(null);
      await cargarEstado();
    } catch (e) {
      setError(e.response?.data?.detail || `Error al procesar el ${panel.archivo}.`);
    } finally {
      setSubiendo(false);
    }
  };

  const archivoDelPanel = panel ? archivos.find(a => a.archivo === panel.archivo) : null;
  const estadoDelPanel = archivoDelPanel?.meses.find(m => m.mes === panel.mes);

  // clave: identifica qué botón muestra "Descargando…".
  const descargar = async (clave, claves, anioExcel, mes) => {
    setDescargando(clave);
    setError('');
    try {
      const res = await descargarExcelIndicadores(claves, anioExcel, mes);
      descargarB64(res.archivo_b64, res.nombre_archivo);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al descargar el reporte.');
    } finally {
      setDescargando(null);
    }
  };

  // Lo que pasó con un indicador al procesar el archivo, en una línea.
  const resumenIndicador = (r) => {
    if (r.error) return { texto: r.error, tono: 'error' };
    if (r.pendiente) return { texto: r.pendiente, tono: 'progreso' };
    if (r.tipo === 'mensual' && r.total) {
      return { texto: `${r.total.numerador} / ${r.total.denominador} = ${r.total['%']} (${r.total.desempeno}). Mes generado.${r.detalle ? ` ${r.detalle}` : ''}`, tono: 'completo' };
    }
    const casos = Object.values(r.numerador_por_unidad ?? {}).reduce((a, b) => a + b, 0);
    const via2 = r.validados_via2 ? ` (${r.validados_via2} por vía 2)` : '';
    if (r.corte_generado) return { texto: `${casos} casos${via2}. Se generó el corte.`, tono: 'completo' };
    const recalc = r.cortes_recalculados?.length ? ` Se recalculó el corte ${r.cortes_recalculados.join(', ')}.` : '';
    const cruce = r.cruce_pendiente ? ' Falta subir el Egresos Pacientes de este mes para la vía 2.' : '';
    return { texto: `${casos} casos${via2}. Numerador guardado.${recalc}${cruce}`, tono: r.cruce_pendiente ? 'progreso' : 'completo' };
  };

  return (
    <div className="ex-root">
      <div className="ex-bg" aria-hidden>
        <div className="ex-orb ex-orb-1" />
        <div className="ex-orb ex-orb-2" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos/Generar" />

      <main className="ex-page-main exv-main">
        <div className="ex-hero">
          <div className="ex-hero-top">
            <div>
              <h1 className="ex-page-title">Extractor</h1>
              <p className="ex-page-sub">
                Sube cada archivo del mes en su apartado. Cada indicador toma lo que necesita y, según su
                periodicidad, guarda el mes o lo genera.
              </p>
            </div>
            <div className="exv-hero-acciones">
              <label className="exv-anio-select">
                <span>Año</span>
                <select value={anio} onChange={e => cambiarAnio(Number(e.target.value))}>
                  {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              {indicadores.length > 0 && (
                <FichaTecnicaBoton
                  indicador={indicadores.map(i => i.indicador)}
                  color="#0b5445"
                  iconos={iconoDe}
                />
              )}
            </div>
          </div>
        </div>

        {errorCarga && <p className="ex-error">{errorCarga}</p>}

        {/* ── Todo el año en una tabla: filas = archivos, columnas = meses ── */}
        <h2 className="exv-seccion-titulo">Archivos de {anio}</h2>
        {cargando && !archivos.length && <p className="ex-cargando">Cargando…</p>}

        {archivos.length > 0 && (
          <section className="exv-panel exa-tabla" aria-label={`Archivos subidos en ${anio}`}>
            <div className="exa-fila exa-fila--encabezado" aria-hidden>
              <span className="exa-col-archivo">Archivo</span>
              {MESES.map(m => <span key={m} className="exa-col-mes">{m.slice(0, 3)}</span>)}
            </div>

            {archivos.map(archivo => {
              const subidos = archivo.meses.filter(m => m.estado === 'completo').length;
              return (
                <div key={archivo.archivo} className={`exa-fila exa-fila--${archivo.tipo}`}>
                  <div className="exa-col-archivo exa-archivo">
                    <div className="exa-archivo-nombre">
                      <strong>{archivo.archivo}</strong>
                      <span className={`exv-tag ${archivo.requerido ? 'exv-tag--requerido' : 'exv-tag--opcional'}`}>
                        {archivo.requerido ? 'Obligatorio' : 'Opcional'}
                      </span>
                    </div>
                    <div className="exa-archivo-pie">
                      <span className="exa-alimenta" title={`Alimenta a ${archivo.indicadores.join(', ')}`}>
                        {archivo.indicadores.map(c => (
                          <span key={c} className="exa-mini-ind">{iconoDe[c] && <img src={iconoDe[c]} alt="" />}{c}</span>
                        ))}
                      </span>
                      <span className="exa-conteo">{subidos}/12</span>
                    </div>
                  </div>

                  {archivo.meses.map(({ mes, estado, faltan }) => {
                    const futuro = esFuturo(mes);
                    const bloqueado = futuro || estado === 'sin_principal';
                    const visual = futuro ? ESTADO_FUTURO : (ESTADO_MES[estado] ?? ESTADO_MES.pendiente);
                    const activo = panel?.archivo === archivo.archivo && panel?.mes === mes;
                    const detalle = estado === 'parcial' && faltan?.length ? ` (falta en ${faltan.join(', ')})` : '';
                    return (
                      <button
                        key={mes}
                        type="button"
                        disabled={bloqueado}
                        title={`${mes}: ${visual.texto}${detalle}`}
                        aria-label={`${archivo.archivo}, ${mes}: ${visual.texto}${detalle}`}
                        onClick={() => abrir(archivo, mes)}
                        className={`exa-celda exa-celda--${visual.clase}${activo ? ' exa-celda--activa' : ''}`}
                      >
                        <span className="exa-celda-mes">{mes.slice(0, 3)}</span>
                        <IconoEstadoMes clase={visual.clase} />
                      </button>
                    );
                  })}
                </div>
              );
            })}

            <ul className="exa-leyenda">
              {[ESTADO_MES.completo, ESTADO_MES.parcial, ESTADO_MES.pendiente, ESTADO_MES.sin_principal, ESTADO_MES.sin_registro].map(e => (
                <li key={e.clase}><span className={`exa-celda exa-celda--${e.clase} exa-celda--muestra`}><IconoEstadoMes clase={e.clase} /></span>{e.texto}</li>
              ))}
            </ul>
            <p className="exv-nota-mes">Da clic en un mes para subir o reemplazar su archivo.</p>
          </section>
        )}

        {/* ── Cada indicador por separado ── */}
        <h2 className="exv-seccion-titulo">Indicadores</h2>
        <div className="exv-ind-grid">
          {indicadores.map(ind => {
            const generados = MESES.filter(m => (mesesGenerados[ind.indicador] ?? []).includes(numeroMes(m)));
            const ultimo = generados[generados.length - 1];
            // El denominador solo se muestra si no sale del mismo archivo (ej. EH 03: población PAMF).
            const denominadorAparte = !ind.archivos.some(a => a.archivo === ind.denominador);
            return (
              <article key={ind.indicador} className="exv-ind">
                <header className="exv-ind-header">
                  <div className="exv-ind-icono">{ind.icono && <img src={ind.icono} alt="" />}</div>
                  <div className="exv-ind-id">
                    <span className="exv-ind-clave">{ind.indicador}</span>
                    <span className={`exv-tag exv-tag--${ind.tipo === 'corte' ? 'semestral' : 'mensual'}`}>{ind.periodicidad}</span>
                  </div>
                </header>

                <p className="exv-ind-titulo" title={ind.titulo}>{tituloSinClave(ind.titulo)}</p>

                <dl className="exv-ind-datos">
                  <div>
                    <dt>Archivo</dt>
                    <dd>
                      {ind.archivos.map(a => (
                        <span key={a.archivo} className={`exv-archivo-chip${a.requerido ? '' : ' exv-archivo-chip--opcional'}`}
                          title={a.uso}>
                          {a.archivo}{!a.requerido && ' · opcional'}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {denominadorAparte && <div><dt>Denominador</dt><dd>{ind.denominador}</dd></div>}
                  <div><dt>Agrupa</dt><dd>{ind.agrupacion}</dd></div>
                  {ind.descripcionPeriodicidad && <div><dt>Periodo</dt><dd>{explicacionPeriodo(ind.descripcionPeriodicidad)}</dd></div>}
                </dl>

                <div className="exv-ind-estado">
                {ind.tipo === 'corte' && (
                  <div className="exv-cortes">
                    {cortesDelAnio.length === 0 && <p className="ex-cargando">Sin cortes para {anio}.</p>}
                    {cortesDelAnio.map(([clave, info]) => (
                      <div key={clave} className="exv-corte">
                        <AnilloProgreso subidos={info.mesesSubidos} total={info.mesesTotales} />
                        <div className="exv-corte-info">
                          <p className="exv-corte-titulo">Corte {clave}</p>
                          <span className={`ex-badge ex-badge--${info.corteYaGenerado ? 'completo' : info.mesesSubidos ? 'progreso' : 'vacio'} exv-badge`}>
                            {info.corteYaGenerado ? 'Generado' : info.mesesSubidos ? `Faltan ${info.mesesTotales - info.mesesSubidos} meses` : 'Sin iniciar'}
                          </span>
                        </div>
                        {info.corteYaGenerado && (
                          <button className="exv-boton-excel" onClick={() => descargar(`${ind.indicador}-${clave}`, [ind.indicador], info.anioCorte, info.mesCorte)}
                            disabled={descargando === `${ind.indicador}-${clave}`}>
                            <IconoDescarga /> {descargando === `${ind.indicador}-${clave}` ? 'Descargando…' : 'Excel'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {ind.tipo === 'mensual' && (
                  <div className="exv-mensual-bloque">
                    <div className="exv-mensual-header">
                      <p className="exv-corte-titulo">
                        {generados.length
                          ? `${generados.length} ${generados.length === 1 ? 'mes generado' : 'meses generados'} de ${anio}`
                          : `Sin meses generados en ${anio}: sube ${ind.archivos.filter(a => a.requerido).map(a => a.archivo).join(' y ') || 'el archivo'}`}
                      </p>
                      {ultimo && (
                        <button className="exv-boton-excel" onClick={() => descargar(`${ind.indicador}-${ultimo}`, [ind.indicador], anio, ultimo)}
                          disabled={descargando === `${ind.indicador}-${ultimo}`}>
                          <IconoDescarga /> {descargando === `${ind.indicador}-${ultimo}` ? 'Descargando…' : `Excel ${ultimo}`}
                        </button>
                      )}
                    </div>
                    <div className="exv-mensual">
                      {MESES.filter(m => !esFuturo(m)).map(mes => {
                        const clave = `${ind.indicador}-${mes}`;
                        return generados.includes(mes) ? (
                          <button key={mes} className="exv-mensual-mes exv-mensual-mes--ok" title={`Descargar ${mes} ${anio}`}
                            onClick={() => descargar(clave, [ind.indicador], anio, mes)} disabled={descargando === clave}>
                            {descargando === clave ? '…' : mes.slice(0, 3)}
                          </button>
                        ) : (
                          <span key={mes} className="exv-mensual-mes" title={`Sube el ${ind.archivos[0]?.archivo ?? 'archivo'} de este mes para generarlo`}>{mes.slice(0, 3)}</span>
                        );
                      })}
                    </div>
                    {generados.length > 0 && <p className="exv-nota-mes">Da clic en un mes para descargar su Excel.</p>}
                  </div>
                )}
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* ── Panel lateral para subir el archivo del mes elegido ── */}
      {panel && archivoDelPanel && (
        <div className="exa-capa" onClick={cerrarPanel}>
          <aside
            className="exa-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exa-panel-titulo"
            onClick={e => e.stopPropagation()}
          >
            <header className="exa-panel-header">
              <span className={`exv-archivo-icono${panel.tipo === 'cruce' ? ' exa-icono--cruce' : ''}`}><IconoArchivo /></span>
              <div className="exa-panel-titulos">
                <h2 id="exa-panel-titulo">{panel.archivo}</h2>
                <p>{panel.mes} {anio}</p>
              </div>
              <button type="button" className="exa-panel-cerrar" onClick={cerrarPanel} aria-label="Cerrar panel" autoFocus>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </button>
            </header>

            <div className="exa-panel-cuerpo">
              {resultado ? (
                <>
                  <div className="exa-resultado-encabezado">
                    <span className="exa-resultado-ok"><IconoCheck /></span>
                    <div>
                      <p className="exa-resultado-titulo">{resultado.archivo} de {resultado.mes} procesado</p>
                      {resultado.mensaje && <p className="exa-resultado-sub">{resultado.mensaje}</p>}
                    </div>
                  </div>
                  {Object.entries(resultado.porIndicador).map(([clave, r]) => {
                    const { texto, tono } = resumenIndicador(r);
                    return (
                      <div key={clave} className={`exv-resultado-fila exv-resultado-fila--${tono}`}>
                        <div className="exv-iconos">{iconoDe[clave] && <img src={iconoDe[clave]} alt="" />}</div>
                        <div>
                          <p className="exv-resultado-titulo">{clave}</p>
                          <p className="exv-resultado-texto">{texto}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <p className={`exa-estado-mes exa-estado-mes--${(ESTADO_MES[estadoDelPanel?.estado] ?? ESTADO_MES.pendiente).clase}`}>
                    <IconoEstadoMes clase={(ESTADO_MES[estadoDelPanel?.estado] ?? ESTADO_MES.pendiente).clase} />
                    {DESCRIPCION_ESTADO[estadoDelPanel?.estado] ?? DESCRIPCION_ESTADO.pendiente}
                    {estadoDelPanel?.estado === 'parcial' && estadoDelPanel.faltan?.length > 0 && ` Falta en ${estadoDelPanel.faltan.join(', ')}.`}
                  </p>

                  <p className="exv-archivo-uso">{archivoDelPanel.uso}</p>
                  <div className="exv-alimenta">
                    <span>Alimenta a</span>
                    {archivoDelPanel.indicadores.map(c => <ChipIndicador key={c} clave={c} icono={iconoDe[c]} />)}
                  </div>

                  {['completo', 'parcial', 'sin_registro'].includes(estadoDelPanel?.estado) && (
                    <p className="ex-aviso-reemplazo">
                      Al procesarlo de nuevo se reemplazan los datos en {archivoDelPanel.indicadores.join(', ')}
                      {' '}y se recalculan los cortes cerrados que lo incluyan.
                      {panel.tipo === 'principal' && archivos.some(a => a.tipo === 'cruce' && a.indicadores.some(i => archivoDelPanel.indicadores.includes(i)))
                        && ' Los indicadores que usan Egresos Pacientes quedan con la vía 2 pendiente: después vuelve a subir el Egresos Pacientes de este mes.'}
                    </p>
                  )}

                  <ZonaArchivo
                    sugerido={`${panel.prefijo}_${numeroMes(panel.mes)}_${anio}`}
                    archivo={archivoSeleccionado}
                    onSeleccionar={setArchivoSeleccionado}
                  />

                  {error && <p className="ex-error">{error}</p>}
                </>
              )}
            </div>

            <footer className="exa-panel-pie">
              {resultado ? (
                <>
                  <button type="button" className="exa-boton-secundario" onClick={() => setResultado(null)}>Subir de nuevo</button>
                  <button type="button" className="ex-boton-confirmar" onClick={cerrarPanel}>Listo</button>
                </>
              ) : (
                <>
                  <button type="button" className="exa-boton-secundario" onClick={cerrarPanel}>Cancelar</button>
                  <button type="button" className="ex-boton-confirmar" onClick={procesar} disabled={!archivoSeleccionado}>
                    {panel.tipo === 'principal' ? 'Procesar' : 'Cruzar'} {panel.archivo}
                  </button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}

      <ModalLoading isOpen={subiendo} nota={`Procesando el ${panel?.archivo ?? 'archivo'} para los indicadores del Extractor...`} />
    </div>
  );
};

export default ExtractorPage;
