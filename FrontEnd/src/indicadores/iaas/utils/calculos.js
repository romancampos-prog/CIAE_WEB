import { MESES_CORTOS } from '../../shared/constantes/meses';

export const TOTAL_KEY = 'TOTAL OOAD';

// Clave real bajo la que el backend manda el total OOAD/Delegación ya calculado
// (numerador, denominador, tasa y color) — el front solo lo muestra, no lo recalcula.
const DELEGACION_KEY = 'DELEGACION';

/**
 * Construye el objeto de rangos de semáforo para IAAS 01 a partir de los umbrales de un tipo.
 * @param {Object|undefined} umbrales - Umbrales del tipo (OOAD, HGS, HGZ, HGR) con Esperado y Medio
 * @param {string} label - Etiqueta a mostrar en la UI (ej. 'OOAD', 'HGS')
 * @returns {{_label:string, Esperado:string, Medio:string, Bajo:string}|null} Rangos formateados o null si no hay datos
 */
export function calcularRangos01(umbrales, label) {
  if (!umbrales?.Esperado) return null;
  const esp = umbrales.Esperado;
  const med = umbrales.Medio ?? {};
  return {
    _label:   label,
    Esperado: `${esp.Mayor} – ${esp.Menor}`,
    Medio:    `> ${med.Mayor ?? '?'} – < ${esp.Mayor}`,
    Bajo:     `< ${med.Mayor ?? '?'}  ó  > ${esp.Menor}`,
  };
}

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
 * Devuelve los puntos de la gráfica de tendencia mensual para una unidad específica (o TOTAL OOAD).
 * TOTAL OOAD usa directamente el registro "DELEGACION" que ya manda el backend calculado —
 * el front nunca suma ni decide el color, solo lo muestra.
 * @param {Object} datos - Datos crudos de la API
 * @param {string} unidadSel - Unidad seleccionada o TOTAL_KEY
 * @param {string} indSel - Indicador seleccionado
 * @returns {Array<{mes:string, tasa:number, numerador:number, denominador:number, color:string}>}
 */
export function buildChartDataUnidad(datos, unidadSel, indSel) {
  if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];

  const clave = unidadSel === TOTAL_KEY ? DELEGACION_KEY : unidadSel;
  const arr = datos.datos?.[indSel]?.[clave] ?? [];
  return datos.meses_con_datos.map(mes => {
    const reg = arr.find(r => r.mes === mes);
    return {
      mes:         MESES_CORTOS[parseInt(mes) - 1],
      // tasa en 0 para que la barra se vea vacía; numerador/denominador se dejan en null
      // (no en 0) cuando no hay dato, para que la tarjetita muestre "sin dato" real.
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? null,
      denominador: reg?.denominador ?? null,
      color:       reg?.color       ?? 'Gris',
    };
  });
}

/**
 * Devuelve los puntos de la gráfica de todas las unidades en un mes específico + TOTAL OOAD.
 * TOTAL OOAD usa directamente el registro "DELEGACION" del backend, sin sumar por unidad.
 * @param {Object} datos - Datos crudos de la API
 * @param {string} mesSel - Mes seleccionado en formato "MM"
 * @param {string} indSel - Indicador seleccionado
 * @returns {Array<{unidad:string, tasa:number, numerador:number, denominador:number, color:string}>}
 */
export function buildChartDataMes(datos, mesSel, indSel) {
  if (!datos?.unidades || !mesSel) return [];

  const porUnidad = datos.unidades.map(u => {
    const arr = datos.datos?.[indSel]?.[u] ?? [];
    const reg = arr.find(r => r.mes === mesSel);
    return {
      unidad:      u,
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? null,
      denominador: reg?.denominador ?? null,
      color:       reg?.color       ?? 'Gris',
    };
  });

  const arrTotal = datos.datos?.[indSel]?.[DELEGACION_KEY] ?? [];
  const regTotal = arrTotal.find(r => r.mes === mesSel);
  return [
    ...porUnidad,
    {
      unidad:      TOTAL_KEY,
      tasa:        regTotal?.tasa        ?? 0,
      numerador:   regTotal?.numerador   ?? null,
      denominador: regTotal?.denominador ?? null,
      color:       regTotal?.color       ?? 'Gris',
    },
  ];
}
