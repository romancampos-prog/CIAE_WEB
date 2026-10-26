// propios
import { ANO_ACTIVO, useActualizarPoblacion } from '@/features/generar-ftp/hooks/useActualizarPoblacion';
import './modalPoblacion.css';

interface Props {
    onClose: () => void;
    archivoActual: string | null;
}

/** Subir el Excel de población (InfoSalud) y, después, recalcular lo que depende de ella. */
const ModalPoblacion = ({ onClose, archivoActual }: Props) => {
    const {
        archivo, elegirArchivo, quitarArchivo, dragOver, setDragOver, soltarArchivo,
        mensaje, fase, advertencias, periodo, resultado, cargando, subir, recalcular,
    } = useActualizarPoblacion();

    return (
        <div className="mpob-overlay" onClick={onClose}>
            <div className="mpob-card" onClick={e => e.stopPropagation()}>

                <div className="mpob-header">
                    <p className="mpob-title">
                        {fase === 'upload' ? 'Actualizar Población' : 'Recalcular reportes'}
                    </p>
                    <button className="mpob-close" onClick={onClose}>✕</button>
                </div>

                {/* ── FASE 1: subir archivo ── */}
                {fase === 'upload' && (
                    <>
                        <div className="mpob-source-notice">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span>
                                El archivo debe descargarse de:{' '}
                                <a
                                    href="http://infosalud.imss.gob.mx:8080/PAGINAS/poblacion2026.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mpob-source-link"
                                >
                                    infosalud.imss.gob.mx — Población 2026
                                </a>
                            </span>
                        </div>

                        {!archivo ? (
                            <div
                                className={`mpob-drop-area ${dragOver ? 'mpob-drag-over' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={soltarArchivo}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={e => elegirArchivo(e.target.files?.[0])}
                                />
                                <div className="mpob-drop-icon">📂</div>
                                <p className="mpob-drop-label">
                                    Arrastra aquí o <span>selecciona el archivo Excel</span>
                                </p>
                            </div>
                        ) : (
                            <div className="mpob-file-selected">
                                <span className="mpob-file-icon">📊</span>
                                <span className="mpob-file-name">{archivo.name}</span>
                                <button className="mpob-btn-quitar" onClick={quitarArchivo}>✕</button>
                            </div>
                        )}

                        {mensaje && <div className={`mpob-msg ${mensaje.tipo}`}>{mensaje.texto}</div>}

                        <div className="mpob-actions">
                            <button className="mpob-btn-cancel" onClick={onClose} disabled={cargando}>
                                Cancelar
                            </button>
                            <button className="mpob-btn-subir" onClick={subir} disabled={!archivo || cargando}>
                                {cargando ? <><div className="mpob-spinner" /> Subiendo…</> : 'Subir archivo'}
                            </button>
                        </div>

                        {archivoActual && (
                            <p className="mpob-archivo-actual">
                                Archivo actual: <strong>{archivoActual}</strong>
                            </p>
                        )}
                    </>
                )}

                {/* ── FASE 2: recalcular reportes ── */}
                {fase === 'recalcular' && (
                    <>
                        {mensaje && <div className={`mpob-msg ${mensaje.tipo}`}>{mensaje.texto}</div>}

                        {advertencias && (
                            <div className="mpob-advertencias">
                                {advertencias.advertenciaTitulo && (
                                    <div className="mpob-adv-bloque mpob-adv-bloque--celdas">
                                        <p className="mpob-adv-titulo mpob-adv-titulo--celdas">
                                            ⚠ No se pudo confirmar el período del archivo
                                        </p>
                                        <p className="mpob-adv-lista">{advertencias.advertenciaTitulo}</p>
                                    </div>
                                )}
                                {advertencias.no_encontradas.length > 0 && (
                                    <div className="mpob-adv-bloque">
                                        <p className="mpob-adv-titulo">
                                            ⚠ {advertencias.no_encontradas.length} unidad{advertencias.no_encontradas.length > 1 ? 'es' : ''} sin dato en el Excel:
                                        </p>
                                        <ul className="mpob-adv-lista">
                                            {advertencias.no_encontradas.map(u => <li key={u}>{u}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {advertencias.extras.length > 0 && (
                                    <div className="mpob-adv-bloque">
                                        <p className="mpob-adv-titulo">
                                            ℹ {advertencias.extras.length} unidad{advertencias.extras.length > 1 ? 'es' : ''} en el Excel no reconocidas:
                                        </p>
                                        <ul className="mpob-adv-lista">
                                            {advertencias.extras.map(u => <li key={u}>{u}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {Object.keys(advertencias.alias_sugeridos ?? {}).length > 0 && (
                                    <div className="mpob-adv-bloque mpob-adv-bloque--alias">
                                        <p className="mpob-adv-titulo mpob-adv-titulo--alias">
                                            💡 {Object.keys(advertencias.alias_sugeridos).length} emparejamiento{Object.keys(advertencias.alias_sugeridos).length > 1 ? 's' : ''} sugerido{Object.keys(advertencias.alias_sugeridos).length > 1 ? 's' : ''} por número de unidad:
                                        </p>
                                        <div className="mpob-alias-tabla">
                                            {Object.entries(advertencias.alias_sugeridos).map(([excel, sistema]) => (
                                                <div key={excel} className="mpob-alias-fila">
                                                    <span className="mpob-alias-excel" title={excel}>{excel}</span>
                                                    <span className="mpob-alias-arrow">→</span>
                                                    <span className="mpob-alias-sistema" title={sistema}>{sistema}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="mpob-btn-copiar-alias"
                                            onClick={() => navigator.clipboard.writeText(
                                                JSON.stringify(advertencias.alias_sugeridos, null, 2)
                                            )}
                                        >
                                            Copiar JSON de alias
                                        </button>
                                        <p className="mpob-alias-hint">
                                            Verifica que los pares sean correctos y agrégalos en <code>MAPEO_POBLACION.json</code> bajo la clave <code>"alias"</code>.
                                        </p>
                                    </div>
                                )}
                                {Object.keys(advertencias.celdasVacias).length > 0 && (
                                    <div className="mpob-adv-bloque mpob-adv-bloque--celdas">
                                        <p className="mpob-adv-titulo mpob-adv-titulo--celdas">
                                            ⚠ Celdas sin dato en el Excel (error de captura):
                                        </p>
                                        {Object.entries(advertencias.celdasVacias).map(([unidad, cols]) => (
                                            <div key={unidad} className="mpob-adv-unidad">
                                                <p className="mpob-adv-unidad-nombre">{unidad}</p>
                                                <ul className="mpob-adv-lista mpob-adv-lista--celdas">
                                                    {cols.map((c, i) => <li key={i}>{c}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {!resultado ? (
                            <>
                                <div className="mpob-recalc-info">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--marca-texto)' }}>
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                        <path d="M3 3v5h5"/>
                                    </svg>
                                    <div>
                                        <p className="mpob-recalc-title">¿Actualizar todos los reportes?</p>
                                        <p className="mpob-recalc-desc">
                                            {periodo ? (
                                                <>
                                                    Se recalcularán los meses de <strong>{periodo.mes} {periodo.anio} en adelante</strong> de
                                                    los indicadores que dependen de la población — los meses anteriores a esa
                                                    fecha conservan el valor que ya tenían, no se tocan.
                                                </>
                                            ) : (
                                                <>
                                                    Se recalcularán todos los meses ya generados de los indicadores
                                                    que dependen de la población <strong>({ANO_ACTIVO})</strong>,
                                                    usando los nuevos valores que acabas de subir.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="mpob-actions">
                                    <button className="mpob-btn-cancel" onClick={onClose} disabled={cargando}>
                                        Ahora no
                                    </button>
                                    <button className="mpob-btn-subir" onClick={recalcular} disabled={cargando}>
                                        {cargando
                                            ? <><div className="mpob-spinner" /> Actualizando…</>
                                            : <>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                                    <path d="M3 3v5h5"/>
                                                </svg>
                                                Actualizar todo
                                              </>
                                        }
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mpob-recalc-result">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--marca-texto)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="9 12 11 14 15 10"/>
                                    </svg>
                                    <p className="mpob-recalc-title">{resultado.total} reportes actualizados</p>
                                    {resultado.cortesExtractor.length > 0 && (
                                        <p className="mpob-recalc-title" style={{ fontSize: '0.85em', marginTop: 4 }}>
                                            + {resultado.cortesExtractor.length} corte{resultado.cortesExtractor.length > 1 ? 's' : ''} de Extractor actualizado{resultado.cortesExtractor.length > 1 ? 's' : ''}
                                            {' '}({resultado.cortesExtractor.map(c => `${c.indicador} ${c.corte}`).join(', ')})
                                        </p>
                                    )}
                                    {resultado.errores.length > 0 && (
                                        <p className="mpob-recalc-warn">
                                            ⚠ {resultado.errores.length} con errores
                                        </p>
                                    )}
                                </div>

                                <div className="mpob-actions">
                                    <button className="mpob-btn-subir" onClick={onClose}>
                                        Listo
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default ModalPoblacion;
