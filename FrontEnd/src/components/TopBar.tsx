// react
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoFlechaIzquierda, IconoSalir } from '@/components/icons';
import { useAuth } from '@/features/auth';
import logo_imss from '@/assets/logo_imms.png';
import BotonTema from '@/components/ui/BotonTema';
import './topbar.css';

interface Props {
  backTo?: string;
  onLogout?: () => void;
  children?: ReactNode;
  rightExtra?: ReactNode;
}

/**
 * Header compartido de todas las vistas (menos el login): logo (izq),
 * chip de usuario (centro) y un botón de acción a la derecha.
 * - `backTo`: destino de navegación → muestra flecha "volver".
 * - `onLogout`: función de cierre de sesión → muestra ícono "salir" (solo Inicio la usa).
 * Pasar únicamente una de las dos props.
 * - `children` (opcional): contenido extra junto al logo (p. ej. una nota legal de una página puntual).
 * - `rightExtra` (opcional): contenido extra antes del botón de acción (p. ej. un botón o chip propio de la página).
 */
const TopBar = ({ backTo, onLogout, children, rightExtra }: Props) => {
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
        <BotonTema />
        {onLogout ? (
          <button className="tb-back-btn" onClick={onLogout} aria-label="Salir">
            <IconoSalir />
          </button>
        ) : (
          <button className="tb-back-btn" onClick={() => backTo && navigate(backTo)} aria-label="Volver">
            <IconoFlechaIzquierda />
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
