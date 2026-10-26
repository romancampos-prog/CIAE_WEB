// react
import { useQuery } from '@tanstack/react-query';
// propios
import { indicadoresService } from '@/features/indicadores/services/indicadoresService';

/** Ficha técnica completa de un indicador; solo se pide mientras el panel está abierto. */
export function useFichaTecnica(indicador: string | undefined, abierta: boolean) {
  const consulta = useQuery({
    queryKey: ['indicadores', 'fichaTecnica', indicador],
    queryFn: () => indicadoresService.obtenerFichaTecnica(indicador!),
    enabled: abierta && !!indicador,
  });
  return { ficha: consulta.data ?? null, cargando: consulta.isFetching };
}
