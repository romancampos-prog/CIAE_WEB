import { useState } from 'react'
import { useParams } from 'react-router-dom'
import MapaLeaflet from '../componentes/mapa/MapaLeaflet'
import TablaUnidades from '../componentes/mapa/TablaUnidades'
import BrotesPanel from '../componentes/mapa/BrotesPanel'
import DengueSpinner from '../componentes/comun/Spinner'
import { useDengueReporte } from '../hooks/useDengueReportes'
import { getMapa } from '../api/reportes'

const SEMAFORO = [
  { color: '#2d8a57', label: 'Bajo' },
  { color: '#f4d03f', label: 'Moderado' },
  { color: '#e67e22', label: 'Alto' },
  { color: '#c0392b', label: 'Crítico' },
]

export default function MapaPage() {
  const { tipo } = useParams()
  const { datos, cargando, error } = useDengueReporte(() => getMapa(tipo), [tipo])
  const [tabActiva, setTabActiva]       = useState('mapa')
  const [panelBrotes, setPanelBrotes]   = useState(false)

  const etiqueta   = tipo === 'situacion' ? 'Casos Notificados' : 'Casos Confirmados'
  const colorTema  = tipo === 'situacion' ? '#245c4f' : '#691c32'
  const bgTema     = tipo === 'situacion' ? 'rgba(36,92,79,0.07)' : 'rgba(105,28,50,0.07)'
  const bordeTema  = tipo === 'situacion' ? 'rgba(36,92,79,0.18)' : 'rgba(105,28,50,0.18)'

  if (cargando) return <DengueSpinner texto={`Cargando mapa de ${etiqueta.toLowerCase()}…`} />

  if (error) return (
    <div className="dengue-estado-vacio">
      <div className="dengue-icono">🗺️</div>
      <p>{error}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: bgTema, border: `1px solid ${bordeTema}`,
            borderRadius: 100, padding: '3px 12px',
            fontSize: '0.6rem', fontWeight: 700, color: colorTema,
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8,
          }}>
            🗺️ {tipo === 'situacion' ? 'Mapa de situación' : 'Mapa de confirmados'}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800,
            color: '#1e293b', letterSpacing: '-0.8px', margin: '0 0 2px',
          }}>
            {etiqueta}{' '}
            <span style={{
              backgroundImage: `linear-gradient(90deg, ${colorTema}, #a7802d)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{datos.año}</span>
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            IMSS OOAD Guanajuato · distribución por municipio
          </p>
        </div>

        {(datos.brotes_espacial?.length > 0 || datos.brotes_temporal?.length > 0) && (
          <button onClick={() => setPanelBrotes(true)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 18px', borderRadius: 10, flexShrink: 0,
            background: 'rgba(105,28,50,0.07)',
            border: '1px solid rgba(105,28,50,0.18)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.18s',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(105,28,50,0.13)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(105,28,50,0.07)'}
          >
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#691c32', lineHeight: 1 }}>
                {(datos.brotes_espacial?.length || 0) + (datos.brotes_temporal?.length || 0)}
              </div>
              <div style={{ fontSize: 10, color: '#a4a4a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                posibles brotes
              </div>
            </div>
          </button>
        )}
      </div>

      {/* ── Tabs + KPIs en la misma fila ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'white', borderRadius: 14, padding: 4,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          {[
            { id: 'mapa',  label: '🗺️  Mapa'  },
            { id: 'tabla', label: '📋  Tabla' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTabActiva(id)} style={{
              padding: '7px 20px', borderRadius: 10, border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.18s',
              background: tabActiva === id ? colorTema : 'transparent',
              color: tabActiva === id ? 'white' : '#64748b',
              boxShadow: tabActiva === id ? `0 3px 10px ${colorTema}44` : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* KPIs — misma altura que los tabs */}
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {[
            { valor: datos.total,         label: 'Total casos',          color: colorTema, borde: bordeTema                },
            { valor: datos.mun_con_casos, label: 'Municipios con casos', color: '#a7802d', borde: 'rgba(167,128,45,0.18)' },
            { valor: datos.max_casos,     label: 'Máx. por municipio',  color: '#c0392b', borde: 'rgba(192,57,43,0.18)'  },
          ].map(({ valor, label, color, borde }) => (
            <div key={label} style={{
              flex: 1, background: 'white', borderRadius: 12,
              padding: '12px 16px',
              border: `1px solid ${borde}`, borderLeft: `3px solid ${color}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{valor}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* ── Mapa ── */}
      {tabActiva === 'mapa' && (
        <div style={{
          background: 'white', borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'visible',
        }}>
          {/* Header del mapa */}
          <div style={{
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {etiqueta} por Municipio
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                Hover sobre un municipio para ver su detalle
              </div>
            </div>
            {/* Semáforo compacto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>SEMÁFORO</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 1,
                background: '#f8fafc', borderRadius: 8, padding: '4px 8px',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 80, height: 8, borderRadius: 4,
                  background: 'linear-gradient(to right, #2d8a57, #f4d03f, #e67e22, #c0392b)',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SEMAFORO.map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4d4d4' }} />
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Sin casos</span>
                </div>
              </div>
            </div>
          </div>

          <MapaLeaflet geojson={datos.geojson} maxCasos={datos.max_casos} etiqueta={etiqueta} />
        </div>
      )}

      {/* ── Tabla ── */}
      {tabActiva === 'tabla' && (
        <div style={{
          background: 'white', borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {etiqueta} por Unidad Médica
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                Ordenadas por número de casos descendente
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: bgTema, border: `1px solid ${bordeTema}`,
              borderRadius: 100, padding: '4px 12px',
              fontSize: 11, fontWeight: 700, color: colorTema,
            }}>
              {datos.unidades.length} unidades
            </div>
          </div>
          <div style={{ padding: '8px 0' }}>
            <TablaUnidades unidades={datos.unidades} etiqueta={etiqueta} />
          </div>
        </div>
      )}

      {/* BrotesPanel sin cambios funcionales */}
      <BrotesPanel
        brotes_espacial={datos.brotes_espacial}
        brotes_temporal={datos.brotes_temporal}
        ocultarBoton
        open={panelBrotes}
        onToggle={() => setPanelBrotes(v => !v)}
      />

    </div>
  )
}
