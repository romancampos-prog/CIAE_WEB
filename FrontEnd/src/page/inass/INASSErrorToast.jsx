import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DURACION = 8000

export default function INASSErrorToast({ mensaje, trigger = 0 }) {
  const [visible,  setVisible]  = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [progreso, setProgreso] = useState(100)

  useEffect(() => {
    if (!mensaje || !trigger) return

    setVisible(false)
    setSaliendo(false)
    setProgreso(100)

    const t1 = setTimeout(() => setVisible(true), 100)

    const inicio    = Date.now()
    const intervalo = setInterval(() => {
      const elapsed = Date.now() - inicio
      const pct     = Math.max(0, 100 - (elapsed / DURACION) * 100)
      setProgreso(pct)
      if (pct <= 0) clearInterval(intervalo)
    }, 30)

    const t2 = setTimeout(() => cerrar(), DURACION)

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(intervalo) }
  }, [trigger])

  const cerrar = () => {
    setSaliendo(true)
    setTimeout(() => { setVisible(false); setSaliendo(false) }, 350)
  }

  if (!visible || !mensaje) return null

  return createPortal(
    <div style={{
      position: 'fixed', top: 80, left: 24, zIndex: 2000,
      width: 340,
      transform: saliendo ? 'translateX(calc(-100% - 32px))' : 'translateX(0)',
      opacity: saliendo ? 0 : 1,
      transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
      animation: saliendo ? 'none' : 'inass-toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <style>{`
        @keyframes inass-toastIn {
          from { transform: translateX(calc(-100% - 32px)); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(180,30,30,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(220,60,60,0.18)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>

          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Excel incorrecto
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 3, lineHeight: 1.4 }}>
              {mensaje}
            </div>
          </div>

          <button onClick={cerrar} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#cbd5e1', fontSize: 16, lineHeight: 1, padding: 2,
            flexShrink: 0, transition: 'color 0.15s', marginTop: -1,
          }}
            onMouseOver={e => e.currentTarget.style.color = '#64748b'}
            onMouseOut={e  => e.currentTarget.style.color = '#cbd5e1'}
          >✕</button>
        </div>

        <div style={{ height: 3, background: '#fee2e2' }}>
          <div style={{
            height: '100%',
            width: `${progreso}%`,
            background: 'linear-gradient(90deg, #b91c1c, #f97316)',
            borderRadius: 2,
            transition: 'width 0.03s linear',
          }} />
        </div>
      </div>
    </div>,
    document.body
  )
}
