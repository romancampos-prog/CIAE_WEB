import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/context/AuthContext'

export default function DengueHeader() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <header className="epi-topbar">
      <div className="epi-topbar-left">
        <div className="epi-brand-icon">🦟</div>
        <div className="epi-nav-divider" />
        <div>
          <div className="epi-nav-label">Epidemiología · Dengue</div>
          <div className="epi-nav-sublabel">IMSS OOAD Guanajuato</div>
        </div>
      </div>

      <div className="epi-topbar-right">
        {user && (
          <div className="epi-user-chip">
            <span className="epi-user-dot" />
            <span>{user.user || 'Usuario'}</span>
          </div>
        )}
        <button className="epi-btn-back" onClick={() => navigate('/CIAE/Inicio')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Inicio
        </button>
      </div>
    </header>
  )
}
