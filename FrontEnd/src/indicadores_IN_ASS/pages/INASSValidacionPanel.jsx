import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function INASSValidacionPanel({ errores, trigger = 0 }) {
  const [visible,  setVisible]  = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    if (!errores?.length || !trigger) return

    setVisible(false)
    setSaliendo(false)

    const t1 = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t1)
  }, [trigger])

  const cerrar = () => {
    setSaliendo(true)
    setTimeout(() => { setVisible(false); setSaliendo(false) }, 380)
  }

  if (!visible || !errores?.length) return null

  return createPortal(
    <div style={{
      position: 'fixed', top: 80, left: 24, zIndex: 2000,
      width: 380,
      transform: saliendo ? 'translateX(calc(-100% - 32px))' : 'translateX(0)',
      opacity:   saliendo ? 0 : 1,
      transition: 'transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
      animation:  saliendo ? 'none' : 'ivp-in 0.42s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <style>{`
        @keyframes ivp-in {
          from { transform: translateX(calc(-100% - 32px)); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        background:          'rgba(255,255,255,0.94)',
        backdropFilter:      'blur(18px)',
        WebkitBackdropFilter:'blur(18px)',
        borderRadius:        18,
        boxShadow:           '0 10px 40px rgba(180,28,28,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        border:              '1px solid rgba(220,38,38,0.2)',
        overflow:            'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:    '12px 14px 11px',
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          borderBottom: '1px solid rgba(220,38,38,0.1)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background:  'linear-gradient(135deg, #b91c1c, #dc2626)',
            display:     'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow:   '0 3px 10px rgba(185,28,28,0.3)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.9px' }}>
              Excel incorrecto
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 1 }}>
              {errores.length} {errores.length === 1 ? 'problema encontrado' : 'problemas encontrados'}
            </div>
          </div>

          <button
            onClick={cerrar}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#cbd5e1', fontSize: 15, lineHeight: 1, padding: 3,
              flexShrink: 0, transition: 'color 0.15s', borderRadius: 6,
            }}
            onMouseOver={e => e.currentTarget.style.color = '#64748b'}
            onMouseOut={e  => e.currentTarget.style.color = '#cbd5e1'}
          >✕</button>
        </div>

        {/* Lista de errores */}
        <div style={{
          maxHeight:  300,
          overflowY:  'auto',
          padding:    '8px 0',
        }}>
          {errores.map((err, i) => (
            <div key={i} style={{
              display:   'flex',
              gap:       9,
              padding:   '7px 14px',
              borderBottom: i < errores.length - 1 ? '1px solid rgba(241,245,249,0.9)' : 'none',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: '#ef4444', marginTop: 5,
              }} />
              <span style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.5 }}>
                {err}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>,
    document.body
  )
}
