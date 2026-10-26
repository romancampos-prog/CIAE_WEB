// propios
import type { DenominadoresCapturados } from '@/features/generar-iaas/tipos';

/**
 * Verifica si un mes está disponible para selección según el año y la fecha actual.
 * Un mes queda disponible a partir del día 25 del mismo mes.
 */
export function mesDisponible(
  mesNum: number,
  anioSel: string | number,
  { anioActual, mesHoy, diaHoy }: { anioActual: number; mesHoy: number; diaHoy: number },
): boolean {
  if (parseInt(String(anioSel)) < anioActual) return true;
  if (mesNum < mesHoy) return true;
  if (mesNum === mesHoy && diaHoy >= 25) return true;
  return false;
}

/**
 * Calcula la lista de datos faltantes antes de generar el reporte IAAS.
 * numeradores = Excel global de IAAS 01; indicadores = los que capturan denominador (IAAS 02–06).
 * Regresa los mensajes de lo que falta; vacía si todo está completo.
 */
export function calcularFaltantes(
  numeradores: File | null,
  unidades: string[],
  archivosUnidad: Record<string, File>,
  denominadores: DenominadoresCapturados,
  indicadores: { indicador: string }[],
): string[] {
  const lista: string[] = [];
  if (!numeradores) lista.push('Falta el Excel global de IAAS 01');
  const sinExcel = unidades.filter(u => !archivosUnidad[u]);
  if (sinExcel.length) lista.push(`${sinExcel.length} unidad(es) sin Excel: ${sinExcel.join(', ')}`);
  const sinDenom = unidades.filter(u => archivosUnidad[u] && indicadores.some(d => !(denominadores[u]?.[d.indicador])));
  if (sinDenom.length) lista.push(`Denominadores incompletos en: ${sinDenom.join(', ')}`);
  return lista;
}
