import { useState, useEffect, useRef } from 'react';
import { completarUnidadTardia } from '../../api/IASS';
import { UploadIcon, XIcon, FileIcon } from '../../../shared/components/Icons';
import './ModalUnidadTardia.css';

const TODOS_IND = ['IASS 01', 'IASS 02', 'IASS 03', 'IASS 04', 'IASS 05', 'IASS 06'];
const MESES_LABEL = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
  '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
};

export default function ModalUnidadTardia({ isOpen, onClose, anio, mes, unidades, unidadesPendientes = [], indicadoresPendientes = {}, denominadoresGuardados = {}, numeradoresGuardados = {}, indicadoresInfo = [], onSuccess }) {
  const [unidad,       setUnidad]       = useState('');
  const [selInd,       setSelInd]       = useState(new Set(TODOS_IND));
  const [excelFile,    setExcelFile]    = useState(null);
  const [denoms,       setDenoms]       = useState({});
  const [dragOver,     setDragOver]     = useState(false);
  const [enviando,     setEnviando]     = useState(false);
  const [error,        setError]        = useState('');
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [password,     setPassword]     = useState('');
  const [passError,    setPassError]    = useState('');
  const fileRef    = useRef();
  const passRef    = useRef();

  const denomsParaUnidad = (u) => {
    const guardados = denominadoresGuardados[u] || {};
    const d = {};
    TODOS_IND.filter(i => i !== 'IASS 01').forEach(i => {
      d[i] = guardados[i] != null ? String(guardados[i]) : '';
    });
    return d;
  };

  useEffect(() => {
    if (!isOpen) return;
    const primerU = unidadesPendientes[0] || '';
    setUnidad(primerU);
    setSelInd(new Set());
    setDenoms(primerU ? denomsParaUnidad(primerU) : {});
    setExcelFile(null);
    setPassword('');
    setPassError('');
    setShowConfirm(false);
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (showConfirm) setTimeout(() => passRef.current?.focus(), 50);
  }, [showConfirm]);

  if (!isOpen) return null;

  const toggleInd = (ind) => setSelInd(prev => {
    const s = new Set(prev);
    s.has(ind) ? s.delete(ind) : s.add(ind);
    return s;
  });

  const setFile = (f) => { if (f?.name.endsWith('.xlsx')) setExcelFile(f); };

  const indsSinNum = unidad
    ? [...selInd].filter(i => (numeradoresGuardados[unidad]?.[i]) == null)
    : [];
  const excelRequerido = indsSinNum.length > 0;

  const validarFormulario = () => {
    if (!unidad)           { setError('Selecciona una unidad.'); return false; }
    if (selInd.size === 0) { setError('Selecciona al menos un indicador.'); return false; }
    if (excelRequerido && !excelFile) {
      const faltanNom = indsSinNum.join(', ');
      setError(`Sube el Excel — falta numerador para: ${faltanNom}`);
      return false;
    }
    const ind_02_06_sel = [...selInd].filter(i => i !== 'IASS 01');
    const sinDen = ind_02_06_sel.filter(i => denoms[i] == null || denoms[i] === '');
    if (sinDen.length)     { setError(`Captura el denominador para: ${sinDen.join(', ')}`); return false; }
    return true;
  };

  const handleConfirmar = () => {
    if (!validarFormulario()) return;
    setError('');
    setPassword('');
    setPassError('');
    setShowConfirm(true);
  };

  const handleEnviar = async () => {
    if (!password) { setPassError('Ingresa tu contraseña.'); return; }
    setEnviando(true);
    setPassError('');
    try {
      const ind_02_06_sel = [...selInd].filter(i => i !== 'IASS 01');
      const denomsEnviar  = {};
      ind_02_06_sel.forEach(i => { denomsEnviar[i] = denoms[i]; });
      const res = await completarUnidadTardia(anio, mes, unidad, [...selInd], denomsEnviar, excelFile, password);
      if (res.success) { onSuccess?.(res.data); onClose(); }
      else setPassError(res.message || 'Error al actualizar.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setPassError(detail.join('\n'));
      } else {
        setPassError(detail || 'Error al actualizar.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const mesLabel = MESES_LABEL[mes] || mes;
  const otrasUnidades = unidades.filter(u => !unidadesPendientes.includes(u));
  const indsAMostrar = unidad && indicadoresPendientes[unidad]
    ? indicadoresPendientes[unidad]
    : TODOS_IND;

  return (
    <div className="mut-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mut-modal">

        {/* Header */}
        <div className="mut-header">
          <div className="mut-header-left">
            <div className="mut-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p className="mut-title">Completar unidad tardía</p>
              <p className="mut-sub">IASS — {mesLabel} {anio}</p>
            </div>
          </div>
          <button className="mut-close" onClick={onClose}><XIcon /></button>
        </div>

        <div className="mut-body">

          {/* Selector de unidad unificado */}
          <div className="mut-field">
            <label className="mut-label">Unidad</label>
            <div className="mut-unidad-list">
              {unidadesPendientes.length > 0 && (
                <div className="mut-unidad-sep">Pendientes</div>
              )}
              {unidadesPendientes.map(u => {
                const inds = indicadoresPendientes[u] || TODOS_IND;
                return (
                  <label key={u} className={`mut-unidad-row ${unidad === u ? 'mut-unidad-row--sel' : ''}`}>
                    <input type="radio" hidden value={u} checked={unidad === u} onChange={() => {
                      setUnidad(u);
                      setSelInd(new Set());
                      setDenoms(denomsParaUnidad(u));
                      setExcelFile(null);
                      setError('');
                    }} />
                    <span className="mut-unidad-name">{u}</span>
                    <div className="mut-unidad-chips">
                      {inds.map(ind => (
                        <span key={ind} className="mut-unidad-chip">{ind.replace('IASS ', '')}</span>
                      ))}
                    </div>
                  </label>
                );
              })}
              {otrasUnidades.length > 0 && (
                <>
                  <div className="mut-unidad-sep">Todas las unidades</div>
                  {otrasUnidades.map(u => (
                    <label key={u} className={`mut-unidad-row ${unidad === u ? 'mut-unidad-row--sel' : ''}`}>
                      <input type="radio" hidden value={u} checked={unidad === u} onChange={() => {
                        setUnidad(u);
                        setSelInd(new Set());
                        setDenoms(denomsParaUnidad(u));
                        setExcelFile(null);
                        setError('');
                      }} />
                      <span className="mut-unidad-name">{u}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Paso 1: selección de indicadores con chips */}
          <div className="mut-field">
            <label className="mut-label">¿Qué indicadores vas a editar?</label>
            <div className="mut-ind-chips">
              {indsAMostrar.map(ind => (
                <label key={ind} className={`mut-ind-chip ${selInd.has(ind) ? 'mut-ind-chip--on' : ''}`}>
                  <input type="checkbox" hidden checked={selInd.has(ind)} onChange={() => toggleInd(ind)} />
                  {ind}
                </label>
              ))}
            </div>
          </div>

          {/* Paso 2: detalles de los indicadores seleccionados */}
          {selInd.size > 0 && (
            <div className="mut-field">
              <label className="mut-label">Datos actuales</label>
              <div className="mut-det-table">
                {[...selInd].map(ind => {
                  const numGuardado = unidad ? numeradoresGuardados[unidad]?.[ind] : undefined;
                  const tieneNum    = numGuardado != null;
                  const esIASS01    = ind === 'IASS 01';
                  const info        = indicadoresInfo.find(i => i.id === ind);
                  return (
                    <div key={ind} className="mut-det-row">
                      <span className="mut-det-ind">{ind}</span>
                      <span className={`mut-ind-num ${tieneNum ? 'mut-ind-num--ok' : 'mut-ind-num--miss'}`}>
                        Num: {tieneNum ? numGuardado : 'falta'}
                      </span>
                      {!esIASS01 ? (
                        <input
                          type="number" min="0" className="mut-den-input"
                          placeholder={info?.subT2 ? info.subT2.slice(0, 16) : 'Denominador'}
                          value={denoms[ind] ?? ''}
                          onChange={e => setDenoms(p => ({ ...p, [ind]: e.target.value }))}
                        />
                      ) : (
                        <span className="mut-ind-den-auto">den. en Excel</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Excel */}
          <div className="mut-field">
            <label className="mut-label">
              Excel de la unidad
              {unidad && !excelRequerido && <span className="mut-label-opt"> — opcional</span>}
            </label>
            <div
              className={`mut-drop ${dragOver ? 'mut-drop--over' : ''} ${excelFile ? 'mut-drop--done' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); }}
              onClick={() => !excelFile && fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={e => setFile(e.target.files[0])} />
              {excelFile ? (
                <div className="mut-file-chip">
                  <FileIcon />
                  <span>{excelFile.name.replace('.xlsx', '')}</span>
                  <button className="mut-chip-x" onClick={e => { e.stopPropagation(); setExcelFile(null); }}><XIcon /></button>
                </div>
              ) : (
                <span className="mut-drop-label"><UploadIcon /> Subir o arrastrar .xlsx</span>
              )}
            </div>
          </div>

          {/* Warning */}
          {unidad && (
            <div className="mut-warning">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Sobreescribirá los datos de <strong>&nbsp;{unidad}&nbsp;</strong> para {mesLabel} {anio}
            </div>
          )}

          {error && <p className="mut-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="mut-footer">
          <button className="mut-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="mut-btn-confirm" onClick={handleConfirmar}>
            Confirmar
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mini-modal de confirmación con contraseña */}
      {showConfirm && (
        <div className="mut-confirm-overlay" onClick={e => e.target === e.currentTarget && !enviando && setShowConfirm(false)}>
          <div className="mut-confirm-box">
            <div className="mut-confirm-hero">
              <div className="mut-confirm-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <p className="mut-confirm-title">Confirmar acción</p>
            </div>
            <div className="mut-confirm-body">
              <div className="mut-confirm-info-row">
                <span className="mut-confirm-info-label">Unidad</span>
                <span className="mut-confirm-info-val">{unidad}</span>
              </div>
              <div className="mut-confirm-info-row">
                <span className="mut-confirm-info-label">Indicadores</span>
                <span className="mut-confirm-info-val">{[...selInd].join(', ')}</span>
              </div>
              <div className="mut-confirm-divider" />
              <p className="mut-confirm-sub">Ingresa tu contraseña para continuar.</p>
              <input
                ref={passRef}
                type="password" className="mut-confirm-pass" placeholder="Contraseña"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnviar()}
                disabled={enviando}
              />
              {passError && <p className="mut-confirm-error">{passError}</p>}
            </div>
            <div className="mut-confirm-footer">
              <button className="mut-btn-cancel--dark" onClick={() => setShowConfirm(false)} disabled={enviando}>Cancelar</button>
              <button className="mut-btn-confirm" onClick={handleEnviar} disabled={enviando}>
                {enviando ? 'Actualizando…' : 'Confirmar'}
                {!enviando && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
