import { HGS_COLOR } from '../../constants/colores';

export default function TickMesUnidad({ x, y, payload, hgsSet, indSel }) {
  const isHGS = indSel === 'IN_ASS 01' && hgsSet.has(payload.value);
  const label = payload.value.length > 15 ? payload.value.slice(0, 14) + '…' : payload.value;
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
