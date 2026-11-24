// propios
import type { FilaTablaMapa } from '@/types/api/dengue/reportes';
import { textoAcento } from '@/utils/colorAcento';

interface Props {
  filas: FilaTablaMapa[] | undefined;
  /** Título de la columna de nombres: 'Municipio de residencia' o 'Unidad Médica'. */
  encabezado: string;
}

/**
 * Tabla de ranking (municipios o unidades médicas) ordenada de mayor a menor número de casos.
 * Las primeras 3 posiciones se destacan con color. Cada fila incluye una barra de proporción.
 */
export default function TablaUnidades({ filas, encabezado }: Props) {
  if (!filas?.length) return null
  const max = filas[0]?.n || 1

  return (
    <table className="dengue-tabla">
      <thead>
        <tr>
          <th style={{ width: 36, textAlign: 'center' }}>#</th>
          <th>{encabezado}</th>
          <th style={{ textAlign: 'center', width: 80 }}>Casos</th>
          <th style={{ width: 180 }}>Proporción</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => {
          const pct = (fila.n / max * 100).toFixed(1)
          const color = fila.n === max ? 'var(--epi-guinda)' : i < 3 ? 'var(--epi-dorado)' : 'var(--epi-verde)'
          return (
            <tr key={i}>
              <td style={{ textAlign: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', margin: '0 auto',
                  background: i < 3 ? color : 'var(--superficie-alterna)',
                  color: i < 3 ? 'var(--texto-sobre-familia)' : 'var(--texto-tenue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                }}>{i + 1}</div>
              </td>
              <td style={{ fontWeight: i < 3 ? 600 : 400, color: 'var(--texto-medio)' }}>{fila.nombre}</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: textoAcento(color) }}>
                {fila.n}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: 'var(--superficie-alterna)', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 100,
                      background: `linear-gradient(to right, var(--epi-verde), ${color})`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--texto-tenue)', fontWeight: 600, minWidth: 32 }}>
                    {pct}%
                  </span>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
