// react
import { useEffect, useState } from 'react'
// propios
import corgiGif from '@/assets/corgi.gif';

const PASOS_MSGS = [
  'Analizando bases de datos…',
  'Depurando registros…',
  'Detectando duplicados…',
  'Calculando canal endémico…',
  'Generando mapas…',
  'Procesando alertas SisCep…',
  'Casi listo…',
]

/**
 * Overlay de pantalla completa que bloquea la UI mientras corre el pipeline.
 * Rota automáticamente mensajes de progreso cada 2.5 s.
 * paso = el que reporta el backend (o nada).
 */
export default function CorgiOverlay({ paso }: { paso: string | null | undefined }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PASOS_MSGS.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,16,12,0.72)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'var(--superficie)', borderRadius: 20,
        padding: '40px 36px 36px',
        textAlign: 'center', width: 340,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Barra de color superior animada */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #245c4f, #a7802d, #691c32)',
          backgroundSize: '200% 100%',
          animation: 'epi-barFlow 2s ease infinite',
        }} />

        <img
          src={corgiGif}
          alt="Procesando"
          style={{ width: 150, height: 'auto', borderRadius: 10, marginBottom: 20 }}
        />

        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primario-texto)', marginBottom: 4 }}>
          {paso || PASOS_MSGS[idx]}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', marginBottom: 24 }}>
          Por favor, no cierre esta ventana.
        </div>

        <div style={{ width: '100%', height: 5, background: 'var(--superficie-alterna)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            width: '35%', height: '100%',
            background: 'linear-gradient(90deg, #245c4f, #1a7a62)',
            borderRadius: 10,
            animation: 'epi-moveBar 1.4s ease-in-out infinite',
          }} />
        </div>

        <style>{`
          @keyframes epi-barFlow {
            0%   { background-position: 0%; }
            50%  { background-position: 100%; }
            100% { background-position: 0%; }
          }
          @keyframes epi-moveBar {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(320%); }
          }
        `}</style>
      </div>
    </div>
  )
}
