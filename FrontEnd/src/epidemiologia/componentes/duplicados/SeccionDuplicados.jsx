import { useState } from 'react'

const COLOR = '#4f46e5'   // índigo — diferente a los colores de alertas

const CABECERAS_RECHAZADO = [
  'Folio rechazado', 'Unidad', 'Nombre', 'Ap. Paterno', 'Ap. Materno',
  'Dx Probable', 'Dx Final', 'Clasificación', 'Método',
]
const CAMPOS_RECHAZADO = [
  'VEC_ID', 'DES_UNI_MED_NOTIF', 'IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT',
  'DES_DIAG_PROBABLE', 'DES_DIAG_FINAL', 'CLASIFICACION_FINAL', 'METODO',
]

const COLOR_CLASIF = {
  POSITIVO      : { bg: 'rgba(105,28,50,0.08)',  color: '#691c32' },
  NEGATIVO      : { bg: 'rgba(36,92,79,0.08)',   color: '#245c4f' },
  'SIN CLASIFICAR': { bg: 'rgba(164,164,164,0.1)', color: '#64748b' },
}

/**
 * Acordeón de duplicados confirmados.
 * Cada fila de la tabla es expandible para revelar el VEC_ID que el algoritmo conservó.
 * @param {{ registros: object[] }} props
 */
export default function SeccionDuplicados({ registros }) {
  const [abierto, setAbierto]         = useState(registros.length > 0)
  const [expandido, setExpandido]     = useState(null)   // VEC_ID del rechazado con sub-fila abierta
  const vacio = registros.length === 0

  const metodos = registros.reduce((acc, r) => {
    acc[r.METODO] = (acc[r.METODO] || 0) + 1
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
        {/* Ícono */}
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: vacio ? '#f1f5f9' : `${COLOR}15`,
          border: `1.5px solid ${vacio ? '#e2e8f0' : `${COLOR}35`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>⧉</div>

        {/* Título */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: vacio ? '#94a3b8' : '#1e293b' }}>
            Duplicados detectados
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Registros descartados por el algoritmo · se muestra el folio conservado para cada uno
          </div>
        </div>

        {/* Badges de métodos + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!vacio && Object.entries(metodos).map(([met, n]) => (
            <div key={met} style={{
              padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
              background: `${COLOR}10`, border: `1px solid ${COLOR}25`, color: COLOR,
            }}>{met}: {n}</div>
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

      {/* Tabla expandible */}
      {abierto && !vacio && (
        <div style={{ borderTop: `1px solid ${COLOR}20`, overflowX: 'auto', padding: '0 28px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <colgroup>
              <col style={{ width: 20  }} />{/* expand toggle */}
              <col style={{ width: 90  }} />{/* Folio rechazado */}
              <col style={{ width: 150 }} />{/* Unidad */}
              <col style={{ width: 110 }} />{/* Nombre */}
              <col style={{ width: 110 }} />{/* Ap. Pat */}
              <col style={{ width: 110 }} />{/* Ap. Mat */}
              <col style={{ width: 160 }} />{/* Dx Probable */}
              <col style={{ width: 160 }} />{/* Dx Final */}
              <col style={{ width: 110 }} />{/* Clasificación */}
              <col style={{ width: 90  }} />{/* Método */}
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: '10px 6px', background: `${COLOR}08`, borderBottom: `2px solid ${COLOR}20` }}></th>
                {CABECERAS_RECHAZADO.map((c, ci) => (
                  <th key={c} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.7px', color: COLOR,
                    background: `${COLOR}08`,
                    borderBottom: `2px solid ${COLOR}20`,
                    whiteSpace: 'nowrap',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((row, i) => {
                const estaExpandido = expandido === row.VEC_ID
                const estiloClasif  = COLOR_CLASIF[row.CLASIFICACION_FINAL] || COLOR_CLASIF['SIN CLASIFICAR']
                return (
                  <>
                    <tr
                      key={row.VEC_ID}
                      style={{ background: i % 2 === 0 ? 'white' : `${COLOR}04`, cursor: 'pointer' }}
                      onClick={() => setExpandido(estaExpandido ? null : row.VEC_ID)}
                    >
                      {/* Toggle sub-fila */}
                      <td style={{ padding: '9px 6px', borderBottom: `1px solid ${COLOR}10`, textAlign: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                             stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                             style={{ transition: 'transform 0.15s', transform: estaExpandido ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </td>

                      {CAMPOS_RECHAZADO.map((campo, j) => {
                        if (campo === 'CLASIFICACION_FINAL') {
                          return (
                            <td key={campo} style={{ padding: '9px 14px', borderBottom: `1px solid ${COLOR}10` }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6,
                                fontSize: 10, fontWeight: 700,
                                background: estiloClasif.bg, color: estiloClasif.color,
                              }}>{row[campo] ?? ''}</span>
                            </td>
                          )
                        }
                        return (
                          <td key={campo} style={{
                            padding: '9px 14px',
                            borderBottom: `1px solid ${COLOR}10`,
                            color: j === 0 ? COLOR : '#374151',
                            fontWeight: j === 0 ? 700 : 400,
                            whiteSpace: 'nowrap',
                          }}>{row[campo] ?? ''}</td>
                        )
                      })}
                    </tr>

                    {/* Sub-fila: folio conservado */}
                    {estaExpandido && (
                      <tr key={`${row.VEC_ID}-conservado`}>
                        <td></td>
                        <td colSpan={CABECERAS_RECHAZADO.length} style={{
                          padding: '10px 14px 12px',
                          borderBottom: `1px solid ${COLOR}10`,
                          background: 'rgba(79,70,229,0.03)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                 stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Folio conservado:</span>
                            <span style={{
                              fontSize: 12, fontWeight: 800, color: COLOR,
                              background: `${COLOR}10`, border: `1px solid ${COLOR}25`,
                              padding: '2px 10px', borderRadius: 6,
                            }}>{row.VEC_ID_CONSERVADO}</span>
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
