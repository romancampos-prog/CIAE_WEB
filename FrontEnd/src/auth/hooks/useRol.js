import { useAuth } from '../context/AuthContext';

export function useRol() {
  const { user } = useAuth();
  const rol = user?.rol;

  return {
    esAdmin:         rol === 'admin',
    puedeGenFTP:     rol === 'admin' || rol === 'trabajador_ftp',
    puedeGenINASS:   rol === 'admin' || rol === 'trabajador_IAAS',
    puedeVerEpi:     rol === 'admin',
  };
}
