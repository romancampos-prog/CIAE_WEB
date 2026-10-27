// react
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
// propios
import type { TipoMapa } from '@/types/api/dengue/reportes';
import { reportesDengueApi } from '@/api/dengue/reportesApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { CLAVE_REPORTES_DENGUE } from '@/features/dengue/constants/clavesConsulta';

/**
 * Un reporte de dengue: se vuelve a pedir solo cuando el pipeline termina un análisis nuevo
 * (PipelineProvider invalida CLAVE_REPORTES_DENGUE).
 */
function useDengueReporte<T>(nombre: unknown[], pedir: () => Promise<T>) {
  const consulta = useQuery({
    queryKey: [...CLAVE_REPORTES_DENGUE, ...nombre],
    queryFn: pedir,
    // Solo cambian cuando corre el pipeline, y eso ya los invalida.
    staleTime: Infinity,
  });

  let error: string | null = null;
  if (consulta.isError) {
    error = axios.isAxiosError(consulta.error) && consulta.error.response?.status === 404
      ? 'Sin datos — ejecuta el pipeline primero'
      : mensajeDeError(consulta.error, 'Error al cargar datos');
  }
  return { datos: consulta.data ?? null, cargando: consulta.isLoading, error };
}

export const useCanal              = () => useDengueReporte(['canal'], reportesDengueApi.canal);
export const useMapaDengue         = (tipo: TipoMapa) => useDengueReporte(['mapa', tipo], () => reportesDengueApi.mapa(tipo));
export const useAlertasSiscep      = () => useDengueReporte(['alertasSiscep'], reportesDengueApi.alertasSiscep);
export const useDuplicados         = () => useDengueReporte(['duplicados'], reportesDengueApi.duplicados);
export const usePosiblesDuplicados = () => useDengueReporte(['posiblesDuplicados'], reportesDengueApi.posiblesDuplicados);
