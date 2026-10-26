// react
import type { ReactNode } from 'react';
// propios
import type { VistaGrafica } from '@/features/graficas/tipos';

// Mismos íconos que tenían los botones "Por unidad" / "Por mes" de la gráfica anterior.
const PESTANAS: { id: VistaGrafica; texto: string; icono: ReactNode }[] = [
  { id: 'tendencia', texto: 'Tendencia',         icono: <><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></> },
  { id: 'comparar',  texto: 'Comparar unidades', icono: <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="15" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/></> },
  { id: 'mapa',      texto: 'Mapa del año',      icono: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
];

/**
 * Pestañas de la vista de la gráfica, en forma de píldoras teñidas con el color de la familia.
 *
 * Props:
 *   actual    — id de la pestaña activa
 *   onCambiar — fn(id)
 */
const PestanasGrafica = ({ actual, onCambiar }: { actual: VistaGrafica; onCambiar: (vista: VistaGrafica) => void }) => (
  <div className="gi-pestanas" role="tablist" aria-label="Vista de la gráfica">
    {PESTANAS.map(({ id, texto, icono }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={actual === id}
        className={`gi-pestana${actual === id ? ' gi-pestana--activa' : ''}`}
        onClick={() => onCambiar(id)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icono}
        </svg>
        {texto}
      </button>
    ))}
  </div>
);

export default PestanasGrafica;
