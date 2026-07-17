import { COLOR_SEMAFORO } from '../../constantes/semaforo';

const ORDEN = ['Verde', 'Amarillo', 'Rojo', 'Gris'];

/**
 * Franja de KPIs por color de semáforo — "Unidades" aparece una sola vez a un lado
 * (no repetido por color), cada color es un segmento angosto con su punto de color.
 * Clickeable: seleccionar un color filtra la vista a solo esas unidades; click de
 * nuevo sobre el mismo color, o sobre la palabra "Unidades", quita el filtro.
 *
 * Props:
 *   conteo        — { Verde, Amarillo, Rojo, Gris } | null
 *   colorActivo   — color actualmente filtrado, o null
 *   onSelectColor — fn(color) — se llama con el color clickeado (o null si se repite o se limpia)
 */
const CumplimientoTile = ({ conteo, colorActivo, onSelectColor }) => {
  if (!conteo) return null;
  const total = ORDEN.reduce((s, k) => s + (conteo[k] ?? 0), 0);
  if (total === 0) return null;

  const clickeable = typeof onSelectColor === 'function';

  return (
    <div className="ig-kpi-strip">
      <span
        className={`ig-kpi-titulo${clickeable ? ' ig-kpi-titulo--clickeable' : ''}`}
        onClick={clickeable ? () => onSelectColor(null) : undefined}
        title={clickeable ? 'Quitar filtro' : undefined}
      >
        Unidades
      </span>
      {ORDEN.map(color => {
        const n   = conteo[color] ?? 0;
        const pct = Math.round((n / total) * 100);
        const activo = colorActivo === color;
        return (
          <div
            key={color}
            className={`ig-kpi-item${clickeable ? ' ig-kpi-item--clickeable' : ''}${activo ? ' ig-kpi-item--activo' : ''}`}
            style={{ '--status': COLOR_SEMAFORO[color] }}
            onClick={clickeable ? () => onSelectColor(activo ? null : color) : undefined}
          >
            <span className="ig-kpi-dot" />
            <span className="ig-kpi-num">{n}</span>
            <span className="ig-kpi-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default CumplimientoTile;
