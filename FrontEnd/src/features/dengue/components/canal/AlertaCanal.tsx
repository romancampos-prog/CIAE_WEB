// propios
import type { DatosCanal } from '@/types/api/dengue/reportes';

/**
 * Panel lateral de semanas que superaron el umbral histórico del canal endémico.
 */
export default function AlertaCanal({ alertas }: { alertas: DatosCanal['alertas'] }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--oro-texto)',
        textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14,
      }}>
        Semanas que superaron el umbral histórico
      </div>
      {alertas.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderRadius: 12,
          background: 'rgba(36,92,79,0.06)',
          border: '1px solid rgba(36,92,79,0.15)',
          fontSize: 13, color: 'var(--primario-texto)', fontWeight: 600,
        }}>
          ✓ Todas las semanas dentro del canal histórico
        </div>
      ) : (
        <table className="dengue-tabla">
          <thead>
            <tr><th>Semana</th><th>Casos</th><th>Umbral</th><th>Zona</th></tr>
          </thead>
          <tbody>
            {alertas.map((a, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>Sem. {a.sem}</td>
                <td style={{ fontWeight: 700 }}>{a.casos}</td>
                <td style={{ color: 'var(--texto-suave)' }}>{a.umbral}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 10px', borderRadius: 100,
                    fontSize: 11, fontWeight: 700,
                    background: a.zona === 'epidemica'
                      ? 'rgba(105,28,50,0.1)' : 'rgba(220,123,0,0.1)',
                    color: a.zona === 'epidemica' ? 'var(--tinto-texto)' : '#e07b00',
                    border: `1px solid ${a.zona === 'epidemica' ? 'rgba(105,28,50,0.2)' : 'rgba(220,123,0,0.2)'}`,
                  }}>
                    {a.zona === 'epidemica' ? 'Epidémica' : 'Alerta'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
