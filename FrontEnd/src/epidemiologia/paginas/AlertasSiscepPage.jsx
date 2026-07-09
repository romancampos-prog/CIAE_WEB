import SeccionAlerta from '../componentes/alertas/SeccionAlerta'
import DengueSpinner from '../componentes/comun/Spinner'
import { useDengueReporte } from '../hooks/useDengueReportes'
import { getAlertasSiscep } from '../api/reportes'

const SECCIONES = [
  { clave: 'muestras_rechazadas',  titulo: 'Alerta 1 — Muestras rechazadas',                     descripcion: 'Muestras rechazadas por el laboratorio. Debe retomarse una nueva muestra.',                                                           tipo: 'cols_caso', color: '#691c32' },
  { clave: 'pendientes_clasificar',titulo: 'Alerta 2 — Pendientes de clasificación',              descripcion: 'Casos con resultado disponible en SisCep pero sin diagnóstico final capturado.',                                                       tipo: 'cols_pend', color: '#a7802d' },
  { clave: 'recibidas_adecuadas',  titulo: 'Alerta 3 — Recibidas adecuadas pendientes de resultado', descripcion: 'Muestras recibidas correctamente en laboratorio, en espera de resultado.',                                                        tipo: 'cols_caso', color: '#245c4f' },
  { clave: 'sin_muestra',          titulo: 'Alerta 4 — Sin muestra de laboratorio',               descripcion: 'Casos de dengue sin muestra registrada (valor 0 o vacío).',                                                                          tipo: 'cols_caso', color: '#a7802d' },
  { clave: 'graves_sin_muestra',   titulo: 'Alerta 5 — Casos graves sin muestra',                 descripcion: 'Dengue con Signos de Alarma o Grave con muestra no tomada. La muestra es obligatoria en casos graves.',                              tipo: 'cols_caso', color: '#691c32', prioritaria: true },
]

export default function AlertasSiscepPage() {
  const { datos, cargando, error } = useDengueReporte(getAlertasSiscep)

  if (cargando) return <DengueSpinner texto="Cargando alertas SisCep…" />

  if (error) return (
    <div className="dengue-estado-vacio">
      <div className="dengue-icono">⚠️</div>
      <p>{error}</p>
    </div>
  )

  const totalRegistros  = SECCIONES.reduce((s, { clave }) => s + (datos[clave]?.length || 0), 0)
  const seccionesActivas = SECCIONES.filter(({ clave }) => (datos[clave]?.length || 0) > 0).length
  const prioritarias    = datos.graves_sin_muestra?.length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(167,128,45,0.1)', border: '1px solid rgba(167,128,45,0.22)',
            borderRadius: 100, padding: '3px 12px',
            fontSize: '0.6rem', fontWeight: 700, color: '#a7802d',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10,
          }}>
            ⚠️ Alertas operativas SisCep
          </div>
          <h1 style={{
            fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800,
            color: '#1e293b', letterSpacing: '-0.8px', margin: '0 0 4px',
          }}>
            Seguimiento de muestras{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #691c32, #a7802d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{datos.año}</span>
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            IMSS OOAD Guanajuato · haz clic en cada alerta para ver el detalle
          </p>
        </div>

        {/* KPIs hero */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {[
            { valor: totalRegistros,   label: 'Total registros',    color: '#691c32', borde: 'rgba(105,28,50,0.18)' },
            { valor: seccionesActivas, label: 'Alertas con casos',  color: '#a7802d', borde: 'rgba(167,128,45,0.18)' },
            { valor: prioritarias,     label: 'Casos prioritarios', color: prioritarias > 0 ? '#691c32' : '#245c4f',
              borde: prioritarias > 0 ? 'rgba(105,28,50,0.18)' : 'rgba(36,92,79,0.18)' },
          ].map(({ valor, label, color, borde }) => (
            <div key={label} style={{
              background: 'white', borderRadius: 14, padding: '10px 16px',
              border: `1px solid ${borde}`, borderLeft: `4px solid ${color}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', textAlign: 'right',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{valor}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas como acordeón ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECCIONES.map(({ clave, ...props }) => (
          <SeccionAlerta
            key={clave}
            registros={datos[clave] || []}
            {...props}
          />
        ))}
      </div>

      {/* ── Negativos ── */}
      <div style={{
        background: 'white', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Casos negativos por unidad médica
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Dx final OTROS o SisCep NEGATIVO
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              padding: '4px 12px', borderRadius: 100,
              background: 'rgba(164,164,164,0.1)', border: '1px solid rgba(164,164,164,0.25)',
              fontSize: 12, fontWeight: 700, color: '#64748b',
            }}>
              {datos.tabla_negativos.length} unidades
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: 100,
              background: 'rgba(36,92,79,0.08)', border: '1px solid rgba(36,92,79,0.2)',
              fontSize: 12, fontWeight: 700, color: '#245c4f',
            }}>
              {datos.tabla_negativos.reduce((s, r) => s + (r.N_NEGATIVOS || 0), 0)} casos
            </div>
          </div>
        </div>

        {datos.tabla_negativos.length > 0 ? (
          <table className="dengue-tabla">
            <thead>
              <tr>
                <th>Unidad Médica</th>
                <th style={{ textAlign: 'center' }}>Casos Negativos</th>
              </tr>
            </thead>
            <tbody>
              {datos.tabla_negativos.map((row, i) => (
                <tr key={i}>
                  <td>{row.DES_UNI_MED_NOTIF}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#245c4f' }}>
                    {row.N_NEGATIVOS}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Sin casos negativos registrados
          </div>
        )}
      </div>

    </div>
  )
}
