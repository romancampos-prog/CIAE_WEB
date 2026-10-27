// react
import type { ReactNode } from 'react';

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
