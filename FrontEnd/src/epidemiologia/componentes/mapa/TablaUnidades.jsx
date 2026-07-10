/**
 * Tabla de ranking de unidades médicas ordenada de mayor a menor número de casos.
 * Las primeras 3 posiciones se destacan con color. Cada fila incluye una barra de proporción.
 * @param {{ unidades: Array<{ unidad:string, n:number }> }} props
 */
export default function TablaUnidades({ unidades }) {
  if (!unidades?.length) return null
  const max = unidades[0]?.n || 1

  return (
    <table className="dengue-tabla">
      <thead>
        <tr>
          <th style={{ width: 36, textAlign: 'center' }}>#</th>
          <th>Unidad Médica</th>
          <th style={{ textAlign: 'center', width: 80 }}>Casos</th>
          <th style={{ width: 180 }}>Proporción</th>
        </tr>
      </thead>
      <tbody>
        {unidades.map((u, i) => {
          const pct = (u.n / max * 100).toFixed(1)
          const color = u.n === max ? '#691c32' : i < 3 ? '#a7802d' : '#245c4f'
          return (
            <tr key={i}>
              <td style={{ textAlign: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', margin: '0 auto',
                  background: i < 3 ? color : '#f1f5f9',
                  color: i < 3 ? 'white' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                }}>{i + 1}</div>
              </td>
              <td style={{ fontWeight: i < 3 ? 600 : 400, color: '#374151' }}>{u.unidad}</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color }}>
                {u.n}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 100,
                      background: `linear-gradient(to right, #245c4f, ${color})`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, minWidth: 32 }}>
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
