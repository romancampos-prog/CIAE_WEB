// propios
import { useAuth } from '@/features/auth/context/AuthContext';

export function useRol() {
  const { user } = useAuth();
  const rol = user?.rol;

  return {
    esAdmin:       rol === 'admin',
    esVisitante:   rol === 'visitante',
    // Usuario de un hospital/UMF: ve sus gráficas y sus Acciones de epidemiología, nada más.
    esUnidad:      rol === 'unidad',
    // El Excel trae todas las unidades: el usuario de unidad no lo descarga (el back responde 403).
    puedeDescargarExcel: rol !== 'unidad',
    puedeGenFTP:   rol === 'admin' || rol === 'trabajador_ftp',
    puedeGenIAAS:  rol === 'admin' || rol === 'trabajador_IAAS',
    // El usuario de unidad entra a Epidemiología solo a Acciones (Dengue sigue siendo de admin).
    puedeVerEpi:   rol === 'admin' || rol === 'unidad',
  };
}
