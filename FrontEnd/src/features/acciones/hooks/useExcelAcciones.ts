// react
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
// propios
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { descargarB64 } from '@/features/indicadores';

/** Un rango de fechas como lo usa <input type="date">: aaaa-mm-dd. */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

/**
 * Descargar en Excel los registros de un rango de fechas (puede abarcar varios meses). Arranca con
 * el rango que le pase el panel (el del mes que se ve); el backend arma el libro y recorta a la
 * unidad del usuario si es de unidad.
 */
export function useExcelAcciones(rangoInicial: RangoFechas) {
  const [desde, setDesde] = useState(rangoInicial.desde);
  const [hasta, setHasta] = useState(rangoInicial.hasta);

  const descarga = useMutation({
    mutationFn: () => ftpEpidemiologiaApi.excelOC30(desde, hasta),
    onSuccess: excel => descargarB64(excel.archivo_b64, excel.nombre_archivo),
  });

  return {
    desde, hasta,
    // Calendario: el primer clic pone el inicio (y borra el final), el segundo el final; si el
    // segundo cae antes del inicio, ese pasa a ser el nuevo inicio
    elegirDia: (fecha: string) => {
      if (!desde || hasta || fecha < desde) { setDesde(fecha); setHasta(''); }
      else setHasta(fecha);
    },
    elegirRango: (rango: RangoFechas) => { setDesde(rango.desde); setHasta(rango.hasta); },
    puedeDescargar: !!desde && !!hasta && !descarga.isPending,
    descargar: () => descarga.mutate(),
    descargando: descarga.isPending,
    resultado: descarga.data ?? null,
    error: descarga.isError ? mensajeDeError(descarga.error, 'No se pudo descargar el Excel') : null,
  };
}
