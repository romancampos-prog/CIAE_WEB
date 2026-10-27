// react
import { useNavigate } from 'react-router-dom'
// propios
import { IconoEpidemiologia } from '@/components/icons';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import '@/styles/inicio.css';
import '@/styles/epidemiologia.css';

const IconMosquito = () => (
  <IconoEpidemiologia />
)


export default function PortadaEpidemiologiaPagina() {
  const navigate = useNavigate()

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" aria-hidden="true" />
      <div className="epi-blob epi-blob-2" aria-hidden="true" />
      <div className="epi-blob epi-blob-3" aria-hidden="true" />
      <div className="epi-grid"            aria-hidden="true" />

      <TopBar backTo="/CIAE/Inicio" />

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
          <p style={{ fontSize: 14, color: 'var(--texto-suave)', margin: 0 }}>
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
