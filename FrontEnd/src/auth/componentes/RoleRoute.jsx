import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();
  if (roles.includes(user?.rol)) return children;
  return <Navigate to="/CIAE/Inicio" replace />;
};

export default RoleRoute;
