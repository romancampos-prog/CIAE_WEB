// react
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DURACION = 6000

/**
 * Toast de notificación que muestra el nombre del último reporte generado.
 * Aparece al entrar a la página y cada vez que llega un reporte nuevo; se cierra solo a los 6 s.
 * Incluye una barra de progreso animada que indica el tiempo restante.
 */
export default function ReporteToast({ ultimoReporte }: { ultimoReporte: string | null }) {
  if (!ultimoReporte) return null
  // Con el reporte como key, uno nuevo vuelve a montar el toast y arranca su animación desde cero.
  return <ToastReporte key={ultimoReporte} ultimoReporte={ultimoReporte} />
}

function ToastReporte({ ultimoReporte }: { ultimoReporte: string }) {
  const [visible,  setVisible]  = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [progreso, setProgreso] = useState(100)

  const cerrar = () => {
    setSaliendo(true)
    setTimeout(() => { setVisible(false); setSaliendo(false) }, 350)
  }

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 200)

    const inicio    = Date.now()
    const intervalo = setInterval(() => {
      const elapsed = Date.now() - inicio
      const pct     = Math.max(0, 100 - (elapsed / DURACION) * 100)
      setProgreso(pct)
      if (pct <= 0) clearInterval(intervalo)
    }, 30)

    const t2 = setTimeout(() => {
      setSaliendo(true)
      setTimeout(() => { setVisible(false); setSaliendo(false) }, 350)
    }, DURACION)

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(intervalo) }
  }, [])

  if (!visible) return null

  return createPortal(
    <div className="epi-toast" style={{
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
        background: 'rgba(var(--superficie-rgb), 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(var(--superficie-rgb), 0.6)',
        overflow: 'hidden',
      }}>
        <div className="epi-toast-content" style={{ padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'center' }}>

          <div className="epi-toast-icon" style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #245c4f, #2d7060)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 3px 10px rgba(36,92,79,0.25)',
          }}>📋</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="epi-toast-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Último reporte generado
            </div>
            <div className="epi-toast-valor" style={{ fontSize: 14, fontWeight: 800, color: 'var(--texto)', marginTop: 2, lineHeight: 1.2 }}>
              {ultimoReporte}
            </div>
          </div>

          <button onClick={cerrar} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--texto-deshabilitado)', fontSize: 16, lineHeight: 1, padding: 2,
            flexShrink: 0, transition: 'color 0.15s', marginTop: -2,
          }}
            onMouseOver={e => e.currentTarget.style.color = '#64748b'}
            onMouseOut={e  => e.currentTarget.style.color = '#cbd5e1'}
          >✕</button>
        </div>

        <div style={{ height: 3, background: 'var(--superficie-alterna)' }}>
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
