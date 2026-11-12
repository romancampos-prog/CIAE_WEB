// propios
import { useAuth } from '@/features/auth/context/AuthContext';

/** Qué puede hacer el usuario según su rol (el backend vuelve a revisar cada permiso en su endpoint). */
export function useRol() {
  const { user } = useAuth();
  const rol = user?.rol;
  const esAdmin = rol === 'admin';
  // Usuario de un hospital/UMF: ve sus gráficas y sus Acciones de epidemiología, nada más.
  const esUnidad = rol === 'unidad';
  const generaIndicadores = esAdmin || rol === 'edita_indicadores';

  return {
    esAdmin,
    esUnidad,
    // El Excel trae todas las unidades: el usuario de unidad no lo descarga (el back responde 403).
    puedeDescargarExcel: !esUnidad,
    puedeGenFTP:        generaIndicadores,
    puedeGenExtractor:  generaIndicadores,
    puedeGenIAAS:       generaIndicadores || rol === 'edita_iaas',
    // Todos entran a Epidemiología; la unidad solo a Acciones (Dengue es de los internos).
    puedeVerDengue:     !esUnidad,
    puedeEditarEpi:     esAdmin || rol === 'edita_epidemiologia',
  };
}
