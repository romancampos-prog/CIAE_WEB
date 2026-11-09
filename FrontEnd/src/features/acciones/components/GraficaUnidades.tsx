// propios
import type { ConteoValor } from '@/types/api/epidemiologia/ftp';
import { IconoBarras, IconoGuion } from '@/components/icons';

interface Props {
  /** Registros por unidad (del backend), de mayor a menor. */
  conteos: ConteoValor[];
  activas: string[];
  /** Un clic agrega la unidad al filtro de la tabla (otro clic la quita). */
  onElegir: (unidad: string) => void;
}

/**
 * Abajo de la tabla, a lo ancho: cuántos registros trae cada unidad, como gráfica de barras de
 * mayor a menor repartida en columnas. Cada barra filtra la tabla por esa unidad.
 */
export default function GraficaUnidades({ conteos, activas, onElegir }: Props) {
  const maximo = Math.max(1, ...conteos.map(c => c.cantidad));

  return (
    <section className="acc-tarjeta acc-grafica-unidades" aria-label="Registros por unidad">
      <h3 className="acc-tarjeta-titulo">
        <span className="acc-titulo-icono" aria-hidden="true"><IconoBarras tamano={14} /></span>
        Registros por unidad
        <span className="acc-grafica-unidades-nota">{conteos.filter(c => c.cantidad > 0).length} unidades con registros · toca una para filtrar la tabla</span>
      </h3>
      <ol className="acc-grafica-unidades-lista">
        {conteos.map(({ valor, cantidad }) => {
          const unidad = valor ?? '(vacío)';
          const elegida = activas.includes(unidad);
          return (
            <li key={unidad}>
              <button
                type="button"
                className={`acc-grafica-unidad${elegida ? ' acc-grafica-unidad--activa' : ''}${cantidad === 0 ? ' acc-grafica-unidad--sin' : ''}`}
                onClick={() => onElegir(unidad)}
                aria-pressed={elegida}
                title={`${unidad}: ${cantidad === 0 ? 'se leyó, sin resultados' : `${cantidad} registros`}`}
              >
                <span className="acc-grafica-unidad-nombre">{unidad}</span>
                <span className="acc-grafica-unidad-pista">
                  <span className="acc-grafica-unidad-barra" style={{ width: `${(cantidad / maximo) * 100}%` }} />
                </span>
                <span className="acc-grafica-unidad-cantidad">{cantidad === 0 ? <IconoGuion tamano={14} aria-label="Sin resultados" /> : cantidad}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
