// react
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
// propios
import { mensajeDeError } from '@/api/mensajeDeError';
import { CLAVE_REPORTES_DENGUE } from '@/features/dengue/context/PipelineContext';
import { dengueService } from '@/features/dengue/services/dengueService';
import type { TipoMapa } from '@/features/dengue/tipos';

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

export const useCanal              = () => useDengueReporte(['canal'], dengueService.canal);
export const useMapaDengue         = (tipo: TipoMapa) => useDengueReporte(['mapa', tipo], () => dengueService.mapa(tipo));
export const useAlertasSiscep      = () => useDengueReporte(['alertasSiscep'], dengueService.alertasSiscep);
export const useDuplicados         = () => useDengueReporte(['duplicados'], dengueService.duplicados);
export const usePosiblesDuplicados = () => useDengueReporte(['posiblesDuplicados'], dengueService.posiblesDuplicados);
