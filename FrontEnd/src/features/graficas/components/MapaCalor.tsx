// propios
import type { Desempeno, EstadisticasGrafica } from '@/types/api/indicadores/reportes';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoNumero, mesCorto as corto } from '@/features/graficas/utils/datosGrafica';
import './estadisticas.css';

// En las celdas cabe poco: un decimal.
const formato = (valor: number | null | undefined) => formatoNumero(valor, 1);

interface Props {
  mapa: EstadisticasGrafica['mapaCalor'] | undefined;
  unidadSel: string;
  mesActivo: string;
  onSelectUnidad?: (unidad: string) => void;
  niveles?: Desempeno[];
  /** El mes del semanal que aún no cierra: su encabezado dice la semana ("Sep S4"). */
  mesParcial?: string | null;
  semana?: number;
}

/**
 * Mapa de calor unidad × mes con el color del semáforo de cada celda. El valor va
 * escrito en la celda y el estado en el tooltip, para que no dependa solo del color.
 * Los datos vienen armados del backend (estadisticas.mapaCalor).
 *
 * Props:
 *   mapa             — { meses: string[], filas: [{ unidad, valores: [{resultado, desempeno}|null] }] }
 *   unidadSel        — unidad resaltada
 *   mesActivo        — mes resaltado ("Julio")
 *   onSelectUnidad   — fn(unidad) al dar clic en una fila
 *   mesParcial, semana — el mes parcial y su semana
 *   niveles          — niveles del semáforo de este indicador (perfil.niveles): la leyenda solo muestra esos
 */
const MapaCalor = ({ mapa, unidadSel, mesActivo, onSelectUnidad, niveles = ['Esperado', 'Medio', 'Bajo'], mesParcial, semana }: Props) => {
  if (!mapa?.filas?.length) return null;
  const { meses, filas } = mapa;
  const conGris = filas.some(f => f.valores.some(v => (v?.desempeno ?? 'Gris') === 'Gris'));
  const estados: Desempeno[] = conGris ? [...niveles, 'Gris'] : niveles;

  return (
    <section className="ige-tarjeta ige-mapa">
      <header className="ige-tarjeta-header">
        <h2 className="ige-tarjeta-titulo">Mapa de calor por unidad</h2>
        <p className="ige-tarjeta-sub">Resultado de cada unidad en cada mes, con el color de su semáforo. Da clic en una unidad para ver su tendencia.</p>
      </header>

      <div className="ige-mapa-scroll">
        <table className="ige-mapa-tabla">
          <thead>
            <tr>
              <th scope="col" className="ige-mapa-unidad">Unidad</th>
              {meses.map(mes => (
                <th key={mes} scope="col" className={mes === mesActivo ? 'ige-mapa-mes--activo' : undefined}>{corto(mes)}{mes === mesParcial && semana ? ` S${semana}` : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ unidad, valores }) => (
              <tr
                key={unidad}
                className={`ige-mapa-fila${unidad === unidadSel ? ' ige-mapa-fila--activa' : ''}`}
              >
                <th scope="row" className="ige-mapa-unidad">
                  <button type="button" className="ige-mapa-boton" onClick={() => onSelectUnidad?.(unidad)}>{unidad}</button>
                </th>
                {valores.map((celda, i) => {
                  const estado = celda?.desempeno ?? 'Gris';
                  const texto = celda?.resultado == null ? 'sin dato' : `${formato(celda.resultado)} (${estado})`;
                  return (
                    <td
                      key={meses[i]}
                      className={`ige-mapa-celda ige-mapa-celda--${estado.toLowerCase()}${meses[i] === mesActivo ? ' ige-mapa-celda--mes' : ''}`}
                      style={{ '--status': COLOR_SEMAFORO[estado] }}
                      title={`${unidad} · ${meses[i]}: ${texto}`}
                    >
                      {formato(celda?.resultado)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="ige-leyenda" aria-label="Leyenda del semáforo">
        {estados.map(estado => (
          <li key={estado}>
            <span className="ige-leyenda-muestra" style={{ '--status': COLOR_SEMAFORO[estado] }} />
            {estado === 'Gris' ? 'Sin dato' : estado}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MapaCalor;
