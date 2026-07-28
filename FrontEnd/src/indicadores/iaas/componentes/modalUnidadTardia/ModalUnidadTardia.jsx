import { useState, useEffect, useRef } from 'react';
import { completarUnidadTardia } from '../../api/IAAS';
import { UploadIcon, XIcon, FileIcon } from '../../../shared/componentes/Icons';
import ModalConfirmarPassword from '../../../../shared/componentes/modal/ModalConfirmarPassword';
import './ModalUnidadTardia.css';

const TODOS_IND = ['IAAS 01', 'IAAS 02', 'IAAS 03', 'IAAS 04', 'IAAS 05', 'IAAS 06'];
const MESES_LABEL = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
  '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
};

export default function ModalUnidadTardia({ isOpen, onClose, anio, mes, unidades, unidadesPendientes = [], indicadoresPendientes = {}, denominadoresGuardados = {}, numeradoresGuardados = {}, indicadoresInfo = [], onSuccess }) {
  const [unidad,       setUnidad]       = useState('');
  const [selInd,       setSelInd]       = useState(new Set(TODOS_IND));
  const [excelFile,    setExcelFile]    = useState(null);
  const [excelDenIAAS01, setExcelDenIAAS01] = useState(null);
  const [denoms,       setDenoms]       = useState({});
  const [dragOver,     setDragOver]     = useState(false);
  const [dragOverDen,  setDragOverDen]  = useState(false);
  const [enviando,     setEnviando]     = useState(false);
  const [error,        setError]        = useState('');
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [passError,    setPassError]    = useState('');
  const fileRef    = useRef();
  const fileDenRef = useRef();

  const denomsParaUnidad = (u) => {
    const guardados = denominadoresGuardados[u] || {};
    const d = {};
    TODOS_IND.filter(i => i !== 'IAAS 01').forEach(i => {
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
    setExcelDenIAAS01(null);
    setPassError('');
    setShowConfirm(false);
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInd = (ind) => setSelInd(prev => {
    const s = new Set(prev);
    s.has(ind) ? s.delete(ind) : s.add(ind);
    return s;
  });

  const setFile    = (f) => { if (f?.name.endsWith('.xlsx')) setExcelFile(f); };
  const setFileDen = (f) => { if (f?.name.endsWith('.xlsx')) setExcelDenIAAS01(f); };

  const indsSinNum = unidad
    ? [...selInd].filter(i => (numeradoresGuardados[unidad]?.[i]) == null)
    : [];
  const excelRequerido = indsSinNum.length > 0;

  const iaas01Sel        = selInd.has('IAAS 01');
  const iaas01SinDen     = unidad && iaas01Sel && (denominadoresGuardados[unidad]?.['IAAS 01']) == null;
  const excelDenRequerido = iaas01SinDen;

  const validarFormulario = () => {
    if (!unidad)           { setError('Selecciona una unidad.'); return false; }
    if (selInd.size === 0) { setError('Selecciona al menos un indicador.'); return false; }
    if (excelRequerido && !excelFile) {
      const faltanNom = indsSinNum.join(', ');
      setError(`Sube el Excel — falta numerador para: ${faltanNom}`);
      return false;
    }
    if (excelDenRequerido && !excelDenIAAS01) {
      setError('Sube el Excel del denominador de IAAS 01 para esta unidad.');
      return false;
    }
    const ind_02_06_sel = [...selInd].filter(i => i !== 'IAAS 01');
    const sinDen = ind_02_06_sel.filter(i => denoms[i] == null || denoms[i] === '');
    if (sinDen.length)     { setError(`Captura el denominador para: ${sinDen.join(', ')}`); return false; }
    return true;
  };

  const handleConfirmar = () => {
    if (!validarFormulario()) return;
    setError('');
    setPassError('');
    setShowConfirm(true);
  };

  const handleEnviar = async (password) => {
    if (!password) { setPassError('Ingresa tu contraseña.'); return; }
    setEnviando(true);
    setPassError('');
    try {
      const ind_02_06_sel = [...selInd].filter(i => i !== 'IAAS 01');
      const denomsEnviar  = {};
      ind_02_06_sel.forEach(i => { denomsEnviar[i] = denoms[i]; });
      const res = await completarUnidadTardia(anio, mes, unidad, [...selInd], denomsEnviar, excelFile, password, excelDenIAAS01);
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
              <p className="mut-sub">IAAS — {mesLabel} {anio}</p>
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
                      setExcelDenIAAS01(null);
                      setError('');
                    }} />
                    <span className="mut-unidad-name">{u}</span>
                    <div className="mut-unidad-chips">
                      {inds.map(ind => (
                        <span key={ind} className="mut-unidad-chip">{ind.replace('IAAS ', '')}</span>
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
                        setExcelDenIAAS01(null);
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
                <div className="mut-det-row mut-det-row--head">
                  <span className="mut-det-ind">Indicador</span>
                  <span className="mut-ind-num">Numerador (Excel)</span>
                  <span className="mut-den-head">Denominador</span>
                </div>
                {[...selInd].map(ind => {
                  const numGuardado = unidad ? numeradoresGuardados[unidad]?.[ind] : undefined;
                  const tieneNum    = numGuardado != null;
                  const esIAAS01    = ind === 'IAAS 01';
                  const info        = indicadoresInfo.find(i => i.id === ind);
                  const denGuardado = esIAAS01 && unidad ? denominadoresGuardados[unidad]?.[ind] : undefined;
                  const tieneDen    = denGuardado != null;
                  return (
                    <div key={ind} className="mut-det-row">
                      <span className="mut-det-ind">{ind}</span>
                      <span className={`mut-ind-num ${tieneNum ? '' : 'mut-ind-num--miss'}`}>
                        {tieneNum ? numGuardado : 'falta'}
                      </span>
                      {!esIAAS01 ? (
                        <input
                          type="number" min="0" className="mut-den-input"
                          placeholder={info?.subT2 ? info.subT2.slice(0, 16) : 'Denominador'}
                          value={denoms[ind] ?? ''}
                          onChange={e => setDenoms(p => ({ ...p, [ind]: e.target.value }))}
                        />
                      ) : excelDenIAAS01 ? (
                        <span className="mut-ind-den-auto" title="Se recalculará con el Excel de denominador que subiste abajo.">
                          se recalcula ({excelDenIAAS01.name.replace('.xlsx', '')})
                        </span>
                      ) : (
                        <span className="mut-ind-den-auto-wrap" title="Se autocalcula con el Excel del denominador, no se edita a mano.">
                          <span className="mut-ind-den-box">
                            {tieneDen ? denGuardado : '—'}
                          </span>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Excel */}
          <div className="mut-excel-row">
            <div className="mut-field">
              <label className="mut-label">
                Excel Numerador
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

            {/* Excel del denominador — solo para IAAS 01 */}
            {iaas01Sel && (
              <div className="mut-field">
                <label className="mut-label">
                  Excel Denominador (IAAS 01)
                  {!excelDenRequerido && <span className="mut-label-opt"> — opcional</span>}
                </label>
                <div
                  className={`mut-drop ${dragOverDen ? 'mut-drop--over' : ''} ${excelDenIAAS01 ? 'mut-drop--done' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOverDen(true); }}
                  onDragLeave={() => setDragOverDen(false)}
                  onDrop={e => { e.preventDefault(); setDragOverDen(false); setFileDen(e.dataTransfer.files[0]); }}
                  onClick={() => !excelDenIAAS01 && fileDenRef.current?.click()}
                >
                  <input ref={fileDenRef} type="file" accept=".xlsx" hidden onChange={e => setFileDen(e.target.files[0])} />
                  {excelDenIAAS01 ? (
                    <div className="mut-file-chip">
                      <FileIcon />
                      <span>{excelDenIAAS01.name.replace('.xlsx', '')}</span>
                      <button className="mut-chip-x" onClick={e => { e.stopPropagation(); setExcelDenIAAS01(null); }}><XIcon /></button>
                    </div>
                  ) : (
                    <span className="mut-drop-label"><UploadIcon /> Subir o arrastrar .xlsx</span>
                  )}
                </div>
              </div>
            )}
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

      <ModalConfirmarPassword
        isOpen={showConfirm}
        onClose={() => !enviando && setShowConfirm(false)}
        onConfirm={handleEnviar}
        enviando={enviando}
        error={passError}
        color="var(--color-tinto-gobierno)"
        confirmLabel={enviando ? 'Actualizando…' : 'Confirmar'}
        infoRows={[
          { label: 'Unidad', value: unidad },
          { label: 'Indicadores', value: [...selInd].join(', ') },
        ]}
      />
    </div>
  );
}
