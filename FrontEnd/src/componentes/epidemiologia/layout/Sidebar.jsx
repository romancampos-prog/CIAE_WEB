







import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/Epidemiologia',                  icono: '📂', label: 'Carga de datos'   },
  { to: '/Epidemiologia/canal',            icono: '📊', label: 'Canal endémico'   },
  { to: '/Epidemiologia/mapa/situacion',   icono: '🗺️', label: 'Mapa situación'   },
  { to: '/Epidemiologia/mapa/confirmados', icono: '🗺️', label: 'Mapa confirmados' },
  { to: '/Epidemiologia/alertas',          icono: '⚠️', label: 'Alertas SisCep'   },
  { to: '/Epidemiologia/duplicados',       icono: '⧉',  label: 'Duplicados'        },
]

export default function DengueSidebar({ collapsed, onToggle }) {
  return (
    <nav className={`epi-sidebar${collapsed ? ' epi-sidebar--collapsed' : ''}`}>

      {/* Botón toggle */}
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
        {NAV.map(({ to, icono, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/Epidemiologia'}
            className={({ isActive }) => `epi-nav-link${isActive ? ' active' : ''}`}
            title={collapsed ? label : ''}
          >
            <span className="epi-nav-icon">{icono}</span>
            {!collapsed && <span className="epi-nav-text">{label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
