import { COLOR_SEMAFORO } from '../../../shared/constantes/semaforo';

export default function ChartTooltip({ active, payload, label, indSel }) {
  if (!active || !payload?.length) return null;
  const d          = payload[0]?.payload ?? {};
  const color      = COLOR_SEMAFORO[d.color] ?? COLOR_SEMAFORO.Gris;
  const sinTasa    = d.color === 'Gris' || d.tasa == null;

  return (
    <div className="ia-chart-tooltip" style={{ borderLeftColor: color }}>
      <p className="ia-chart-tooltip-mes">{label}</p>
      <div className="ia-chart-tooltip-row">
        <span className="ia-chart-tooltip-dot" style={{ background: color }} />
        <span className="ia-chart-tooltip-ind">{indSel}</span>
        {sinTasa
          ? <span className="ia-chart-tooltip-sindato">Sin dato</span>
          : <strong>{Number(d.tasa).toFixed(2)}</strong>}
      </div>
      {/* Num/Den se muestran siempre, aunque sea Gris — así se ve cuál de los dos
          sí llegó y cuál falta, en vez de esconder todo detrás de "Sin dato". */}
      <div className="ia-chart-tooltip-numden">
        <span>Num <strong>{d.numerador ?? '—'}</strong></span>
        <span>Den <strong>{d.denominador ?? '—'}</strong></span>
      </div>
    </div>
  );
}
