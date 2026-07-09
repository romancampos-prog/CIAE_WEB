import { useState } from 'react'

const CABECERAS = {
  cols_caso: ['Folio', 'Unidad', 'Nombre', 'Ap. Paterno', 'Ap. Materno', 'Dx Probable', 'Sem'],
  cols_pend: ['Folio', 'Unidad', 'Nombre', 'Ap. Paterno', 'Ap. Materno', 'Resultado SisCep', 'Sem'],
}
const CAMPOS = {
  cols_caso: ['VEC_ID', 'DES_UNI_MED_NOTIF', 'IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT', 'DES_DIAG_PROBABLE', 'SEM'],
  cols_pend: ['VEC_ID', 'DES_UNI_MED_NOTIF', 'IDE_NOM', 'IDE_APE_PAT', 'IDE_APE_MAT', 'ESTATUS_SISCEP', 'SEM'],
}

export default function SeccionAlerta({ titulo, descripcion, registros, tipo = 'cols_caso', color, prioritaria = false }) {
  const [abierto, setAbierto] = useState(prioritaria && registros.length > 0)
  const cabeceras = CABECERAS[tipo]
  const campos    = CAMPOS[tipo]
  const vacio     = registros.length === 0

  const colorReal = prioritaria ? '#691c32' : color
  const numAlerta = titulo.match(/\d+/)?.[0]

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: `1px solid ${vacio ? 'rgba(0,0,0,0.05)' : `${colorReal}30`}`,
      borderLeft: `4px solid ${vacio ? '#e2e8f0' : colorReal}`,
      boxShadow: prioritaria && !vacio
        ? `0 4px 20px ${colorReal}18`
        : '0 2px 10px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>

      {/* Header — siempre visible, clickeable */}
      <button
        onClick={() => !vacio && setAbierto(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 18px', cursor: vacio ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        {/* Número de alerta */}
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: vacio ? '#f1f5f9' : `${colorReal}15`,
          border: `1.5px solid ${vacio ? '#e2e8f0' : `${colorReal}35`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
          color: vacio ? '#94a3b8' : colorReal,
        }}>{numAlerta}</div>

        {/* Título y descripción */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: vacio ? '#94a3b8' : '#1e293b',
            }}>{titulo.replace(/Alerta \d+ — /, '')}</span>
            {prioritaria && !vacio && (
              <span style={{
                background: '#691c32', color: 'white',
                padding: '1px 8px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              }}>PRIORITARIA</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {descripcion}
          </div>
        </div>

        {/* Badge de count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <div style={{
            padding: '4px 12px', borderRadius: 100,
            background: vacio ? '#f1f5f9' : `${colorReal}12`,
            border: `1px solid ${vacio ? '#e2e8f0' : `${colorReal}30`}`,
            fontSize: 13, fontWeight: 800,
            color: vacio ? '#94a3b8' : colorReal,
          }}>{registros.length}</div>

          {/* Chevron */}
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
        <div style={{ borderTop: `1px solid ${colorReal}20`, overflowX: 'auto', padding: '0 28px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <colgroup>
              <col style={{ width: 90  }} />{/* Folio */}
              <col style={{ width: 160 }} />{/* Unidad */}
              <col style={{ width: 120 }} />{/* Nombre */}
              <col style={{ width: 120 }} />{/* Ap. Paterno */}
              <col style={{ width: 120 }} />{/* Ap. Materno */}
              <col />{/* Dx / Resultado — ocupa el resto */}
              <col style={{ width: 54  }} />{/* Sem */}
            </colgroup>
            <thead>
              <tr>
                {cabeceras.map((c, ci) => (
                  <th key={c} style={{
                    padding: '10px 14px', textAlign: ci === 6 ? 'center' : 'left',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.7px', color: colorReal,
                    background: `${colorReal}08`,
                    borderBottom: `2px solid ${colorReal}20`,
                    whiteSpace: 'nowrap',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : `${colorReal}04` }}>
                  {campos.map((campo, j) => (
                    <td key={campo} style={{
                      padding: '9px 14px',
                      borderBottom: `1px solid ${colorReal}10`,
                      color: j === 0 ? colorReal : '#374151',
                      fontWeight: j === 0 ? 700 : 400,
                      textAlign: j === 6 ? 'center' : 'left',
                      whiteSpace: j === 5 ? 'normal' : 'nowrap',
                    }}>{row[campo] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
