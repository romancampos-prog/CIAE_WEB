// react
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
// propios
import type { TipoMapa } from '@/types/api/dengue/reportes';
import { reportesDengueApi } from '@/api/dengue/reportesApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { CLAVE_REPORTES_DENGUE } from '@/features/dengue/constants/clavesConsulta';

/**
 * Un reporte de dengue: se pide de nuevo cada vez que se entra a la página (como antes del paso a
 * TypeScript), así nunca se queda el análisis anterior si el pipeline corrió en otra pestaña, otro
 * admin lo corrió o se salió de dengue mientras corría. Además, PipelineProvider invalida
 * CLAVE_REPORTES_DENGUE al terminar un análisis en esta pestaña.
 */
function useDengueReporte<T>(nombre: unknown[], pedir: () => Promise<T>) {
  const consulta = useQuery({
    queryKey: [...CLAVE_REPORTES_DENGUE, ...nombre],
    queryFn: pedir,
    refetchOnMount: 'always',
  });

  let error: string | null = null;
  if (consulta.isError) {
    error = axios.isAxiosError(consulta.error) && consulta.error.response?.status === 404
      ? 'Sin datos — ejecuta el pipeline primero'
      : mensajeDeError(consulta.error, 'Error al cargar datos');
  }
  // Mientras llega lo nuevo no se muestra lo anterior (antes también se esperaba la respuesta)
  return { datos: consulta.isFetching ? null : consulta.data ?? null, cargando: consulta.isFetching, error };
}

export const useCanal              = () => useDengueReporte(['canal'], reportesDengueApi.canal);
export const useMapaDengue         = (tipo: TipoMapa) => useDengueReporte(['mapa', tipo], () => reportesDengueApi.mapa(tipo));
export const useAlertasSiscep      = () => useDengueReporte(['alertasSiscep'], reportesDengueApi.alertasSiscep);
export const useDuplicados         = () => useDengueReporte(['duplicados'], reportesDengueApi.duplicados);
export const usePosiblesDuplicados = () => useDengueReporte(['posiblesDuplicados'], reportesDengueApi.posiblesDuplicados);
