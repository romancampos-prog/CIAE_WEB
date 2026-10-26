// react
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// propios
import { poblacionService } from '@/features/generar-ftp/services/poblacionService';

export const CLAVE_POBLACION_ACTUAL = ['ftp', 'poblacionActual'];

/** El Excel de población vigente (nombre y periodo) y si el modal para actualizarlo está abierto. */
export function usePoblacionActual() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const consulta = useQuery({
    queryKey: CLAVE_POBLACION_ACTUAL,
    queryFn: poblacionService.archivoActual,
  });

  const { nombre_sin_ext, mes_detectado, anio_detectado } = consulta.data ?? {};
  return {
    archivo: nombre_sin_ext ?? null,
    // "Julio 2026", o null si no se detectó el periodo en el título del Excel.
    periodo: mes_detectado && anio_detectado ? `${mes_detectado} ${anio_detectado}` : null,
    modalAbierto,
    abrirModal: () => setModalAbierto(true),
    cerrarModal: () => setModalAbierto(false),
  };
}
