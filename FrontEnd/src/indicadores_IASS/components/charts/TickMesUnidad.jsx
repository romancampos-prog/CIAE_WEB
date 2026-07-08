import { HGS_COLOR } from '../../constants/colores';

export default function TickMesUnidad({ x, y, payload, hgsSet, indSel }) {
  const rawLabel = payload.value === 'TOTAL' ? 'TOTAL OOAD' : payload.value;
  const isHGS = indSel === 'IASS 01' && hgsSet?.has(payload.value);
  const label = rawLabel.length > 15 ? rawLabel.slice(0, 14) + '…' : rawLabel;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={4} textAnchor="end"
        fill={isHGS ? HGS_COLOR : '#64748b'}
        fontSize={10} fontWeight={isHGS ? 700 : 600}
        transform="rotate(-38)"
      >
        {label}
      </text>
    </g>
  );
}
