import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import ChartTooltip from '../../../ftp/componentes/graficasFTP/ChartTooltip';
import { COLOR_SEMAFORO } from '../../constantes/semaforo';
import { ticksEscala } from '../../utils/escala';

/**
 * Gráfica de barras con semáforo de color.
 *
 * Props:
 *   chartKey    — string   — React key (cambia para forzar re-render)
 *   data        — array    — puntos [ { mes|unidad, tasa, color, ... } ]
 *   xKey        — string   — 'mes' (vista unidad) | 'unidad' (vista mes/acumulado)
 *   maxTasa     — number
 *   indSel      — string   — para el tooltip
 *   maxBarSize  — number   — ancho máximo de cada barra (default 56)
 *   barRadius   — array    — esquinas de barra (default [8,8,0,0])
 *   bottomMargin— number   — margen inferior (default 10; 64 cuando el eje X es largo)
 *   labelSize   — string   — tamaño de etiqueta sobre barra (default '10px')
 *   conLinea    — bool     — muestra línea de tendencia (default false)
 *   tickEl      — element  — tick personalizado para XAxis; si null usa tick simple angulado
 *   onBarHover  — fn       — callback(mesNum) para hover en modo unidad (FTP)
 *   onBarLeave  — fn       — callback() al salir del hover
 */
const GraficaBarras = ({
  chartKey,
  data,
  xKey = 'mes',
  maxTasa,
  indSel,
  maxBarSize   = 56,
  barRadius    = [8, 8, 0, 0],
  bottomMargin = 10,
  labelSize    = '10px',
  conLinea     = false,
  tickEl       = null,
  onBarHover,
  onBarLeave,
}) => {
  const xTickProps = xKey === 'mes'
    ? { tick: { fontSize: 12, fill: '#64748b', fontWeight: 600 } }
    : tickEl
      ? { tick: tickEl, interval: 0 }
      : {
          tick: { fontSize: 10, fill: '#64748b', fontWeight: 600 },
          angle: -38,
          textAnchor: 'end',
          tickFormatter: v => { const s = v === 'TOTAL' ? 'TOTAL OOAD' : v; return s.length > 15 ? s.slice(0, 14) + '…' : s; },
          interval: 0,
        };

  return (
    <ResponsiveContainer width="100%" height={440}>
      <ComposedChart
        key={chartKey}
        data={data}
        margin={{ top: 28, right: 16, left: -10, bottom: bottomMargin }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} {...xTickProps} />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false} tickLine={false} width={40}
          domain={[0, maxTasa]}
          ticks={ticksEscala(maxTasa)}
        />
        <Tooltip content={<ChartTooltip indSel={indSel} />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />

        <Bar
          dataKey="tasa"
          maxBarSize={maxBarSize}
          radius={barRadius}
          isAnimationActive
          animationBegin={0}
          animationDuration={700}
          animationEasing="ease-out"
          onMouseEnter={onBarHover ? (d) => onBarHover(d.mesNum) : undefined}
          onMouseLeave={onBarLeave ?? undefined}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={COLOR_SEMAFORO[d.color] ?? '#aaa'} fillOpacity={0.9} />
          ))}
          <LabelList
            dataKey="tasa"
            position="top"
            formatter={v => v > 0 ? Number(v).toFixed(2) : ''}
            style={{ fontSize: labelSize, fontWeight: 700, fill: '#475569' }}
          />
        </Bar>

        {conLinea && (
          <Line
            dataKey="tasa"
            type="monotone"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive
            animationBegin={300}
            animationDuration={900}
            animationEasing="ease-out"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default GraficaBarras;
