import { MESES_CORTOS, MESES_LARGOS_ARR } from '../../shared/constantes/meses';

export const TOTAL_KEY = 'TOTAL OOAD';

// Clave real bajo la que el backend manda el total OOAD ya calculado
// (numerador, denominador, tasa y color) — el front solo lo muestra, no lo recalcula.
const TOTAL_OOAD_KEY = 'TOTAL_OOAD';

/** De dónde se leen los datos dentro del reporte: el mes tal cual, o su acumulado Ene→mes (lo calcula el backend). */
export const FUENTE_MENSUAL   = 'MESES';
export const FUENTE_ACUMULADO = 'MENSUAL_ACUMULADO';

/**
 * Verifica si un mes está disponible para selección según el año y la fecha actual.
 * Un mes queda disponible a partir del día 25 del mismo mes.
 * @param {number} mesNum - Número de mes (1–12)
 * @param {string|number} anioSel - Año seleccionado
 * @param {{anioActual:number, mesHoy:number, diaHoy:number}} hoy - Referencia de fecha actual
 * @returns {boolean}
 */
export function mesDisponible(mesNum, anioSel, { anioActual, mesHoy, diaHoy }) {
  if (parseInt(anioSel) < anioActual) return true;
  if (mesNum < mesHoy) return true;
  if (mesNum === mesHoy && diaHoy >= 25) return true;
  return false;
}

/**
 * Calcula la lista de datos faltantes antes de generar el reporte IAAS.
 * @param {File|null} numeradores - Excel global de IAAS 01
 * @param {string[]} unidades - Lista de unidades
 * @param {Object<string,File>} archivosUnidad - Archivos Excel subidos por unidad
 * @param {Object} denominadores - Denominadores capturados por unidad e indicador
 * @param {Array<{id:string}>} indicadores - Lista de indicadores (IAAS 02–06)
 * @returns {string[]} Lista de mensajes de validación; vacía si todo está completo
 */
export function calcularFaltantes(numeradores, unidades, archivosUnidad, denominadores, indicadores) {
  const lista = [];
  if (!numeradores) lista.push('Falta el Excel global de IAAS 01');
  const sinExcel = unidades.filter(u => !archivosUnidad[u]);
  if (sinExcel.length) lista.push(`${sinExcel.length} unidad(es) sin Excel: ${sinExcel.join(', ')}`);
  const sinDenom = unidades.filter(u => archivosUnidad[u] && indicadores.some(d => !(denominadores[u]?.[d.id])));
  if (sinDenom.length) lista.push(`Denominadores incompletos en: ${sinDenom.join(', ')}`);
  return lista;
}

/**
 * Meses ("01".."12", ordenados) que tienen al menos un dato en el reporte.
 * @param {Object|null} reporte - Respuesta de /Indicadores/reportes/{indicador}
 * @returns {string[]}
 */
export function mesesConDatosDeReporte(reporte) {
  if (!reporte?.MESES) return [];
  return Object.entries(reporte.MESES)
    .filter(([, unidades]) => Object.values(unidades).some(d => d?.numerador != null || d?.denominador != null || d?.['%'] != null))
    .map(([nombre]) => MESES_LARGOS_ARR.indexOf(nombre) + 1)
    .filter(n => n > 0)
    .sort((a, b) => a - b)
    .map(n => String(n).padStart(2, '0'));
}

// tasa en 0 para que la barra se vea vacía; numerador/denominador se dejan en null
// (no en 0) cuando no hay dato, para que la tarjetita muestre "sin dato" real.
function puntoDe(dato) {
  return {
    tasa:        dato?.['%']       ?? 0,
    numerador:   dato?.numerador   ?? null,
    denominador: dato?.denominador ?? null,
    color:       dato?.desempeno   ?? 'Gris',
  };
}

/**
 * Puntos de la gráfica de tendencia mensual para una unidad (o TOTAL OOAD).
 * TOTAL OOAD usa directamente el registro "TOTAL_OOAD" que ya manda el backend —
 * el front nunca suma ni decide el color, solo lo muestra.
 * @param {Object|null} reporte - Respuesta de /Indicadores/reportes/{indicador}
 * @param {string} unidadSel - Unidad seleccionada o TOTAL_KEY
 * @param {string[]} mesesConDatos - Meses "MM" a graficar
 * @param {string} [fuente] - FUENTE_MENSUAL (default) o FUENTE_ACUMULADO
 * @returns {Array<{mes:string, tasa:number, numerador:number|null, denominador:number|null, color:string}>}
 */
export function buildChartDataUnidad(reporte, unidadSel, mesesConDatos, fuente = FUENTE_MENSUAL) {
  if (!reporte || !unidadSel || !mesesConDatos?.length) return [];

  const clave = unidadSel === TOTAL_KEY ? TOTAL_OOAD_KEY : unidadSel;
  return mesesConDatos.map(mes => ({
    mes: MESES_CORTOS[parseInt(mes) - 1],
    ...puntoDe(reporte[fuente]?.[MESES_LARGOS_ARR[parseInt(mes) - 1]]?.[clave]),
  }));
}

/**
 * Puntos de la gráfica de todas las unidades en un mes + TOTAL OOAD al final
 * (registro "TOTAL_OOAD" del backend, sin sumar por unidad).
 * @param {Object|null} reporte - Respuesta de /Indicadores/reportes/{indicador}
 * @param {string[]} unidades - Catálogo de unidades, en el orden a mostrar
 * @param {string} mesSel - Mes seleccionado en formato "MM"
 * @param {string} [fuente] - FUENTE_MENSUAL (default) o FUENTE_ACUMULADO
 * @returns {Array<{unidad:string, tasa:number, numerador:number|null, denominador:number|null, color:string}>}
 */
export function buildChartDataMes(reporte, unidades, mesSel, fuente = FUENTE_MENSUAL) {
  if (!reporte || !mesSel) return [];

  const delMes = reporte[fuente]?.[MESES_LARGOS_ARR[parseInt(mesSel) - 1]] ?? {};
  return [
    ...unidades.map(unidad => ({ unidad, ...puntoDe(delMes[unidad]) })),
    { unidad: TOTAL_KEY, ...puntoDe(delMes[TOTAL_OOAD_KEY]) },
  ];
}
