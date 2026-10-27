// propios
import type { ResultadoIndicadorExtractor } from '@/types/api/indicadores/extractor';
import { MESES_LARGOS_ARR } from '@/features/indicadores';

/** "Junio" -> "06". */
export const numeroMes = (mes: string): string => String(MESES_LARGOS_ARR.indexOf(mes) + 1).padStart(2, '0');

/** "Materna 04 - Cobertura de..." -> "Cobertura de...": la clave ya va arriba en la tarjeta. */
export const tituloSinClave = (titulo = ''): string => titulo.replace(/^[^-–]*?\d+\s*[-–]\s*/, '');

/** "Mensual - Mensual Acumulado: dato de cada mes..." -> "Dato de cada mes...": la periodicidad ya va en la etiqueta. */
export const explicacionPeriodo = (texto = ''): string => {
  const despues = texto.includes(':') ? texto.slice(texto.indexOf(':') + 1).trim() : texto;
  return despues.charAt(0).toUpperCase() + despues.slice(1);
};

/** Lo que pasó con un indicador al procesar el archivo, en una línea y con su tono. */
export const resumenIndicador = (r: ResultadoIndicadorExtractor): { texto: string; tono: 'error' | 'progreso' | 'completo' } => {
  if (r.error) return { texto: r.error, tono: 'error' };
  if (r.pendiente) return { texto: r.pendiente, tono: 'progreso' };
  if (r.tipo === 'mensual' && r.total) {
    return { texto: `${r.total.numerador} / ${r.total.denominador} = ${r.total['%']} (${r.total.desempeno}). Mes generado.${r.detalle ? ` ${r.detalle}` : ''}`, tono: 'completo' };
  }
  const casos = Object.values(r.numerador_por_unidad ?? {}).reduce((a, b) => a + b, 0);
  const via2 = r.validados_via2 ? ` (${r.validados_via2} por vía 2)` : '';
  if (r.corte_generado) return { texto: `${casos} casos${via2}. Se generó el corte.`, tono: 'completo' };
  const recalc = r.cortes_recalculados?.length ? ` Se recalculó el corte ${r.cortes_recalculados.join(', ')}.` : '';
  const cruce = r.cruce_pendiente ? ' Falta subir el Egresos Pacientes de este mes para la vía 2.' : '';
  return { texto: `${casos} casos${via2}. Numerador guardado.${recalc}${cruce}`, tono: r.cruce_pendiente ? 'progreso' : 'completo' };
};
