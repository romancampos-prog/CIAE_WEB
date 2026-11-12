// react
import { useNavigate } from 'react-router-dom'
// propios
import { IconoModuloAcciones, IconoModuloDengue } from '@/components/icons';
import { useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import '@/styles/inicio.css';
import '@/styles/epidemiologia.css';



export default function PortadaEpidemiologiaPagina() {
  const navigate = useNavigate()
  // Dengue es de los internos; el usuario de unidad solo ve Acciones.
  const { puedeVerDengue } = useRol()

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
            background: 'linear-gradient(135deg, var(--epi-verde) 0%, var(--epi-dorado) 50%, var(--epi-guinda) 100%)',
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

          {puedeVerDengue && (
            <NavCard
              titulo="Dengue"
              eyebrow="Módulo activo"
              desc="Canal endémico, mapa de casos por municipio, alertas SisCep y detección de registros duplicados."
              chips={['Canal', 'Mapa', 'Alertas SisCep', 'Duplicados']}
              color="tinto"
              onClick={() => navigate('/CIAE/Epidemiologia/dengue')}
            >
              <IconoModuloDengue />
            </NavCard>
          )}

          <NavCard
            titulo="Acciones"
            eyebrow="Reporte OC30 · FTP"
            desc="Registros del reporte OC30 por unidad y clave, con su estatus de seguimiento y su estudio."
            chips={['OC30', 'Estatus', 'Estudios']}
            color="green"
            onClick={() => navigate('/CIAE/Epidemiologia/acciones')}
          >
            <IconoModuloAcciones />
          </NavCard>

        </div>
      </main>
    </div>
  )
}
