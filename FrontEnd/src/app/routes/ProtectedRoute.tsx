// react
import { Navigate, Outlet } from 'react-router-dom';
// propios
import { useAuth, type Rol } from '@/features/auth';

interface Props {
  /** Si se pasa, además de tener sesión hay que tener uno de estos roles. */
  roles?: Rol[];
}

/**
 * Guardián de rutas: sin sesión manda al login; con sesión pero sin el rol, a Inicio.
 * Bloquea a nivel de ruta (no solo ocultando la tarjeta) para que tampoco se entre escribiendo la URL.
 */
export default function ProtectedRoute({ roles }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/CIAE/LOGIN" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/CIAE/Inicio" replace />;

  return <Outlet />;
}
