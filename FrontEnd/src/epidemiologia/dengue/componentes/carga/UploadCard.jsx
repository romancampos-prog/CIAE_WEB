import { useRef, useState } from 'react'

/**
 * Icono SVG estilizado de archivo Excel.
 * @param {{ size?: number, light?: boolean }} props
 */
const IconExcel = ({ size = 52, light = false }) => (
  <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
    <rect x="4" y="2" width="32" height="42" rx="4"
          fill={light ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          stroke={light ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'} strokeWidth="1.5"/>
    <path d="M36 2v12h12" stroke={light ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}
          strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    <rect x="4" y="2" width="22" height="42" rx="4"
          fill={light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}/>
    <path d="M36 2v12h12L36 2z"
          fill={light ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
    <path d="M14 20l8 12m0-12l-8 12"
          stroke={light ? 'rgba(212,188,148,0.9)' : '#a7802d'}
          strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M26 20h10M26 26h8M26 32h10"
          stroke={light ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
          strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const TEMAS = {
  tinto: {
    bg     : 'linear-gradient(145deg, #3d0d1a 0%, #691c32 50%, #7e2240 100%)',
    border : 'rgba(212,188,148,0.25)',
    borderH: 'rgba(212,188,148,0.6)',
    glow   : 'rgba(105,28,50,0.5)',
    accent : '#d4bc94',
    sub    : 'rgba(212,188,148,0.55)',
    ok_bg  : 'rgba(212,188,148,0.12)',
  },
  verde: {
    bg     : 'linear-gradient(145deg, #0d2e26 0%, #245c4f 50%, #2d7060 100%)',
    border : 'rgba(212,188,148,0.25)',
    borderH: 'rgba(212,188,148,0.6)',
    glow   : 'rgba(36,92,79,0.5)',
    accent : '#d4bc94',
    sub    : 'rgba(212,188,148,0.55)',
    ok_bg  : 'rgba(212,188,148,0.12)',
  },
}

/**
 * Tarjeta de subida de archivos .xlsx con drag-and-drop.
 * Maneja los estados: vacío, subiendo, ok y error.
 * Los temas `tinto` y `verde` corresponden al color de fondo de la tarjeta.
 * @param {{ titulo:string, hint:string, onUpload:(archivo:File)=>Promise<{nombre:string,bytes:number}>, nombreActual?:string, paso:number, tema?:'tinto'|'verde' }} props
 */
export default function UploadCard({ titulo, hint, onUpload, nombreActual, paso, tema = 'tinto' }) {
  const inputRef   = useRef(null)
  const [estado, setEstado]   = useState(nombreActual ? 'ok' : 'vacio')
  const [nombre, setNombre]   = useState(nombreActual || '')
  const [dragging, setDragging] = useState(false)

  const manejar = async (archivo) => {
    if (!archivo) return
    setEstado('subiendo')
    setNombre(archivo.name)
    try {
      const data = await onUpload(archivo)
      const mb   = (data.bytes / 1024 / 1024).toFixed(1)
      setNombre(`${data.nombre}  ·  ${mb} MB`)
      setEstado('ok')
    } catch (e) {
      setNombre(e.response?.data?.detail || 'Error al subir el archivo')
      setEstado('error')
    }
  }

  const onDrop = (e) => { e.preventDefault(); setDragging(false); manejar(e.dataTransfer.files[0]) }
  const t      = TEMAS[tema]
  const ok     = estado === 'ok'
  const sub    = estado === 'subiendo'
  const err    = estado === 'error'

  return (
    <div
      onClick={() => !ok && !sub && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); if (!ok) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        background : t.bg,
        borderRadius: 20,
        border: `1.5px solid ${ok ? 'rgba(167,128,45,0.5)' : err ? 'rgba(220,38,38,0.5)' : dragging ? t.borderH : t.border}`,
        boxShadow: dragging
          ? `0 0 0 4px ${t.glow}, 0 20px 40px rgba(0,0,0,0.3)`
          : ok
          ? '0 8px 32px rgba(167,128,45,0.2), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 8px 32px rgba(0,0,0,0.2)',
        cursor   : ok ? 'default' : 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform : dragging ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
        userSelect: 'none',
        minHeight : 240,
        display   : 'flex', flexDirection: 'column',
        overflow  : 'hidden',
        position  : 'relative',
      }}
    >
      <input ref={inputRef} type="file" accept=".xlsx"
             style={{ display: 'none' }}
             onChange={e => manejar(e.target.files[0])} />

      {/* Brillo de fondo al hacer hover */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(212,188,148,0.07) 0%, transparent 65%)',
        opacity: dragging ? 1 : 0.6, transition: 'opacity 0.25s',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: ok ? 'rgba(167,128,45,0.9)' : 'rgba(212,188,148,0.15)',
            border: `1.5px solid ${ok ? '#a7802d' : 'rgba(212,188,148,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: ok ? 'white' : t.accent,
            transition: 'all 0.3s', flexShrink: 0,
          }}>
            {ok ? '✓' : paso}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.accent, letterSpacing: 0.3 }}>
            {titulo}
          </span>
        </div>
        {ok && (
          <button
            onClick={e => { e.stopPropagation(); setEstado('vacio'); setNombre('') }}
            title="Cambiar archivo"
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              padding: '3px 10px', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >cambiar</button>
        )}
      </div>

      {/* Cuerpo */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px 24px', gap: 12, textAlign: 'center',
      }}>
        {!ok ? (
          <>
            <div style={{ opacity: sub ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <IconExcel light />
            </div>

            {sub ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(212,188,148,0.3)',
                  borderTopColor: '#d4bc94',
                  animation: 'epi-girar 0.75s linear infinite', flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: t.accent, fontWeight: 500 }}>
                  Subiendo {nombre}…
                </span>
              </div>
            ) : err ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>⚠ Error al subir</span>
                <span style={{ fontSize: 11, color: 'rgba(248,113,113,0.7)' }}>{nombre}</span>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                    {dragging ? '¡Suelta aquí!' : 'Arrastra tu archivo'}
                  </div>
                  <div style={{ fontSize: 12, color: t.sub }}>
                    {dragging ? 'Archivo .xlsx listo para subir' : 'o haz clic para buscar'}
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 100,
                  background: 'rgba(212,188,148,0.1)',
                  border: '1px solid rgba(212,188,148,0.2)',
                  fontSize: 11, color: t.sub,
                }}>
                  {hint}
                </div>
              </>
            )}
          </>
        ) : (
          /* Estado OK */
          <div style={{
            width: '100%', padding: '16px 18px',
            background: t.ok_bg,
            border: '1px solid rgba(212,188,148,0.2)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>📊</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#d4bc94',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{nombre}</div>
              <div style={{ fontSize: 11, color: 'rgba(212,188,148,0.5)', marginTop: 3 }}>
                Archivo cargado ✓
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
