import { useState } from 'react'

const COLOR = '#b45309'   // ámbar oscuro — distingue de los duplicados confirmados (índigo)

const COLOR_CLASIF = {
  POSITIVO        : { bg: 'rgba(105,28,50,0.08)',  color: '#691c32' },
  NEGATIVO        : { bg: 'rgba(36,92,79,0.08)',   color: '#245c4f' },
  'SIN CLASIFICAR': { bg: 'rgba(164,164,164,0.1)', color: '#64748b' },
}

function BadgeClasif({ valor }) {
  const estilo = COLOR_CLASIF[valor] || COLOR_CLASIF['SIN CLASIFICAR']
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 5,
      fontSize: 10, fontWeight: 700,
      background: estilo.bg, color: estilo.color,
    }}>{valor || '—'}</span>
  )
}

function Pct({ valor }) {
  const pct   = Math.round(valor * 100)
  const color = pct >= 95 ? '#691c32' : pct >= 85 ? COLOR : '#64748b'
  return (
    <span style={{ fontWeight: 700, color, fontSize: 12 }}>{pct}%</span>
  )
}

export default function SeccionPosiblesDuplicados({ registros }) {
  const [abierto, setAbierto]     = useState(false)
  const [expandido, setExpandido] = useState(null)   // índice del par expandido
  const vacio = registros.length === 0

  // Agrupar por razón para los badges del header
  const porRazon = registros.reduce((acc, r) => {
    acc[r.RAZON] = (acc[r.RAZON] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: `1px solid ${vacio ? 'rgba(0,0,0,0.05)' : `${COLOR}30`}`,
      borderLeft: `4px solid ${vacio ? '#e2e8f0' : COLOR}`,
      boxShadow: vacio ? '0 2px 10px rgba(0,0,0,0.04)' : `0 4px 20px ${COLOR}10`,
      overflow: 'hidden',
    }}>

      {/* Header acordeón */}
      <button
        onClick={() => !vacio && setAbierto(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 18px', cursor: vacio ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: vacio ? '#f1f5f9' : `${COLOR}15`,
          border: `1.5px solid ${vacio ? '#e2e8f0' : `${COLOR}35`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>🔎</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: vacio ? '#94a3b8' : '#1e293b' }}>
            Posibles duplicados no confirmados
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Pares con apellido paterno similar (≥ 80 %) que no cumplieron las reglas de clasificación · revisión manual recomendada
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!vacio && Object.entries(porRazon).map(([razon, n]) => (
            <div key={razon} style={{
              padding: '3px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700,
              background: `${COLOR}10`, border: `1px solid ${COLOR}25`, color: COLOR,
              maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={razon}>{razon}: {n}</div>
          ))}
          <div style={{
            padding: '4px 12px', borderRadius: 100,
            background: vacio ? '#f1f5f9' : `${COLOR}12`,
            border: `1px solid ${vacio ? '#e2e8f0' : `${COLOR}30`}`,
            fontSize: 13, fontWeight: 800,
            color: vacio ? '#94a3b8' : COLOR,
          }}>{registros.length}</div>

          {!vacio && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                 style={{ transition: 'transform 0.2s', transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
          {vacio && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      </button>

      {/* Contenido */}
      {abierto && !vacio && (
        <div style={{ borderTop: `1px solid ${COLOR}20`, padding: '0 28px 16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 20, ...th }}></th>
                {/* Registro A */}
                <th style={{ ...th, color: COLOR }}>Folio A</th>
                <th style={{ ...th, color: COLOR }}>Nombre A</th>
                <th style={{ ...th, color: COLOR }}>Ap. Pat A</th>
                <th style={{ ...th, color: COLOR }}>Dx Final A</th>
                <th style={{ ...th, color: COLOR }}>Clasif. A</th>
                {/* Similitudes */}
                <th style={{ ...th, textAlign: 'center' }}>Sim. Ape. Pat</th>
                <th style={{ ...th, textAlign: 'center' }}>Sim. Nombre</th>
                {/* Registro B */}
                <th style={{ ...th, color: '#7c3aed' }}>Folio B</th>
                <th style={{ ...th, color: '#7c3aed' }}>Nombre B</th>
                <th style={{ ...th, color: '#7c3aed' }}>Ap. Pat B</th>
                <th style={{ ...th, color: '#7c3aed' }}>Dx Final B</th>
                <th style={{ ...th, color: '#7c3aed' }}>Clasif. B</th>
                {/* Razón */}
                <th style={{ ...th }}>Razón no confirmado</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => {
                const expandirIdx = `${r.VEC_ID_A}-${r.VEC_ID_B}`
                const estaExp     = expandido === expandirIdx
                return (
                  <>
                    <tr
                      key={expandirIdx}
                      style={{ background: i % 2 === 0 ? 'white' : `${COLOR}04`, cursor: 'pointer' }}
                      onClick={() => setExpandido(estaExp ? null : expandirIdx)}
                    >
                      <td style={{ padding: '9px 6px', borderBottom: `1px solid ${COLOR}10`, textAlign: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                             stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                             style={{ transition: 'transform 0.15s', transform: estaExp ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </td>
                      <td style={{ ...td, color: COLOR, fontWeight: 700 }}>{r.VEC_ID_A}</td>
                      <td style={td}>{r.IDE_NOM_A}</td>
                      <td style={td}>{r.IDE_APE_PAT_A}</td>
                      <td style={td}>{r.DES_DIAG_FINAL_A || '—'}</td>
                      <td style={td}><BadgeClasif valor={r.CLASIF_A} /></td>
                      <td style={{ ...td, textAlign: 'center' }}><Pct valor={r.SIM_APE_PAT} /></td>
                      <td style={{ ...td, textAlign: 'center' }}><Pct valor={r.SIM_NOMBRE} /></td>
                      <td style={{ ...td, color: '#7c3aed', fontWeight: 700 }}>{r.VEC_ID_B}</td>
                      <td style={td}>{r.IDE_NOM_B}</td>
                      <td style={td}>{r.IDE_APE_PAT_B}</td>
                      <td style={td}>{r.DES_DIAG_FINAL_B || '—'}</td>
                      <td style={td}><BadgeClasif valor={r.CLASIF_B} /></td>
                      <td style={{ ...td, color: COLOR, fontWeight: 600 }}>{r.RAZON}</td>
                    </tr>

                    {/* Sub-fila: detalle comparativo */}
                    {estaExp && (
                      <tr key={`${expandirIdx}-det`}>
                        <td></td>
                        <td colSpan={13} style={{
                          padding: '10px 14px 12px',
                          borderBottom: `1px solid ${COLOR}10`,
                          background: `rgba(180,83,9,0.03)`,
                        }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            {[
                              { label: 'Registro A', folio: r.VEC_ID_A, nom: r.IDE_NOM_A, pat: r.IDE_APE_PAT_A, mat: r.IDE_APE_MAT_A, fec: r.FEC_NOTIF_A, clasif: r.CLASIF_A, color: COLOR },
                              { label: 'Registro B', folio: r.VEC_ID_B, nom: r.IDE_NOM_B, pat: r.IDE_APE_PAT_B, mat: r.IDE_APE_MAT_B, fec: r.FEC_NOTIF_B, clasif: r.CLASIF_B, color: '#7c3aed' },
                            ].map(({ label, folio, nom, pat, mat, fec, clasif, color: c }) => (
                              <div key={label} style={{ minWidth: 220 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
                                {[
                                  ['Folio',            folio],
                                  ['Nombre',           nom],
                                  ['Ap. Paterno',      pat],
                                  ['Ap. Materno',      mat],
                                  ['Fec. Notificación',fec],
                                ].map(([k, v]) => (
                                  <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 11, color: '#94a3b8', width: 130, flexShrink: 0 }}>{k}</span>
                                    <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{v || '—'}</span>
                                  </div>
                                ))}
                                <div style={{ marginTop: 4 }}><BadgeClasif valor={clasif} /></div>
                              </div>
                            ))}
                            <div style={{ minWidth: 160 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Similitudes</div>
                              {[
                                ['Ap. Paterno', r.SIM_APE_PAT],
                                ['Ap. Materno', r.SIM_APE_MAT],
                                ['Nombre',      r.SIM_NOMBRE],
                              ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: '#94a3b8', width: 90, flexShrink: 0 }}>{k}</span>
                                  <Pct valor={v} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Estilos reutilizables de celda
const th = {
  padding: '10px 12px', textAlign: 'left',
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.6px', color: '#64748b',
  background: `rgba(180,83,9,0.05)`,
  borderBottom: `2px solid rgba(180,83,9,0.15)`,
  whiteSpace: 'nowrap',
}
const td = {
  padding: '9px 12px',
  borderBottom: 'rgba(180,83,9,0.08) 1px solid',
  color: '#374151',
  whiteSpace: 'nowrap',
}
