import { useAuth } from '../contexto/AuthContext';

export function useRol() {
  const { user } = useAuth();
  const rol = user?.rol;

  return {
    esAdmin:       rol === 'admin',
    esVisitante:   rol === 'visitante',
    puedeGenFTP:   rol === 'admin' || rol === 'trabajador_ftp',
    puedeGenIAAS:  rol === 'admin' || rol === 'trabajador_IAAS',
    puedeVerEpi:   rol === 'admin',
  };
}
