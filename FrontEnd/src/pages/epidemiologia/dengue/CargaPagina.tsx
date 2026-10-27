// propios
import { CorgiOverlay, ReporteToast, UploadCard, useCargaBases } from '@/features/dengue';
import { textoAcento } from '@/utils/colorAcento';

/**
 * Página de carga de archivos y ejecución del pipeline de dengue.
 * Muestra el progreso de carga (Base Operativa → Base SisCep → Ejecutar) y
 * bloquea la UI con el overlay corgi mientras el análisis está en curso.
 */
export default function CargaPagina() {
  const { estado, ejecutar, listos, subir, ambosListos, corriendo, completado, hayError, cuenta } = useCargaBases()

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: 32,
    }}>

      {/* ── Overlay corgi mientras corre el pipeline ── */}
      {corriendo && <CorgiOverlay paso={estado?.paso} />}

      {/* ── Hero header ── */}
      <div className="epi-carga-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div className="epi-carga-titleblock">
          <div className="epi-carga-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(105,28,50,0.08)',
            border: '1px solid rgba(105,28,50,0.15)',
            borderRadius: 100, padding: '4px 14px',
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--tinto-texto)',
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
          <h1 className="epi-carga-titulo" style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800,
            color: 'var(--texto)', letterSpacing: '-1px', margin: '0 0 6px',
            lineHeight: 1.1,
          }}>
            Carga de{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #245c4f, #a7802d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>bases de datos</span>
          </h1>
          <p className="epi-carga-sub" style={{ fontSize: 13, color: 'var(--texto-tenue)', margin: 0 }}>
            Sube los archivos Excel para ejecutar el análisis epidemiológico
          </p>
        </div>

        {/* Último reporte */}
        {estado?.ultimo_reporte && (
          <div className="epi-carga-reporte" style={{
            flexShrink: 0,
            background: 'var(--superficie)',
            border: '1px solid rgba(167,128,45,0.2)',
            borderRadius: 14, padding: '10px 16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'right',
          }}>
            <div className="epi-carga-reporte-label" style={{ fontSize: 10, fontWeight: 700, color: '#a4a4a4', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>
              Último reporte
            </div>
            <div className="epi-carga-reporte-valor" style={{ fontSize: 13, fontWeight: 700, color: 'var(--oro-texto)' }}>
              {estado.ultimo_reporte}
            </div>
          </div>
        )}
      </div>

      {/* ── Progreso ── */}
      <div className="epi-progreso-bar" style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--superficie)', borderRadius: 16,
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
          <div key={n} className="epi-progreso-item" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div className="epi-progreso-inner" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div className="epi-progreso-circle" style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                background: done ? color : n <= cuenta + 1 ? `${color}22` : 'var(--superficie-alterna)',
                color: done ? 'white' : n <= cuenta + 1 ? textoAcento(color) : 'var(--texto-tenue)',
                border: `2px solid ${done ? color : n <= cuenta + 1 ? `${color}44` : 'var(--borde)'}`,
                transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: done ? `0 3px 10px ${color}44` : 'none',
              }}>
                {done ? '✓' : n}
              </div>
              <span className="epi-progreso-label" style={{
                fontSize: 12, fontWeight: done ? 700 : 500,
                color: done || n <= cuenta + 1 ? textoAcento(color) : 'var(--texto-tenue)',
                whiteSpace: 'nowrap', transition: 'color 0.3s',
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div className="epi-progreso-sep" style={{
                flex: 1, height: 2, margin: '0 12px',
                background: done ? `linear-gradient(90deg, ${color}, ${['#245c4f','#a7802d'][i]})` : 'var(--superficie-alterna)',
                borderRadius: 2, transition: 'background 0.4s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Cards de subida ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: 16 }}>
        <UploadCard
          paso={1} tema="tinto"
          titulo="Base Operativa (SINAVE)"
          hint="Archivo .xlsx — SINAVE / base operativa"
          onUpload={subir('operativa')}
          nombreActual={estado?.archivos?.operativa ? '(archivo previo disponible)' : ''}
        />
        <UploadCard
          paso={2} tema="verde"
          titulo="Base SisCep"
          hint="Archivo .xlsx — resultados de laboratorio"
          onUpload={subir('siscep')}
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
              : 'var(--superficie-marcada)',
            color: ambosListos && !corriendo ? 'white' : 'var(--texto-tenue)',
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
                borderTopColor: 'var(--superficie)',
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

        {/* Último reporte — en mobile va acá abajo en vez de en el hero
            (ver .epi-carga-reporte-mobile / .epi-carga-reporte en epi.css) */}
        {estado?.ultimo_reporte && (
          <p className="epi-carga-reporte-mobile">
            Último reporte: {estado.ultimo_reporte}
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
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--peligro-texto)', marginBottom: 4 }}>
              Error en el pipeline
            </div>
            <code style={{ fontSize: 11, color: 'var(--peligro-texto)', fontFamily: 'monospace' }}>
              {estado?.error}
            </code>
          </div>
        </div>
      )}

      <ReporteToast ultimoReporte={estado?.ultimo_reporte ?? null} />
    </div>
  )
}
