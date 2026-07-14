import { NavLink } from 'react-router-dom'
import { usePipeline } from '../../contexto/PipelineContext'

const NAV = [
  { to: '/CIAE/Epidemiologia/dengue',                  icono: '📂', label: 'Carga de datos',   bloqueable: false },
  { to: '/CIAE/Epidemiologia/dengue/canal',            icono: '📊', label: 'Canal endémico',   bloqueable: true  },
  { to: '/CIAE/Epidemiologia/dengue/mapa/situacion',   icono: '🗺️', label: 'Mapa situación',   bloqueable: true  },
  { to: '/CIAE/Epidemiologia/dengue/mapa/confirmados', icono: '🗺️', label: 'Mapa confirmados', bloqueable: true  },
  { to: '/CIAE/Epidemiologia/dengue/alertas',          icono: '⚠️', label: 'Alertas SisCep',   bloqueable: true  },
  { to: '/CIAE/Epidemiologia/dengue/duplicados',       icono: '⧉',  label: 'Duplicados',       bloqueable: true  },
]

/**
 * Sidebar de navegación del módulo Epidemiología.
 * Soporta modo colapsado (solo iconos). Deshabilita las rutas de reporte
 * mientras el pipeline está en ejecución para evitar lecturas de datos parciales.
 * @param {{ collapsed: boolean, onToggle: Function }} props
 */
export default function DengueSidebar({ collapsed, onToggle }) {
  const { estado } = usePipeline()
  const corriendo  = !!estado?.corriendo

  return (
    <nav className={`epi-sidebar${collapsed ? ' epi-sidebar--collapsed' : ''}`}>

      <button className="epi-sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expandir' : 'Colapsar'}>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform 0.3s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {!collapsed && (
        <div className="epi-sidebar-label">Módulos</div>
      )}

      <div className="epi-nav-list">
        {NAV.map(({ to, icono, label, bloqueable }) => {
          const deshabilitado = bloqueable && corriendo

          if (deshabilitado) {
            return (
              <div
                key={to}
                className="epi-nav-link"
                title={collapsed ? label : 'Pipeline en ejecución…'}
                style={{
                  opacity: 0.38,
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                <span className="epi-nav-icon">{icono}</span>
                {!collapsed && <span className="epi-nav-text">{label}</span>}
              </div>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/CIAE/Epidemiologia/dengue'}
              className={({ isActive }) => `epi-nav-link${isActive ? ' active' : ''}`}
              title={collapsed ? label : ''}
            >
              <span className="epi-nav-icon">{icono}</span>
              {!collapsed && <span className="epi-nav-text">{label}</span>}
            </NavLink>
          )
        })}
      </div>

      {corriendo && !collapsed && (
        <div style={{
          margin: '8px 10px 0',
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(167,128,45,0.1)',
          border: '1px solid rgba(167,128,45,0.25)',
          fontSize: 10,
          color: '#a7802d',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#a7802d',
            animation: 'epi-pulse 1.5s ease infinite',
            flexShrink: 0,
          }} />
          Pipeline en ejecución…
        </div>
      )}

    </nav>
  )
}
