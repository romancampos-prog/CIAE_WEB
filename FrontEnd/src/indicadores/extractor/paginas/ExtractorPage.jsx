import { useState, useEffect, useCallback, Fragment } from 'react';
import TopBar from '../../../shared/componentes/TopBar';
import ModalLoading from '../../../shared/componentes/modal/ModalCargando';
import { getEstadoExtractor, subirArchivoMensualExtractor, descargarExcelFamiliaExtractor } from '../api/extractor';
import { descargarB64 } from '../../shared/utils/download';
import iconoEH from '../../../assets/icono_eh.png';
import iconoDM from '../../../assets/icono_dm.png';
import './extractor.css';

const RADIO = 30;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const AnilloProgreso = ({ subidos, total }) => {
  const porcentaje = total ? subidos / total : 0;
  const offset = CIRCUNFERENCIA * (1 - porcentaje);
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="ex-anillo">
      <circle cx="38" cy="38" r={RADIO} className="ex-anillo-fondo" />
      <circle
        cx="38" cy="38" r={RADIO}
        className="ex-anillo-relleno"
        strokeDasharray={CIRCUNFERENCIA}
        strokeDashoffset={offset}
      />
      <text x="38" y="34" textAnchor="middle" className="ex-anillo-num">{subidos}</text>
      <text x="38" y="49" textAnchor="middle" className="ex-anillo-den">de {total}</text>
    </svg>
  );
};

const CalendarioIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CheckCircleIcon = ({ activo }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={activo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9.5" />
    {activo && <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
  </svg>
);

const EstadoDropzone = ({ etiqueta, sugerido, archivo, onSeleccionar, requerido }) => {
  const [arrastrando, setArrastrando] = useState(false);

  const manejarArchivo = (file) => { if (file) onSeleccionar(file); };
  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    manejarArchivo(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="ex-dz-campo">
      <p className="ex-dz-etiqueta">
        {etiqueta} {requerido ? <span className="ex-dz-req">*</span> : <span className="ex-dz-opc">(opcional)</span>}
      </p>

      {!archivo ? (
        <div
          className={`ex-dz-area${arrastrando ? ' ex-dz-area--activo' : ''}`}
          onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={onDrop}
        >
          <input type="file" accept=".xlsx,.xls" onChange={e => manejarArchivo(e.target.files?.[0])} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /><polyline points="8 17 12 13 16 17" /><line x1="12" y1="13" x2="12" y2="22" />
          </svg>
          <p className="ex-dz-texto">Arrastra o <span>selecciona</span> el Excel</p>
          <p className="ex-dz-sugerido">{sugerido}.xlsx</p>
        </div>
      ) : (
        <div className="ex-dz-seleccionado">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="ex-dz-nombre">{archivo.name}</span>
          <button type="button" className="ex-dz-quitar" onClick={() => onSeleccionar(null)}>Quitar</button>
        </div>
      )}
    </div>
  );
};

const ExtractorPage = () => {
  const anioReferencia = new Date().getFullYear();

  const [estado, setEstado]           = useState(null);
  const [cargando, setCargando]       = useState(true);
  const [corteActivo, setCorteActivo] = useState(null);   // "Junio 2026", "Diciembre 2026", ...
  const [subiendo, setSubiendo]       = useState(false);
  const [mesAbierto, setMesAbierto]   = useState(null);   // "Julio-2025"
  const [archivoPrincipal, setArchivoPrincipal] = useState(null);
  const [archivoCruce, setArchivoCruce]         = useState(null);
  const [error, setError]         = useState('');
  const [resultado, setResultado] = useState(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => { document.title = 'Extractor | CIAE'; }, []);

  const cargarEstado = useCallback(async () => {
    setCargando(true);
    const data = await getEstadoExtractor(anioReferencia);
    setEstado(data);
    setCargando(false);
  }, [anioReferencia]);

  useEffect(() => { cargarEstado(); }, [cargarEstado]);

  const abrirMes = (clave) => {
    setResultado(null);
    setMesAbierto(mesAbierto === clave ? null : clave);
    setArchivoPrincipal(null);
    setArchivoCruce(null);
    setError('');
  };

  const subirMes = async (mes, anio) => {
    if (!archivoPrincipal) { setError('Falta el archivo del SUI-13.'); return; }
    setSubiendo(true);
    setError('');
    try {
      const res = await subirArchivoMensualExtractor(anio, mes, archivoPrincipal, archivoCruce);
      setResultado({ mes, anio, porIndicador: res.data });
      setMesAbierto(null);
      await cargarEstado();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const corteInfo = corteActivo && estado ? estado[corteActivo] : null;

  const descargar = async () => {
    if (!corteInfo) return;
    setDescargando(true);
    setError('');
    try {
      const res = await descargarExcelFamiliaExtractor(corteInfo.anioCorte, corteInfo.mesCorte);
      descargarB64(res.archivo_b64, res.nombre_archivo);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al descargar el reporte.');
    } finally {
      setDescargando(false);
    }
  };

  const estadoTexto = (info) => {
    if (info.corteYaGenerado) return 'Completo';
    if (info.mesesSubidos === 0) return 'Sin iniciar';
    return 'En progreso';
  };

  return (
    <div className="ex-root">
      <div className="ex-bg" aria-hidden>
        <div className="ex-orb ex-orb-1" />
        <div className="ex-orb ex-orb-2" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos/Generar" />

      <main className="ex-page-main">
        <div className="ex-page-watermark" aria-hidden>
          <img src={iconoEH} alt="" />
          <img src={iconoDM} alt="" />
        </div>

        <div className="ex-hero">
          <h1 className="ex-page-title">Extractor</h1>
          <p className="ex-page-sub">
            Cada mes se sube un solo Excel del SUI-13 (más su cruce con Egresos) y alimenta a
            <strong> EH 03</strong> y <strong>DM 04</strong> a la vez. El corte semestral se calcula
            solo cuando ya están los 12 meses de su ventana.
          </p>
        </div>

        {!corteActivo && (
          <>
            <div className="ex-cortes-grid">
              {cargando && <p className="ex-cargando">Cargando estado…</p>}
              {!cargando && estado && Object.entries(estado).map(([clave, info]) => (
                <button key={clave} className="ex-corte-card" onClick={() => setCorteActivo(clave)}>
                  <AnilloProgreso subidos={info.mesesSubidos} total={info.mesesTotales} />
                  <div className="ex-corte-card-info">
                    <p className="ex-corte-card-titulo"><CalendarioIcon /> Corte {clave}</p>
                    <span className={`ex-badge ex-badge--${info.corteYaGenerado ? 'completo' : info.mesesSubidos === 0 ? 'vacio' : 'progreso'}`}>
                      {estadoTexto(info)}
                    </span>
                  </div>
                  <span className="ex-corte-card-ir">Ver meses →</span>
                </button>
              ))}
            </div>

            <div className="ex-pasos">
              <p className="ex-pasos-titulo">¿Cómo funciona?</p>
              <div className="ex-pasos-grid">
                <div className="ex-paso">
                  <span className="ex-paso-num">1</span>
                  <div>
                    <p className="ex-paso-titulo">Elige un corte</p>
                    <p className="ex-paso-desc">Junio o Diciembre — cada uno necesita 12 meses de SUI-13 subidos.</p>
                  </div>
                </div>
                <div className="ex-paso">
                  <span className="ex-paso-num">2</span>
                  <div>
                    <p className="ex-paso-titulo">Sube el mes que falte</p>
                    <p className="ex-paso-desc">El SUI-13 y, si aplica, el cruce con Egresos para validar la vía 2.</p>
                  </div>
                </div>
                <div className="ex-paso">
                  <span className="ex-paso-num">3</span>
                  <div>
                    <p className="ex-paso-titulo">Corte automático</p>
                    <p className="ex-paso-desc">Al completar los 12 meses, se calcula el denominador y el semáforo solo.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {corteActivo && corteInfo && (
          <div className="ex-checklist">
            <button className="ex-volver" onClick={() => setCorteActivo(null)}>← Ver todos los cortes</button>

            <div className="ex-checklist-header">
              <div>
                <h2>Corte {corteActivo}</h2>
                <p className="ex-checklist-resumen">
                  {corteInfo.mesesSubidos} de 12 meses subidos
                  {corteInfo.corteYaGenerado && ' — este corte ya fue generado'}
                </p>
                {corteInfo.corteYaGenerado && (
                  <button className="ex-boton-descargar" onClick={descargar} disabled={descargando}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {descargando ? 'Descargando…' : 'Descargar Excel (EH 03 + DM 04)'}
                  </button>
                )}
              </div>
              <AnilloProgreso subidos={corteInfo.mesesSubidos} total={corteInfo.mesesTotales} />
            </div>

            <ul className="ex-lista-meses">
              {corteInfo.detalle.map(({ mes, anio, subido }) => {
                const clave = `${mes}-${anio}`;
                const abierto = mesAbierto === clave;
                return (
                  <li key={clave} className={`ex-item-container${abierto ? ' ex-item-container--abierto' : ''}`}>
                    <div className={`ex-item-mes${subido ? ' ex-item-mes--subido' : ''}${abierto ? ' ex-item-mes--abierto' : ''}`}>
                      <span className={`ex-item-check${subido ? ' ex-item-check--on' : ''}`}><CheckCircleIcon activo={subido} /></span>
                      <span className="ex-item-nombre">{mes} {anio}</span>
                      <span className="ex-item-estado">{subido ? 'Subido' : 'Pendiente'}</span>
                      {!subido && (
                        <button className={`ex-boton-subir${abierto ? ' ex-boton-subir--activo' : ''}`} onClick={() => abrirMes(clave)}>
                          {abierto ? 'Cerrar' : 'Subir'}
                        </button>
                      )}
                    </div>

                    {abierto && (
                      <div className="ex-uploader-wrap">
                        <div className="ex-uploader">
                          <EstadoDropzone
                            etiqueta="SUI-13"
                            sugerido={`SUI_13_${mes}_${anio}`}
                            archivo={archivoPrincipal}
                            onSeleccionar={setArchivoPrincipal}
                            requerido
                          />
                          <EstadoDropzone
                            etiqueta="Egresos (cruce)"
                            sugerido={`EGRESOS_PACIENTES_DIARIA_${mes}_${anio}`}
                            archivo={archivoCruce}
                            onSeleccionar={setArchivoCruce}
                          />

                          {error && <p className="ex-error">{error}</p>}

                          <div className="ex-uploader-botones">
                            <button
                              className="ex-boton-confirmar"
                              onClick={() => subirMes(mes, anio)}
                              disabled={!archivoPrincipal}
                            >
                              Confirmar {mes} {anio}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {resultado && (
          <div className="ex-resultado">
            <h3>{resultado.mes} {resultado.anio} procesado</h3>
            {Object.entries(resultado.porIndicador).map(([indicador, r]) => {
              const total = Object.values(r.numerador_por_unidad).reduce((a, b) => a + b, 0);
              return (
                <p key={indicador} className="ex-resultado-fila">
                  <strong>{indicador}</strong> — {total} casos
                  {r.corte_generado && <span className="ex-badge ex-badge--completo">Corte generado</span>}
                </p>
              );
            })}
          </div>
        )}
      </main>

      <ModalLoading isOpen={subiendo} nota="Procesando el Excel del mes para EH 03 y DM 04..." />
    </div>
  );
};

export default ExtractorPage;
