// propios
import type { PerfilIndicador } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoValor, ordenarPorResultado } from '@/features/graficas/utils/datosGrafica';

interface Props {
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  onVerUnidad: (unidad: string) => void;
}

/**
 * En el panel de Comparar: la unidad con mejor resultado y la del otro extremo del mes según el tipo de meta ("mas" o
 * "menos"); al tocar una se abre su tendencia. En metas de rango no hay mejor ni peor.
 */
const MejorPeorUnidad = ({ filas, perfil, onVerUnidad }: Props) => {
  if (perfil?.tipoMeta !== 'mas' && perfil?.tipoMeta !== 'menos') return null;
  const conDato = ordenarPorResultado(filas, perfil.tipoMeta).filter(f => f.resultado != null);
  if (conDato.length < 2) return null;
  // La del otro extremo se nombra por su número: el más bajo (más es mejor) o el más alto (menos es mejor)
  const extremos = [
    { titulo: 'Unidad con mejor resultado', fila: conDato[0] },
    { titulo: perfil.tipoMeta === 'mas' ? 'Unidad con resultado más bajo' : 'Unidad con resultado más alto', fila: conDato[conDato.length - 1] },
  ];

  return (
    <section className="gi-panel-bloque">
      <p className="gi-panel-titulo">Unidades del mes</p>
      <ul className="gi-panel-extremos">
        {extremos.map(({ titulo, fila }) => (
          <li key={titulo}>
            <button
              type="button"
              className="gi-panel-extremo"
              style={{ '--status': COLOR_SEMAFORO[fila.desempeno] }}
              onClick={() => onVerUnidad(fila.unidad)}
              title="Ver su tendencia"
            >
              <small>{titulo}</small>
              <span className="gi-panel-extremo-nombre">{fila.unidad}</span>
              <strong>
                <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[fila.desempeno] }} />
                {formatoValor(fila.resultado, perfil.unidadMedida)}
              </strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MejorPeorUnidad;
