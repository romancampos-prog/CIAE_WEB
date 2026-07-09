import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function PanelDeslizante({ titulo, badge, children, labelBoton, ocultarBoton, open, onToggle }) {
  const [interno, setInterno] = useState(false)
  const abierto = open !== undefined ? open : interno
  const toggle  = onToggle ?? (() => setInterno(v => !v))

  if (badge === 0) return null

  return (
    <>
      {/* Botón flotante — oculto si ocultarBoton=true */}
      {!ocultarBoton && createPortal(
        <button onClick={toggle} style={{
          position: 'fixed', bottom: 50, right: 24, zIndex: 1200,
          background: 'linear-gradient(135deg, #5a0606, #7e0808)',
          color: '#fff', border: 'none', borderRadius: 100,
          padding: '11px 18px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(126,8,8,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          fontFamily: 'inherit',
        }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(126,8,8,0.5)' }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(126,8,8,0.4)' }}
        >
          {labelBoton}
          <span style={{
            background: '#9a7026', borderRadius: 100,
            padding: '2px 9px', fontSize: 11, minWidth: 22, textAlign: 'center',
            fontWeight: 700,
          }}>{badge}</span>
        </button>,
        document.body
      )}

      {/* Overlay y panel — también via portal */}
      {createPortal(
        <>
          {/* Overlay */}
          <div
            onClick={toggle}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1300,
              opacity: abierto ? 1 : 0,
              pointerEvents: abierto ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          />

          {/* Panel lateral */}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            width: 640, maxWidth: '92vw', height: '100vh',
            background: '#fff',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
            zIndex: 1400,
            display: 'flex', flexDirection: 'column',
            transform: abierto ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Header del panel */}
            <div style={{
              background: 'linear-gradient(135deg, #5a0606, #7e0808)',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{titulo}</h3>
              <button onClick={toggle} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                width: 28, height: 28, borderRadius: 8,
                fontSize: 16, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Contenido */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 0 24px' }}>
              {children}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
