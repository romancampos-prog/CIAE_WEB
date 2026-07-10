import { useNavigate } from 'react-router-dom'
import DengueHeader from '../componentes/plantilla/Header'
import NavCard from '@shared/componentes/NavCard'
import '@paginas/inicio/inicio.css'

const IconMosquito = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="19" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9"/>
    <ellipse cx="18" cy="19" rx="5" ry="12" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
    <line x1="6" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
    <path d="M8 13.5 Q18 10.5 28 13.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
    <path d="M8 24.5 Q18 27.5 28 24.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
    <circle cx="31" cy="30" r="8" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.95" fill="none"/>
    <line x1="37" y1="36" x2="43" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.95"/>
    <circle cx="31" cy="30" r="2.6" fill="currentColor" fillOpacity="0.85"/>
    <line x1="31" y1="25.8" x2="31" y2="24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="31" y1="34.2" x2="31" y2="36" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="26.8" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="35.2" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="27.9" y1="27.1" x2="26.7" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="34.1" y1="32.9" x2="35.3" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="34.1" y1="27.1" x2="35.3" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="27.9" y1="32.9" x2="26.7" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)


/**
 * Pantalla de selección de enfermedad en el módulo Epidemiología.
 * Muestra tarjetas de navegación: una activa (Dengue) y las pendientes de desarrollo.
 */
export default function EpiLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" aria-hidden="true" />
      <div className="epi-blob epi-blob-2" aria-hidden="true" />
      <div className="epi-blob epi-blob-3" aria-hidden="true" />
      <div className="epi-grid"            aria-hidden="true" />

      <DengueHeader />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h1 style={{
            fontSize: 34, fontWeight: 800, margin: '0 0 10px',
            background: 'linear-gradient(135deg, #245c4f 0%, #a7802d 50%, #691c32 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Vigilancia Epidemiológica
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Selecciona la enfermedad prioritaria que deseas consultar
          </p>
        </div>

        <div className="home-cards">

          <NavCard
            titulo="Dengue"
            eyebrow="Módulo activo"
            desc="Canal endémico, mapa de casos por municipio, alertas SisCep y detección de registros duplicados."
            chips={['Canal', 'Mapa', 'Alertas SisCep', 'Duplicados']}
            color="tinto"
            onClick={() => navigate('/CIAE/Epidemiologia/dengue')}
          >
            <IconMosquito />
          </NavCard>

        </div>
      </main>
    </div>
  )
}
