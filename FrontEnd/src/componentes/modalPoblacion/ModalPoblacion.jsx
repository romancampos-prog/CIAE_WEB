import { useState } from 'react';
import './ModalPoblacion.css';
import { subirArchivoPoblacion, recalcularPoblacion } from '../../api/poblacion';

const ANO_ACTIVO = '2026';

const ModalPoblacion = ({ onClose }) => {
    const [archivo,        setArchivo]        = useState(null);
    const [dragOver,       setDragOver]       = useState(false);
    const [cargando,       setCargando]       = useState(false);
    const [mensaje,        setMensaje]        = useState(null);   // { tipo, texto }
    const [fase,           setFase]           = useState('upload'); // 'upload' | 'recalcular'
    const [resultado,      setResultado]      = useState(null);   // { total, recalculados, errores }
    const [advertencias,   setAdvertencias]   = useState(null);   // { no_encontradas, extras }

    const manejarArchivo = (file) => {
        if (!file) return;
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setMensaje({ tipo: 'error', texto: 'Solo se aceptan archivos Excel (.xlsx, .xls)' });
            return;
        }
        setMensaje(null);
        setArchivo(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        manejarArchivo(e.dataTransfer.files[0]);
    };

    const onSubir = async () => {
        if (!archivo) return;
        setCargando(true);
        setMensaje(null);
        try {
            const data = await subirArchivoPoblacion(archivo);
            const u    = data?.data?.unidades ?? '';
            const nf   = data?.data?.no_encontradas ?? [];
            const ex   = data?.data?.extras ?? [];
            setMensaje({ tipo: 'exito', texto: `${u ? `${u} unidades` : 'Archivo'} procesado correctamente.` });
            setAdvertencias(nf.length || ex.length ? { no_encontradas: nf, extras: ex } : null);
            setArchivo(null);
            setFase('recalcular');
        } catch (err) {
            const detalle = err?.response?.data?.detail || 'Error al subir el archivo.';
            setMensaje({ tipo: 'error', texto: detalle });
        } finally {
            setCargando(false);
        }
    };

    const onRecalcular = async () => {
        setCargando(true);
        setResultado(null);
        try {
            const data = await recalcularPoblacion(ANO_ACTIVO);
            setResultado({ total: data.total, errores: data.errores ?? [] });
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al recalcular los reportes.' });
        } finally {
            setCargando(false);
        }
    };

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
                        {!archivo ? (
                            <div
                                className={`mpob-drop-area ${dragOver ? 'mpob-drag-over' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={e => manejarArchivo(e.target.files[0])}
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
                                <button className="mpob-btn-quitar" onClick={() => setArchivo(null)}>✕</button>
                            </div>
                        )}

                        {mensaje && <div className={`mpob-msg ${mensaje.tipo}`}>{mensaje.texto}</div>}

                        <div className="mpob-actions">
                            <button className="mpob-btn-cancel" onClick={onClose} disabled={cargando}>
                                Cancelar
                            </button>
                            <button className="mpob-btn-subir" onClick={onSubir} disabled={!archivo || cargando}>
                                {cargando ? <><div className="mpob-spinner" /> Subiendo…</> : 'Subir archivo'}
                            </button>
                        </div>
                    </>
                )}

                {/* ── FASE 2: recalcular reportes ── */}
                {fase === 'recalcular' && (
                    <>
                        {mensaje && <div className={`mpob-msg ${mensaje.tipo}`}>{mensaje.texto}</div>}

                        {advertencias && (
                            <div className="mpob-advertencias">
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
                            </div>
                        )}

                        {!resultado ? (
                            <>
                                <div className="mpob-recalc-info">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0b5445' }}>
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                        <path d="M3 3v5h5"/>
                                    </svg>
                                    <div>
                                        <p className="mpob-recalc-title">¿Actualizar todos los reportes?</p>
                                        <p className="mpob-recalc-desc">
                                            Se recalcularán todos los meses ya generados de los indicadores
                                            que dependen de la población <strong>({ANO_ACTIVO})</strong>,
                                            usando los nuevos valores que acabas de subir.
                                        </p>
                                    </div>
                                </div>

                                <div className="mpob-actions">
                                    <button className="mpob-btn-cancel" onClick={onClose} disabled={cargando}>
                                        Ahora no
                                    </button>
                                    <button className="mpob-btn-subir" onClick={onRecalcular} disabled={cargando}>
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
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0b5445" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="9 12 11 14 15 10"/>
                                    </svg>
                                    <p className="mpob-recalc-title">{resultado.total} reportes actualizados</p>
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
