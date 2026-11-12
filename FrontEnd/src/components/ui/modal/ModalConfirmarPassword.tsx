// react
import { useState, useEffect, useRef, type MouseEvent as EventoMouse } from 'react';
// propios
import { IconoCandado, IconoFlechaDerecha, IconoOjo, IconoOjoTachado } from '@/components/icons';
import './modalConfirmarPassword.css';

/**
 * Mini-modal reutilizable: pide contraseña para confirmar una acción sensible
 * (sobrescribir datos, regenerar un reporte ya cerrado, etc.).
 * El color del degradado se recibe por prop para adaptarse al módulo/indicador
 * que lo use, conservando siempre el mismo diseño.
 */
interface FilaInfo {
  label: string;
  value: string;
}

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onConfirm?: (password: string) => void;
  titulo?: string;
  subtitulo?: string;
  infoRows?: FilaInfo[];
  enviando?: boolean;
  error?: string;
  color?: string;
  confirmLabel?: string;
}

export default function ModalConfirmarPassword(props: Props) {
  // Se monta solo mientras está abierto: cada apertura empieza sin contraseña y en su lugar.
  return props.isOpen ? <ContenidoConfirmarPassword {...props} /> : null;
}

function ContenidoConfirmarPassword({
  onClose,
  onConfirm,
  titulo = 'Confirmar acción',
  subtitulo = 'Ingresa tu contraseña para continuar.',
  infoRows = [],
  enviando = false,
  error = '',
  color = 'rgb(105, 28, 50)',
  confirmLabel = 'Confirmar',
}: Props) {
  const [password,    setPassword]    = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [dragPos,     setDragPos]     = useState({ x: 0, y: 0 });
  const passRef   = useRef<HTMLInputElement>(null);
  const dragState = useRef({ arrastrando: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    const t = setTimeout(() => passRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const iniciarArrastre = (e: EventoMouse<HTMLDivElement>) => {
    e.preventDefault();
    dragState.current = { arrastrando: true, startX: e.clientX, startY: e.clientY, origX: dragPos.x, origY: dragPos.y };
    window.addEventListener('mousemove', moverArrastre);
    window.addEventListener('mouseup', terminarArrastre);
  };
  const moverArrastre = (e: MouseEvent) => {
    if (!dragState.current.arrastrando) return;
    const { startX, startY, origX, origY } = dragState.current;
    setDragPos({ x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) });
  };
  const terminarArrastre = () => {
    dragState.current.arrastrando = false;
    window.removeEventListener('mousemove', moverArrastre);
    window.removeEventListener('mouseup', terminarArrastre);
  };


  const confirmar = () => onConfirm?.(password);

  return (
    <div className="mcp-overlay" onClick={e => e.target === e.currentTarget && !enviando && onClose?.()}>
      <div className="mcp-box" style={{ '--mcp-color': color, transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}>
        <div className="mcp-hero" onMouseDown={iniciarArrastre}>
          <div className="mcp-icon-wrap">
            <IconoCandado tamano={20} />
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
              {verPassword ? <IconoOjoTachado /> : <IconoOjo />}
            </button>
          </div>
          {error && <p className="mcp-error">{error}</p>}
        </div>
        <div className="mcp-footer">
          <button className="mcp-btn-cancel" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button className="mcp-btn-confirm" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Procesando…' : confirmLabel}
            {!enviando && (
              <IconoFlechaDerecha tamano={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
