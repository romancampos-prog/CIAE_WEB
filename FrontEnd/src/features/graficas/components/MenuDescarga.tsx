// react
import { useState, useRef, useEffect } from 'react';
// propios
import { IconoCapas, IconoDescargar } from '@/components/icons';

interface OpcionDescarga {
  label: string;
  onClick: () => void;
  /** Usa el ícono de "varios" en vez del de descarga simple. */
  multiple?: boolean;
}

interface Props {
  disabled: boolean;
  cargando?: boolean;
  opciones: OpcionDescarga[];
}

/**
 * Botón único de descarga — al hacer click despliega una tarjetita con las opciones
 * disponibles (ej. "Descargar IAAS 01" / "Descargar todos los IAAS"). Se cierra al
 * elegir una opción o al hacer click fuera de la tarjetita.
 *
 * Props:
 *   disabled — bool (deshabilita el botón; si no se pasa `cargando`, también se usa
 *              para decidir si se muestra el spinner)
 *   cargando — bool opcional. Mientras es true, el ícono se cambia por un spinner
 *              para que quede claro que el archivo se está generando (algunos tardan
 *              varios segundos) y no parezca que el botón no respondió.
 *   opciones — [{ label: string, onClick: fn, multiple?: bool }]
 *              multiple=true usa el ícono de "varios" en vez del de descarga simple.
 */
const MenuDescarga = ({ disabled, cargando, opciones }: Props) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mostrandoSpinner = cargando ?? disabled;

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
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
        title={mostrandoSpinner ? 'Generando archivo…' : 'Descargar'}
      >
        {mostrandoSpinner ? <span className="ig-btn-dl-spinner" /> : <IconoDescargar tamano={13} />}
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
                {op.multiple ? <IconoCapas /> : <IconoDescargar tamano={13} />}
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
