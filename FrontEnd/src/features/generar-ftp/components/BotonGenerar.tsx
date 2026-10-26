// react
import type { ReactNode } from 'react';

export const IcoDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export const IcoAll = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8m-4-4v4"/>
    <path d="M6 8h.01M10 8h8M6 12h.01M10 12h8"/>
  </svg>
);

interface Props {
  color: string;
  habilitado: boolean;
  generando: boolean;
  textoGenerando: string;
  onClick: () => void;
  children: ReactNode;
}

/** El botón grande de generar, con el color de la familia. */
const BotonGenerar = ({ color, habilitado, generando, textoGenerando, onClick, children }: Props) => (
  <button
    className={`cfg-btn-generate ind-gen-btn ${!habilitado ? 'cfg-btn-generate--disabled' : ''}`}
    style={{ '--gen-color': color }}
    disabled={!habilitado}
    onClick={onClick}
  >
    <span className="cfg-btn-shimmer" />
    <span className="cfg-btn-content">
      {generando ? <><span className="cfg-spinner" /> {textoGenerando}</> : children}
    </span>
  </button>
);

export default BotonGenerar;
