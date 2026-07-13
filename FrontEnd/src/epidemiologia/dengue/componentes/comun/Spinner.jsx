import { useState, useEffect } from 'react'
import corgiGif from '../../../../assets/corgi.gif'

const MENSAJES = [
  'Cargando datos…',
  'Conectando con el servidor…',
  'Procesando información…',
  'Casi listo…',
]

/**
 * Pantalla de carga con corgi animado para el módulo Epidemiología.
 * Si no se pasa `texto`, rota mensajes genéricos cada 2.5 s.
 * @param {{ texto?: string }} props
 */
export default function DengueSpinner({ texto }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MENSAJES.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '64px 0', minHeight: 300,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '40px 36px 36px',
        textAlign: 'center',
        width: 320,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        border: '1px solid rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Barra de color superior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #245c4f, #a7802d, #691c32)',
          backgroundSize: '200% 100%',
          animation: 'epi-barFlow 2s ease infinite',
        }} />

        <img
          src={corgiGif}
          alt="Cargando"
          style={{ width: 150, height: 'auto', borderRadius: 10, marginBottom: 20 }}
        />

        <div style={{
          fontSize: '1.05rem', fontWeight: 700, color: '#245c4f', marginBottom: 6,
        }}>
          {texto || MENSAJES[idx]}
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 24 }}>
          Por favor, no cierre esta ventana.
        </div>

        {/* Barra de progreso */}
        <div style={{
          width: '100%', height: 5, background: '#f1f5f9',
          borderRadius: 10, overflow: 'hidden',
        }}>
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
