import { useState, useEffect } from 'react'
import UploadCard from '../componentes/carga/UploadCard'
import { subirOperativa, subirSiscep } from '../api/archivos'
import { usePipeline } from '../contexto/PipelineContext'
import ReporteToast from '../componentes/comun/ReporteToast'
import corgiGif from '../../../assets/corgi.gif'

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
 * @param {{ paso: string|null }} props - Paso actual reportado por el backend (o null)
 */
function CorgiOverlay({ paso }) {
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
        background: 'white', borderRadius: 20,
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

        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#245c4f', marginBottom: 4 }}>
          {paso || PASOS_MSGS[idx]}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 24 }}>
          Por favor, no cierre esta ventana.
        </div>

        <div style={{ width: '100%', height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
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

/**
 * Página de carga de archivos y ejecución del pipeline de dengue.
 * Muestra el progreso de carga (Base Operativa → Base SisCep → Ejecutar) y
 * bloquea la UI con el overlay corgi mientras el análisis está en curso.
 */
export default function CargaPage() {
  const { estado, ejecutar } = usePipeline()
  const [listos, setListos] = useState({ operativa: false, siscep: false })
  const [toastTick, setToastTick] = useState(0)

  // Dispara el toast en cada visita a esta página y cuando termina un pipeline nuevo
  useEffect(() => {
    if (estado?.ultimo_reporte) setToastTick(t => t + 1)
  }, [estado?.ultimo_reporte])

  /**
   * Fábrica de handler de subida de archivos.
   * @param {'operativa'|'siscep'} tipo - Tipo de archivo a subir
   * @returns {Function} Handler async que sube el archivo y marca ese paso como listo
   */
  const handleSubir = (tipo) => async (archivo) => {
    const fn = tipo === 'operativa' ? subirOperativa : subirSiscep
    const { data } = await fn(archivo)
    setListos(prev => ({ ...prev, [tipo]: true }))
    return data.data
  }

  const ambosListos = listos.operativa && listos.siscep
  const corriendo   = estado?.corriendo
  const completado  = estado?.completado
  const hayError    = !!estado?.error
  const cuenta      = (listos.operativa ? 1 : 0) + (listos.siscep ? 1 : 0)

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: 32,
    }}>

      {/* ── Overlay corgi mientras corre el pipeline ── */}
      {corriendo && <CorgiOverlay paso={estado?.paso} />}

      {/* ── Hero header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(105,28,50,0.08)',
            border: '1px solid rgba(105,28,50,0.15)',
            borderRadius: 100, padding: '4px 14px',
            fontSize: '0.65rem', fontWeight: 700, color: '#691c32',
            textTransform: 'uppercase', letterSpacing: '1px',
            marginBottom: 12,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#a7802d',
              boxShadow: '0 0 0 0 rgba(167,128,45,0.6)',
              animation: 'epi-pulse 2.2s ease infinite',
              display: 'inline-block',
            }} />
            Sistema de Vigilancia del Dengue
          </div>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800,
            color: '#1e293b', letterSpacing: '-1px', margin: '0 0 6px',
            lineHeight: 1.1,
          }}>
            Carga de{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #245c4f, #a7802d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>bases de datos</span>
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Sube los archivos Excel para ejecutar el análisis epidemiológico
          </p>
        </div>

        {/* Último reporte */}
        {estado?.ultimo_reporte && (
          <div style={{
            flexShrink: 0,
            background: 'white',
            border: '1px solid rgba(167,128,45,0.2)',
            borderRadius: 14, padding: '10px 16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#a4a4a4', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>
              Último reporte
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a7802d' }}>
              {estado.ultimo_reporte}
            </div>
          </div>
        )}
      </div>

      {/* ── Progreso ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'white', borderRadius: 16,
        padding: '14px 22px',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        gap: 0,
      }}>
        {[
          { n: 1, label: 'Base Operativa (SINAVE)', done: listos.operativa, color: '#691c32' },
          { n: 2, label: 'Base SisCep',    done: listos.siscep,    color: '#245c4f' },
          { n: 3, label: 'Ejecutar',        done: completado,       color: '#a7802d' },
        ].map(({ n, label, done, color }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                background: done ? color : n <= cuenta + 1 ? `${color}22` : '#f1f5f9',
                color: done ? 'white' : n <= cuenta + 1 ? color : '#94a3b8',
                border: `2px solid ${done ? color : n <= cuenta + 1 ? `${color}44` : '#e2e8f0'}`,
                transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: done ? `0 3px 10px ${color}44` : 'none',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{
                fontSize: 12, fontWeight: done ? 700 : 500,
                color: done ? color : n <= cuenta + 1 ? color : '#94a3b8',
                whiteSpace: 'nowrap', transition: 'color 0.3s',
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{
                flex: 1, height: 2, margin: '0 12px',
                background: done ? `linear-gradient(90deg, ${color}, ${['#245c4f','#a7802d'][i]})` : '#f1f5f9',
                borderRadius: 2, transition: 'background 0.4s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Cards de subida ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <UploadCard
          paso={1} tema="tinto"
          titulo="Base Operativa (SINAVE)"
          hint="Archivo .xlsx — SINAVE / base operativa"
          onUpload={handleSubir('operativa')}
          nombreActual={estado?.archivos?.operativa ? '(archivo previo disponible)' : ''}
        />
        <UploadCard
          paso={2} tema="verde"
          titulo="Base SisCep"
          hint="Archivo .xlsx — resultados de laboratorio"
          onUpload={handleSubir('siscep')}
          nombreActual={estado?.archivos?.siscep ? '(archivo previo disponible)' : ''}
        />
      </div>

      {/* ── Botón ejecutar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          disabled={!ambosListos || corriendo}
          onClick={ejecutar}
          style={{
            width: '100%', maxWidth: 400, padding: '15px 32px',
            background: ambosListos && !corriendo
              ? 'linear-gradient(135deg, #691c32 0%, #a7802d 100%)'
              : '#e2e8f0',
            color: ambosListos && !corriendo ? 'white' : '#94a3b8',
            border: 'none', borderRadius: 100,
            fontSize: '0.95rem', fontWeight: 700,
            cursor: ambosListos && !corriendo ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: ambosListos && !corriendo
              ? '0 6px 24px rgba(105,28,50,0.35)'
              : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
          onMouseOver={e => { if (ambosListos && !corriendo) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(105,28,50,0.45)' }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ambosListos && !corriendo ? '0 6px 24px rgba(105,28,50,0.35)' : 'none' }}
        >
          {corriendo ? (
            <>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                animation: 'epi-girar 0.75s linear infinite',
              }} />
              {estado?.paso || 'Procesando…'}
            </>
          ) : completado
            ? '↻  Generar nuevo reporte'
            : '▶  Ejecutar pipeline completo'
          }
        </button>

        {!ambosListos && !corriendo && (
          <p style={{ fontSize: 11, color: '#a4a4a4', margin: 0 }}>
            {cuenta === 0
              ? 'Sube ambos archivos para continuar'
              : listos.operativa ? '· Falta la Base SisCep'
              : '· Falta la Base Operativa'}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {hayError && (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'rgba(220,38,38,0.05)',
          border: '1px solid rgba(220,38,38,0.2)',
          display: 'flex', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
              Error en el pipeline
            </div>
            <code style={{ fontSize: 11, color: '#dc2626', fontFamily: 'monospace' }}>
              {estado.error}
            </code>
          </div>
        </div>
      )}

      <ReporteToast ultimoReporte={estado?.ultimo_reporte} trigger={toastTick} />
    </div>
  )
}
