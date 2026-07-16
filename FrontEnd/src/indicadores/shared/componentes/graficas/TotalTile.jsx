import { COLOR_SEMAFORO } from '../../constantes/semaforo';

/**
 * Tarjeta KPI para el TOTAL de un mes — se muestra aparte del desglose por unidad
 * porque una sola barra con su propia escala no comunica nada (nada con qué comparar);
 * como valor agregado, es un stat tile, no una barra más del mismo eje.
 *
 * Props:
 *   total     — { unidad, tasa, numerador, denominador, color } | null
 *   indColor  — string — color del indicador activo
 */
const TotalTile = ({ total, indColor }) => {
  if (!total) return null;
  const dotColor = COLOR_SEMAFORO[total.color] ?? '#94a3b8';

  return (
    <div className="ig-total-tile" style={{ '--ic': indColor, '--status': dotColor }}>
      <p className="ig-total-tile-label">{total.unidad}</p>
      <p className="ig-total-tile-value">{Number(total.tasa ?? 0).toFixed(2)}</p>
      <span className="ig-total-tile-status">
        <span className="ig-total-tile-dot" style={{ background: dotColor }} />
        {total.color ?? 'Sin datos'}
      </span>
      <p className="ig-total-tile-meta">
        Num: <strong>{total.numerador ?? 0}</strong> · Den: <strong>{total.denominador ?? 0}</strong>
      </p>
    </div>
  );
};

export default TotalTile;
