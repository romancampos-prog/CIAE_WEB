import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DURACION = 5000

export default function ReporteToast({ ultimoReporte }) {
  const [visible, setVisible]     = useState(false)
  const [saliendo, setSaliendo]   = useState(false)
  const [progreso, setProgreso]   = useState(100)

  useEffect(() => {
    if (!ultimoReporte) return

    // Pequeño delay para que la animación de entrada se vea
    const t1 = setTimeout(() => setVisible(true), 120)

    // Barra de progreso
    const inicio  = Date.now()
    const intervalo = setInterval(() => {
      const elapsed = Date.now() - inicio
      const pct = Math.max(0, 100 - (elapsed / DURACION) * 100)
      setProgreso(pct)
      if (pct <= 0) clearInterval(intervalo)
    }, 30)

    // Auto-cerrar
    const t2 = setTimeout(() => cerrar(), DURACION)

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(intervalo) }
  }, [ultimoReporte])

  const cerrar = () => {
    setSaliendo(true)
    setTimeout(() => { setVisible(false); setSaliendo(false) }, 350)
  }

  if (!visible || !ultimoReporte) return null

  return createPortal(
    <div style={{
      position: 'fixed', top: 80, right: 24, zIndex: 2000,
      width: 320,
      transform: saliendo ? 'translateX(calc(100% + 32px))' : 'translateX(0)',
      opacity: saliendo ? 0 : 1,
      transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
      animation: saliendo ? 'none' : 'epi-toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <style>{`
        @keyframes epi-toastIn {
          from { transform: translateX(calc(100% + 32px)); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255,255,255,0.6)',
        overflow: 'hidden',
      }}>
        {/* Contenido */}
        <div style={{ padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'center' }}>

          {/* Ícono */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #245c4f, #2d7060)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, boxShadow: '0 3px 10px rgba(36,92,79,0.2)',
          }}>✓</div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              REPORTE DISPONIBLE
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Navega desde el menú lateral
            </div>
          </div>

          {/* Cerrar */}
          <button onClick={cerrar} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#cbd5e1', fontSize: 16, lineHeight: 1, padding: 2,
            flexShrink: 0, transition: 'color 0.15s', marginTop: -2,
          }}
            onMouseOver={e => e.currentTarget.style.color = '#64748b'}
            onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
          >✕</button>
        </div>

        {/* Barra de progreso */}
        <div style={{ height: 3, background: '#f1f5f9' }}>
          <div style={{
            height: '100%',
            width: `${progreso}%`,
            background: 'linear-gradient(90deg, #245c4f, #a7802d)',
            borderRadius: 2,
            transition: 'width 0.03s linear',
          }} />
        </div>
      </div>
    </div>,
    document.body
  )
}
