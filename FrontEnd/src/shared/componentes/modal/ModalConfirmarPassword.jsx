import { useState, useEffect, useRef } from 'react';
import './modalConfirmarPassword.css';

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/**
 * Mini-modal reutilizable: pide contraseña para confirmar una acción sensible
 * (sobrescribir datos, regenerar un reporte ya cerrado, etc.).
 * El color del degradado se recibe por prop para adaptarse al módulo/indicador
 * que lo use, conservando siempre el mismo diseño.
 */
export default function ModalConfirmarPassword({
  isOpen,
  onClose,
  onConfirm,
  titulo = 'Confirmar acción',
  subtitulo = 'Ingresa tu contraseña para continuar.',
  infoRows = [],
  enviando = false,
  error = '',
  color = 'rgb(105, 28, 50)',
  confirmLabel = 'Confirmar',
}) {
  const [password,    setPassword]    = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [dragPos,     setDragPos]     = useState({ x: 0, y: 0 });
  const passRef   = useRef();
  const dragState = useRef({ arrastrando: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setVerPassword(false);
    setDragPos({ x: 0, y: 0 });
    setTimeout(() => passRef.current?.focus(), 50);
  }, [isOpen]);

  const iniciarArrastre = (e) => {
    e.preventDefault();
    dragState.current = { arrastrando: true, startX: e.clientX, startY: e.clientY, origX: dragPos.x, origY: dragPos.y };
    window.addEventListener('mousemove', moverArrastre);
    window.addEventListener('mouseup', terminarArrastre);
  };
  const moverArrastre = (e) => {
    if (!dragState.current.arrastrando) return;
    const { startX, startY, origX, origY } = dragState.current;
    setDragPos({ x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) });
  };
  const terminarArrastre = () => {
    dragState.current.arrastrando = false;
    window.removeEventListener('mousemove', moverArrastre);
    window.removeEventListener('mouseup', terminarArrastre);
  };

  if (!isOpen) return null;

  const confirmar = () => onConfirm?.(password);

  return (
    <div className="mcp-overlay" onClick={e => e.target === e.currentTarget && !enviando && onClose?.()}>
      <div className="mcp-box" style={{ '--mcp-color': color, transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}>
        <div className="mcp-hero" onMouseDown={iniciarArrastre}>
          <div className="mcp-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p className="mcp-title">{titulo}</p>
        </div>
        <div className="mcp-body">
          {infoRows.map(({ label, value }) => (
            <div className="mcp-info-row" key={label}>
              <span className="mcp-info-label">{label}</span>
              <span className="mcp-info-val">{value}</span>
            </div>
          ))}
          {infoRows.length > 0 && <div className="mcp-divider" />}
          <p className="mcp-sub">{subtitulo}</p>
          <div className="mcp-pass-wrap">
            <input
              ref={passRef}
              type={verPassword ? 'text' : 'password'} className="mcp-pass" placeholder="Contraseña"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmar()}
              disabled={enviando}
            />
            <button
              type="button" className="mcp-pass-toggle"
              onClick={() => setVerPassword(v => !v)}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              {verPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {error && <p className="mcp-error">{error}</p>}
        </div>
        <div className="mcp-footer">
          <button className="mcp-btn-cancel" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button className="mcp-btn-confirm" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Procesando…' : confirmLabel}
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
