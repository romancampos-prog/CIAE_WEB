// react
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// propios
import { iaasApi } from '@/api/indicadores/iaasApi';
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import { mesDisponible } from '@/features/generar-iaas/utils/calculos';

/**
 * Año y mes del reporte IAAS. Un mes se puede generar desde el día 25; el año anterior sigue
 * disponible mientras enero del año actual no se haya generado (para cerrar pendientes).
 */
export function usePeriodoIaas() {
  const hoy        = new Date();
  const anioActual = hoy.getFullYear();
  const diaHoy     = hoy.getDate();
  const mesHoy     = hoy.getMonth() + 1;

  const mesMaxActual = diaHoy >= 25 ? mesHoy : mesHoy - 1;
  const anioDefault  = mesMaxActual < 1 ? anioActual - 1 : anioActual;
  const mesDefault   = mesMaxActual < 1 ? 12 : mesMaxActual;

  const [anio, setAnio] = useState(String(anioDefault));
  const [mes, setMes]   = useState(String(mesDefault).padStart(2, '0'));

  const mesesDelAnioActual = useQuery({
    queryKey: ['iaas', 'mesesGuardados', String(anioActual)],
    queryFn: () => iaasApi.mesesGuardados(String(anioActual)),
  });
  // Mientras no se sepa, se asume generado (no se ofrece el año anterior de más).
  const eneroActualGenerado = mesesDelAnioActual.data?.includes('01') ?? true;

  const aniosDisponibles = [
    ...(!eneroActualGenerado ? [anioActual - 1] : []),
    ...(mesMaxActual >= 1 ? [anioActual] : []),
  ];

  const mesesDisponibles = MESES_LARGOS_ARR
    .map((nombre, i) => ({ valor: String(i + 1).padStart(2, '0'), nombre, numero: i + 1 }))
    .filter(({ numero }) => mesDisponible(numero, anio, { anioActual, mesHoy, diaHoy }));

  const cambiarAnio = (nuevoAnio: string) => {
    setAnio(nuevoAnio);
    if (nuevoAnio === String(anioActual)) {
      if (mesMaxActual < 1) {
        setAnio(String(anioActual - 1));
      } else if (parseInt(mes) > mesMaxActual) {
        setMes(String(mesMaxActual).padStart(2, '0'));
      }
    }
  };

  return {
    anio, mes,
    cambiarAnio,
    cambiarMes: setMes,
    aniosDisponibles,
    mesesDisponibles,
    mesNombre: MESES_LARGOS_ARR[parseInt(mes, 10) - 1] || '',
  };
}
