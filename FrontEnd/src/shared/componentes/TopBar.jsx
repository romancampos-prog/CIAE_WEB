import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexto/AuthContext';
import logo_imss from '../../assets/logo_imms.png';
import './topbar.css';

/**
 * Header compartido de todas las vistas (menos el login): logo (izq),
 * chip de usuario (centro) y un botón de acción a la derecha.
 * - `backTo`: destino de navegación → muestra flecha "volver".
 * - `onLogout`: función de cierre de sesión → muestra ícono "salir" (solo Inicio la usa).
 * Pasar únicamente una de las dos props.
 * - `children` (opcional): contenido extra junto al logo (p. ej. una nota legal de una página puntual).
 * - `rightExtra` (opcional): contenido extra antes del botón de acción (p. ej. un botón o chip propio de la página).
 */
const TopBar = ({ backTo, onLogout, children, rightExtra }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="tb-bar">
      <div className="tb-left">
        <img src={logo_imss} alt="IMSS" className="tb-logo" />
        {children}
      </div>

      <div className="tb-user-chip">
        <span className="tb-user-dot" />
        {user?.user || 'Invitado'}
      </div>

      <div className="tb-right">
        {rightExtra}
        {onLogout ? (
          <button className="tb-back-btn" onClick={onLogout} aria-label="Salir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        ) : (
          <button className="tb-back-btn" onClick={() => navigate(backTo)} aria-label="Volver">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
