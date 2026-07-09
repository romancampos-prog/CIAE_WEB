import { COLOR_SEMAFORO } from '@indShared/constantes/semaforo';

export default function ChartTooltip({ active, payload, label, indSel }) {
  if (!active || !payload?.length) return null;
  const d     = payload[0]?.payload ?? {};
  const color = COLOR_SEMAFORO[d.color] ?? '#aaa';
  return (
    <div className="ia-chart-tooltip">
      <p className="ia-chart-tooltip-mes">{label}</p>
      <div className="ia-chart-tooltip-row" style={{ marginBottom: '6px' }}>
        <span className="ia-chart-tooltip-dot" style={{ background: color }} />
        <span className="ia-chart-tooltip-ind">{indSel}</span>
        <strong>{d.tasa != null ? Number(d.tasa).toFixed(2) : '—'}</strong>
      </div>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', gap: '10px' }}>
        <span>Num: <strong style={{ color: '#374151' }}>{d.numerador ?? '—'}</strong></span>
        <span>Den: <strong style={{ color: '#374151' }}>{d.denominador ?? '—'}</strong></span>
      </div>
    </div>
  );
}
