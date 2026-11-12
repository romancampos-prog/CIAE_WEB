// react
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
// propios
import { IconoChevronAbajo, IconoFlechaDerecha } from '@/components/icons';

interface Props {
  columna: string;
  /** Como se muestra en el encabezado (del mapeo, ej. "NSS"); sin ella, el nombre de la columna. */
  etiqueta?: string;
  icono: ReactNode;
  /** Lo que se eligió en el filtro, en corto (va debajo del nombre); null = sin filtro. */
  resumen: string | null;
  /** El control del filtro (lista, rango o buscador). */
  children: ReactNode;
}

interface Posicion {
  top: number;
  left: number;
}

const ANCHO_PANEL = 280;

/**
 * Encabezado de columna que también filtra: al tocarlo abre un panel con el filtro de esa
 * columna, y lo elegido queda en chiquito debajo del nombre. El panel va en un portal con
 * posición fija para que no lo recorte el scroll de la tabla.
 */
export default function FiltroColumna({ columna, etiqueta, icono, resumen, children }: Props) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLFormElement>(null);
  const abierto = posicion !== null;

  const abrir = () => {
    if (abierto) { setPosicion(null); return; }
    const caja = boton.current?.getBoundingClientRect();
    if (!caja) return;
    setPosicion({ top: caja.bottom + 6, left: Math.max(8, Math.min(caja.left, window.innerWidth - ANCHO_PANEL - 8)) });
  };

  // Se cierra con clic afuera, Escape o al desplazar la página (el panel quedaría flotando fuera de su columna)
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setPosicion(null);
    const fueraDelPanel = (e: Event) => !panel.current?.contains(e.target as Node) && !boton.current?.contains(e.target as Node);
    const alClicAfuera = (e: MouseEvent) => { if (fueraDelPanel(e)) cerrar(); };
    const alDesplazar = (e: Event) => { if (fueraDelPanel(e)) cerrar(); };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={`acc-th-boton${resumen ? ' acc-th-boton--filtrado' : ''}${abierto ? ' acc-th-boton--abierto' : ''}`}
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title={`Clic para filtrar por ${columna.toLowerCase()}`}
      >
        {icono && <span className="acc-th-icono" aria-hidden="true">{icono}</span>}
        <span className="acc-th-nombre">
          <span className="acc-th-etiqueta">{etiqueta ?? columna}</span>
          {/* Sin filtro, una ayuda chiquita en el mismo lugar donde luego se ve lo elegido */}
          {resumen
            ? <span className="acc-th-filtro">{resumen}</span>
            : <span className="acc-th-filtro acc-th-filtro--ayuda">Clic para filtrar</span>}
        </span>
        <span className="acc-th-flecha" aria-hidden="true"><IconoChevronAbajo tamano={10} /></span>
      </button>

      {posicion && createPortal(
        // Un formulario para que Enter (en el buscador) también cierre el panel
        <form
          ref={panel} className="acc-columna-panel" role="dialog" aria-label={`Filtrar ${columna}`}
          style={{ top: posicion.top, left: posicion.left, width: ANCHO_PANEL }}
          onSubmit={e => { e.preventDefault(); setPosicion(null); }}
        >
          <p className="acc-columna-titulo">Filtrar {columna.toLowerCase()}</p>
          {children}
          <button type="submit" className="acc-columna-listo">
            Listo <IconoFlechaDerecha tamano={12} />
          </button>
        </form>,
        document.body,
      )}
    </>
  );
}
