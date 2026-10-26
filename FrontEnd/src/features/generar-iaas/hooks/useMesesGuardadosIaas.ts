// react
import { useQuery } from '@tanstack/react-query';
// propios
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import { iaasService } from '@/features/generar-iaas/services/iaasService';

/** Meses del año actual que ya tienen reporte IAAS y el último de ellos ("Agosto"). null mientras carga. */
export function useMesesGuardadosIaas() {
  const anioActual = String(new Date().getFullYear());
  const consulta = useQuery({
    queryKey: ['iaas', 'mesesGuardados', anioActual],
    queryFn: () => iaasService.mesesGuardados(anioActual),
  });
  const meses = consulta.data ?? null;
  return {
    anioActual,
    meses,
    ultimoMes: meses?.length ? MESES_LARGOS_ARR[parseInt(meses[meses.length - 1]) - 1] : null,
  };
}
