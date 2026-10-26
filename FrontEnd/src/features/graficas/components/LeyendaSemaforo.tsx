// react
import type { ReactNode } from 'react';
// propios
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import type { Desempeno } from '@/features/graficas/tipos';

interface Props {
  niveles?: Desempeno[];
  conGris: boolean;
  filtro?: Desempeno | null;
  onFiltrar?: (nivel: Desempeno | null) => void;
  children?: ReactNode;
}

/**
 * Leyenda del semáforo con SOLO los niveles que tiene el indicador (perfil.niveles del
 * backend). "Sin dato" aparece solo si hay alguna unidad en Gris. Si se pasa onFiltrar,
 * cada nivel es un botón que deja ver solo esas unidades.
 *
 * Props:
 *   niveles    — ["Esperado", "Medio", "Bajo"] o ["Esperado", "Bajo"]
 *   conGris    — true si hay unidades sin dato
 *   filtro     — nivel filtrado (o null)
 *   onFiltrar  — fn(nivel | null), opcional
 *   children   — entradas extra de la leyenda (meta, estatal...)
 */
const LeyendaSemaforo = ({ niveles = [], conGris, filtro, onFiltrar, children }: Props) => {
  const estados: Desempeno[] = conGris ? [...niveles, 'Gris'] : niveles;

  return (
    <ul className="gi-leyenda" aria-label="Leyenda">
      {estados.map(estado => {
        const texto = estado === 'Gris' ? 'Sin dato' : estado;
        const muestra = <span className="gi-leyenda-muestra" style={{ '--status': COLOR_SEMAFORO[estado] }} />;
        return (
          <li key={estado}>
            {onFiltrar ? (
              <button
                type="button"
                className={`gi-leyenda-boton${filtro === estado ? ' gi-leyenda-boton--activo' : ''}`}
                aria-pressed={filtro === estado}
                onClick={() => onFiltrar(filtro === estado ? null : estado)}
              >
                {muestra}{texto}
              </button>
            ) : <>{muestra}{texto}</>}
          </li>
        );
      })}
      {children}
    </ul>
  );
};

export default LeyendaSemaforo;
