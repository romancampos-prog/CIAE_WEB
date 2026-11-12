// react
import type { ComponentType } from 'react';
// propios
import type { VistaGrafica } from '@/types/pantallas/graficas';
import { IconoCalendario, IconoListaBarras, IconoTendencia, type PropsIcono } from '@/components/icons';

// Mismos íconos que tenían los botones "Por unidad" / "Por mes" de la gráfica anterior.
const PESTANAS: { id: VistaGrafica; texto: string; Icono: ComponentType<PropsIcono> }[] = [
  { id: 'tendencia', texto: 'Tendencia',         Icono: IconoTendencia },
  { id: 'comparar',  texto: 'Comparar unidades', Icono: IconoListaBarras },
  { id: 'mapa',      texto: 'Mapa del año',      Icono: IconoCalendario },
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
    {PESTANAS.map(({ id, texto, Icono }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={actual === id}
        className={`gi-pestana${actual === id ? ' gi-pestana--activa' : ''}`}
        onClick={() => onCambiar(id)}
      >
        <Icono tamano={12} strokeWidth="2.5" aria-hidden />
        {texto}
      </button>
    ))}
  </div>
);

export default PestanasGrafica;
