import { useState, useEffect, useRef } from 'react';
import { completarUnidadTardia } from '../../api/in_ass';
import { UploadIcon, XIcon, FileIcon } from '../../../shared/components/Icons';
import './ModalUnidadTardia.css';

const TODOS_IND = ['IN_ASS 01', 'IN_ASS 02', 'IN_ASS 03', 'IN_ASS 04', 'IN_ASS 05', 'IN_ASS 06'];
const MESES_LABEL = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
  '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
};

export default function ModalUnidadTardia({ isOpen, onClose, anio, mes, unidades, unidadesPendientes = [], indicadoresPendientes = {}, denominadoresGuardados = {}, indicadoresInfo = [], onSuccess }) {
  const [unidad,    setUnidad]    = useState('');
  const [selInd,    setSelInd]    = useState(new Set(TODOS_IND));
  const [excelFile, setExcelFile] = useState(null);
  const [denoms,    setDenoms]    = useState({});
  const [password,  setPassword]  = useState('');
  const [dragOver,  setDragOver]  = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!unidad) { setDenoms({}); return; }
    const guardados = denominadoresGuardados[unidad] || {};
    const d = {};
    TODOS_IND.filter(i => i !== 'IN_ASS 01').forEach(i => {
      d[i] = guardados[i] != null ? String(guardados[i]) : '';
    });
    setDenoms(d);
  }, [unidad, denominadoresGuardados]);

  useEffect(() => {
    if (!isOpen) return;
    setUnidad(unidadesPendientes[0] || '');
    setSelInd(new Set(TODOS_IND));
    setExcelFile(null);
    setPassword('');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInd = (ind) => setSelInd(prev => {
    const s = new Set(prev);
    s.has(ind) ? s.delete(ind) : s.add(ind);
    return s;
  });

  const setFile = (f) => { if (f?.name.endsWith('.xlsx')) setExcelFile(f); };

  const handleConfirmar = async () => {
    if (!unidad)    { setError('Selecciona una unidad.'); return; }
    if (!excelFile) { setError('Sube el Excel de la unidad.'); return; }
    if (!password)  { setError('Ingresa tu contraseña.'); return; }
    if (selInd.size === 0) { setError('Selecciona al menos un indicador.'); return; }
    const ind_02_06_sel = [...selInd].filter(i => i !== 'IN_ASS 01');
    const sinDen = ind_02_06_sel.filter(i => !denoms[i]);
    if (sinDen.length) { setError(`Captura el denominador para: ${sinDen.join(', ')}`); return; }

    setError('');
    setEnviando(true);
    try {
      const denomsEnviar = {};
      ind_02_06_sel.forEach(i => { denomsEnviar[i] = denoms[i]; });
      const res = await completarUnidadTardia(anio, mes, unidad, [...selInd], denomsEnviar, excelFile, password);
      if (res.success) { onSuccess?.(res.data); onClose(); }
      else setError(res.message || 'Error al actualizar.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al actualizar.');
    } finally {
      setEnviando(false);
    }
  };

  const ind_02_06_sel = [...selInd].filter(i => i !== 'IN_ASS 01');
  const mesLabel = MESES_LABEL[mes] || mes;
  const otrasUnidades = unidades.filter(u => !unidadesPendientes.includes(u));

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
                    <input type="radio" hidden value={u} checked={unidad === u} onChange={() => setUnidad(u)} />
                    <span className="mut-unidad-name">{u}</span>
                    <div className="mut-unidad-chips">
                      {inds.map(ind => (
                        <span key={ind} className="mut-unidad-chip">{ind.replace('IN_ASS ', '')}</span>
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
                      <input type="radio" hidden value={u} checked={unidad === u} onChange={() => setUnidad(u)} />
                      <span className="mut-unidad-name">{u}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Indicadores */}
          <div className="mut-field">
            <label className="mut-label">Indicadores a actualizar</label>
            <div className="mut-ind-grid">
              {TODOS_IND.map(ind => (
                <label key={ind} className={`mut-ind-chip ${selInd.has(ind) ? 'mut-ind-chip--on' : ''}`}>
                  <input type="checkbox" hidden checked={selInd.has(ind)} onChange={() => toggleInd(ind)} />
                  {ind}
                </label>
              ))}
            </div>
          </div>

          {/* Excel */}
          <div className="mut-field">
            <label className="mut-label">Excel de la unidad</label>
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

          {/* Denominadores */}
          {ind_02_06_sel.length > 0 && (
            <div className="mut-field">
              <label className="mut-label">Denominadores</label>
              <div className="mut-den-grid">
                {ind_02_06_sel.map(ind => {
                  const info = indicadoresInfo.find(i => i.id === ind);
                  return (
                    <div key={ind} className="mut-den-row">
                      <span className="mut-den-label">
                        <span className="mut-den-ind">{ind}</span>
                        {info?.subT2 && <small>{info.subT2}</small>}
                      </span>
                      <input
                        type="number" min="0" className="mut-den-input"
                        placeholder="0"
                        value={denoms[ind] ?? ''}
                        onChange={e => setDenoms(p => ({ ...p, [ind]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Contraseña */}
          <div className="mut-field">
            <label className="mut-label">Contraseña</label>
            <input
              type="password" className="mut-input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
            />
          </div>

          {error && <p className="mut-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="mut-footer">
          <button className="mut-btn-cancel" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button className="mut-btn-confirm" onClick={handleConfirmar} disabled={enviando}>
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
  );
}
