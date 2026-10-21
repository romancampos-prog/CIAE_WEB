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
  const sinDenom = unidades.filter(u => archivosUnidad[u] && indicadores.some(d => !(denominadores[u]?.[d.indicador])));
  if (sinDenom.length) lista.push(`Denominadores incompletos en: ${sinDenom.join(', ')}`);
  return lista;
}
