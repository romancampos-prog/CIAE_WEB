import { useState, useRef, useEffect } from 'react';

const IconoUno = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconoTodos = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 12 12 17 22 12"/>
    <polyline points="2 17 12 22 22 17"/>
  </svg>
);

/**
 * Botón único de descarga — al hacer click despliega una tarjetita con las opciones
 * disponibles (ej. "Descargar IAAS 01" / "Descargar todos los IAAS"). Se cierra al
 * elegir una opción o al hacer click fuera de la tarjetita.
 *
 * Props:
 *   disabled — bool
 *   opciones — [{ label: string, onClick: fn, multiple?: bool }]
 *              multiple=true usa el ícono de "varios" en vez del de descarga simple.
 */
const MenuDescarga = ({ disabled, opciones }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  return (
    <div className="ig-dl-menu-wrap" ref={ref}>
      <button
        className={`ig-btn-dl ig-btn-dl--icon${abierto ? ' ig-btn-dl--activo' : ''}`}
        onClick={() => setAbierto(v => !v)}
        disabled={disabled}
      >
        <IconoUno />
      </button>
      {abierto && (
        <div className="ig-dl-menu">
          <p className="ig-dl-menu-titulo">Descargar</p>
          {opciones.map((op, i) => (
            <button
              key={i}
              className="ig-dl-menu-item"
              onClick={() => { op.onClick(); setAbierto(false); }}
            >
              <span className="ig-dl-menu-icon">
                {op.multiple ? <IconoTodos /> : <IconoUno />}
              </span>
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuDescarga;
