import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando seguridad...</div>;

  if (!user) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
};

export default ProtectedRoute;