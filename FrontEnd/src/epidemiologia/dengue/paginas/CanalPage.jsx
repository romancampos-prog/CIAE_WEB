import CanalChart from '../componentes/canal/CanalChart'
import PanelDeslizante from '../componentes/comun/PanelDeslizante'
import DengueSpinner from '../componentes/comun/Spinner'
import { useState } from 'react'
import { useDengueReporte } from '../hooks/useDengueReportes'
import { getCanal } from '../api/reportes'
import { calcularKpisCanal } from '../utils/calculos'

/**
 * Panel lateral de semanas que superaron el umbral histórico del canal endémico.
 * @param {{ alertas: Array<{ sem: number, casos: number, umbral: number, zona: string }> }} props
 */
function AlertaCanal({ alertas }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#a7802d',
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
          fontSize: 13, color: '#245c4f', fontWeight: 600,
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
                <td style={{ color: '#64748b' }}>{a.umbral}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 10px', borderRadius: 100,
                    fontSize: 11, fontWeight: 700,
                    background: a.zona === 'epidemica'
                      ? 'rgba(105,28,50,0.1)' : 'rgba(220,123,0,0.1)',
                    color: a.zona === 'epidemica' ? '#691c32' : '#e07b00',
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

const ZONAS = [
  { color: '#2e8b57', bg: 'rgba(46,139,87,0.1)',   borde: 'rgba(46,139,87,0.25)',   label: 'Éxito',     sub: '0 – Q1'           },
  { color: '#ccaa00', bg: 'rgba(204,170,0,0.1)',   borde: 'rgba(204,170,0,0.25)',   label: 'Seguridad', sub: 'Q1 – Mediana'     },
  { color: '#e07b00', bg: 'rgba(224,123,0,0.1)',   borde: 'rgba(224,123,0,0.25)',   label: 'Alerta',    sub: 'Mediana – Q3'     },
  { color: '#cc0000', bg: 'rgba(220,50,50,0.08)',  borde: 'rgba(220,50,50,0.2)',    label: 'Epidémica', sub: '> Q3'             },
]

/**
 * Página del Canal Endémico de dengue.
 * Muestra KPIs del año, la gráfica de comparativo histórico por semana y
 * un panel deslizante con las semanas que superaron el umbral.
 */
export default function CanalPage() {
  const { datos, cargando, error } = useDengueReporte(getCanal)
  const [panelAbierto, setPanelAbierto] = useState(false)

  if (cargando) return <DengueSpinner texto="Cargando canal endémico…" />

  if (error) return (
    <div className="dengue-estado-vacio">
      <div className="dengue-icono">📊</div>
      <p>{error}</p>
    </div>
  )

  const { totalCasos, picoCasos, picaSemana, semsAlerta, semsConDatos } = calcularKpisCanal(datos)
  console.log("mi log ",totalCasos, picoCasos, picaSemana, semsAlerta, semsConDatos)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Hero ── */}
      <div className="epi-canal-hero" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="epi-canal-titleblock">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(167,128,45,0.1)', border: '1px solid rgba(167,128,45,0.22)',
            borderRadius: 100, padding: '0.1875rem 0.75rem',
            fontSize: '0.6rem', fontWeight: 700, color: '#a7802d',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.625rem',
          }}>
            📊 Análisis epidemiológico
          </div>
          <h1 className="epi-canal-titulo" style={{
            fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800,
            color: '#1e293b', letterSpacing: '-0.8px', margin: '0 0 0.25rem',
          }}>
            Canal Endémico{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #245c4f, #a7802d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{datos.año}</span>
          </h1>
          <p className="epi-canal-sub" style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
            IMSS OOAD Guanajuato · {datos.semanas.length} semanas epidemiológicas
          </p>
        </div>

        {/* Badge de alertas — en mobile se muestra debajo de la gráfica (ver más abajo) */}
        {semsAlerta > 0 && (
          <button className="epi-canal-alerta epi-canal-alerta--desktop" onClick={() => setPanelAbierto(true)} style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 1.125rem', borderRadius: '0.875rem', flexShrink: 0,
            background: 'rgba(105,28,50,0.07)',
            border: '1px solid rgba(105,28,50,0.18)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.18s',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(105,28,50,0.13)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(105,28,50,0.07)'}
          >
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#691c32', lineHeight: 1 }}>
                {semsAlerta}
              </div>
              <div style={{ fontSize: '0.625rem', color: '#a4a4a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {semsAlerta === 1 ? 'semana en alerta' : 'semanas en alerta'}
              </div>
            </div>
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="epi-canal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: 12 }}>
        {[
          { valor: totalCasos,   label: 'Total de casos',      sub: `año ${datos.año}`,          color: '#691c32', bg: 'rgba(105,28,50,0.06)',  borde: 'rgba(105,28,50,0.12)'  },
          { valor: semsConDatos, label: 'Semanas con casos',   sub: `de ${datos.semanas.length}`, color: '#245c4f', bg: 'rgba(36,92,79,0.06)',   borde: 'rgba(36,92,79,0.12)'   },
          { valor: picoCasos,    label: 'Pico semanal',        sub: `sem. ${picaSemana}`,         color: '#a7802d', bg: 'rgba(167,128,45,0.06)', borde: 'rgba(167,128,45,0.15)' },
        ].map(({ valor, label, sub, color, bg, borde }) => (
          <div key={label} style={{
            background: 'white', borderRadius: '1rem', padding: '0.625rem 1.125rem',
            border: `1px solid ${borde}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            borderLeft: `0.25rem solid ${color}`,
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.125rem' }}>
              {valor}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.125rem' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráfica ── */}
      <div style={{
        background: 'white', borderRadius: '1.25rem',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.375rem 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.625rem',
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
              Comparativo histórico por semana epidemiológica
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.125rem' }}>
              Zonas calculadas con datos históricos · línea = casos {datos.año}
            </div>
          </div>
          {/* Leyenda inline */}
          <div className="epi-canal-leyenda" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {ZONAS.map(({ color, bg, borde, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '0.3125rem',
                padding: '0.1875rem 0.625rem', borderRadius: 100,
                background: bg, border: `1px solid ${borde}`,
                fontSize: '0.625rem', fontWeight: 700, color,
              }}>
                <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </div>
            ))}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.1875rem 0.625rem', borderRadius: 100,
              background: 'rgba(105,28,50,0.07)', border: '1px solid rgba(105,28,50,0.18)',
              fontSize: '0.625rem', fontWeight: 700, color: '#691c32',
            }}>
              <div style={{ width: '1.125rem', height: '0.125rem', background: '#691c32', borderRadius: '0.0625rem', flexShrink: 0 }} />
              Casos {datos.año}
            </div>
          </div>
        </div>

        <div style={{ padding: '0.25rem 0.5rem 0.5rem' }}>
          <CanalChart datos={datos} />
        </div>
      </div>

      {/* Badge de alertas — versión mobile, debajo de la gráfica (ver epi.css) */}
      {semsAlerta > 0 && (
        <button className="epi-canal-alerta epi-canal-alerta--mobile" onClick={() => setPanelAbierto(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
          padding: '0.625rem 1.125rem', borderRadius: '0.875rem',
          background: 'rgba(105,28,50,0.07)',
          border: '1px solid rgba(105,28,50,0.18)',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.18s',
        }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(105,28,50,0.13)'}
          onMouseOut={e  => e.currentTarget.style.background = 'rgba(105,28,50,0.07)'}
        >
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#691c32', lineHeight: 1 }}>
            {semsAlerta}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#a4a4a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {semsAlerta === 1 ? 'semana en alerta' : 'semanas en alerta'}
          </span>
        </button>
      )}

      {/* Panel deslizante de alertas (sin cambios funcionales) */}
      <PanelDeslizante
        titulo="⚠ Alerta — Canal Endémico"
        badge={datos.alertas.length}
        ocultarBoton
        open={panelAbierto}
        onToggle={() => setPanelAbierto(v => !v)}
      >
        <AlertaCanal alertas={datos.alertas} />
      </PanelDeslizante>

    </div>
  )
}
