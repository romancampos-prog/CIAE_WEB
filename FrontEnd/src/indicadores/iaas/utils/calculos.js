import { MESES_CORTOS } from '../../shared/constantes/meses';

export const TOTAL_KEY = 'TOTAL OOAD';

/**
 * Determina el tipo de semáforo que corresponde a una unidad en IAAS 01.
 * TOTAL_KEY siempre mapea a 'OOAD'; las demás usan su tipo clasificado o 'OOAD' por defecto.
 * @param {string} unidad - Clave de la unidad médica
 * @param {Object<string,string>} unidadTipoMap - Mapa unidad → tipo (HGS, HGZ, HGR, OOAD)
 * @returns {string} Tipo de semáforo ('OOAD', 'HGS', 'HGZ', 'HGR')
 */
export function tipoSemaforo(unidad, unidadTipoMap) {
  if (unidad === TOTAL_KEY) return 'OOAD';
  return unidadTipoMap?.[unidad] ?? 'OOAD';
}

/**
 * Calcula el color de semáforo (Verde/Amarillo/Rojo) para una tasa dada.
 * IAAS 01 usa umbrales distintos por tipo de unidad; los demás indicadores usan un umbral único.
 * @param {number} tasa - Tasa calculada del indicador
 * @param {string} unidad - Clave de la unidad (puede ser TOTAL_KEY)
 * @param {Object|null} sem - Objeto de semáforo del indicador desde la API
 * @param {string} indSel - ID del indicador seleccionado (ej. 'IAAS 01')
 * @param {Object<string,string>} unidadTipoMap - Mapa unidad → tipo para IAAS 01
 * @returns {'Verde'|'Amarillo'|'Rojo'} Color del semáforo
 */
export function calcularColorIAAS(tasa, unidad, sem, indSel, unidadTipoMap) {
  if (!sem) return 'Rojo';
  if (indSel === 'IAAS 01') {
    const tipo     = tipoSemaforo(unidad, unidadTipoMap);
    const umbrales = sem[tipo];
    if (!umbrales?.Esperado) return 'Rojo';
    const esp = umbrales.Esperado;
    const med = umbrales.Medio ?? {};
    if (esp.Mayor <= tasa && tasa <= esp.Menor) return 'Verde';
    if (med.Mayor <= tasa && tasa <  med.Menor) return 'Amarillo';
    return 'Rojo';
  }
  const esp = sem.Esperado ?? {};
  const med = sem.Medio    ?? {};
  if (tasa >  (esp.Menor ?? 0)) return 'Rojo';
  if (tasa >= (esp.Mayor ?? 0)) return 'Verde';
  if (tasa >= (med.Mayor ?? 0)) return 'Amarillo';
  return 'Rojo';
}

/**
 * Construye el objeto de rangos de semáforo para IAAS 01 a partir de los umbrales de un tipo.
 * @param {Object|undefined} umbrales - Umbrales del tipo (OOAD, HGS, HGZ, HGR) con Esperado y Medio
 * @param {string} label - Etiqueta a mostrar en la UI (ej. 'OOAD', 'HGS')
 * @returns {{_label:string, Verde:string, Amarillo:string, Rojo:string}|null} Rangos formateados o null si no hay datos
 */
export function calcularRangos01(umbrales, label) {
  if (!umbrales?.Esperado) return null;
  const esp = umbrales.Esperado;
  const med = umbrales.Medio ?? {};
  return {
    _label:   label,
    Verde:    `${esp.Mayor} – ${esp.Menor}`,
    Amarillo: `> ${med.Mayor ?? '?'} – < ${esp.Mayor}`,
    Rojo:     `< ${med.Mayor ?? '?'}  ó  > ${esp.Menor}`,
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
 * @param {Object} datos - Datos crudos de la API
 * @param {string} unidadSel - Unidad seleccionada o TOTAL_KEY
 * @param {string} indSel - Indicador seleccionado
 * @param {Object} indInfo - Metadatos del indicador (semáforo, tasa, etc.)
 * @param {Object} sem - Umbrales de semáforo
 * @param {Object} unidadTipoMap - Mapa unidad → tipo para IAAS 01
 * @returns {Array<{mes:string, tasa:number, numerador:number, denominador:number, color:string}>}
 */
export function buildChartDataUnidad(datos, unidadSel, indSel, indInfo, sem, unidadTipoMap) {
  if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
  const factor = indInfo?.semaforo?.Tasa ?? 100;

  if (unidadSel === TOTAL_KEY) {
    return datos.meses_con_datos.map(mes => {
      let sumNum = 0, sumDen = 0;
      for (const u of datos.unidades ?? []) {
        const arr = datos.datos?.[indSel]?.[u] ?? [];
        const reg = arr.find(r => r.mes === mes);
        sumNum += reg?.numerador   ?? 0;
        sumDen += reg?.denominador ?? 0;
      }
      const tasa = sumDen > 0 ? (sumNum / sumDen) * factor : 0;
      return {
        mes: MESES_CORTOS[parseInt(mes) - 1],
        tasa, numerador: sumNum, denominador: sumDen,
        color: calcularColorIAAS(tasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      };
    });
  }

  const arr = datos.datos?.[indSel]?.[unidadSel] ?? [];
  return datos.meses_con_datos.map(mes => {
    const reg = arr.find(r => r.mes === mes);
    return {
      mes:         MESES_CORTOS[parseInt(mes) - 1],
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? 0,
      denominador: reg?.denominador ?? 0,
      color:       reg?.color       ?? 'Rojo',
    };
  });
}

/**
 * Devuelve los puntos de la gráfica de todas las unidades en un mes específico + TOTAL OOAD.
 * @param {Object} datos - Datos crudos de la API
 * @param {string} mesSel - Mes seleccionado en formato "MM"
 * @param {string} indSel - Indicador seleccionado
 * @param {Object} indInfo - Metadatos del indicador
 * @param {Object} sem - Umbrales de semáforo
 * @param {Object} unidadTipoMap - Mapa unidad → tipo para IAAS 01
 * @returns {Array<{unidad:string, tasa:number, numerador:number, denominador:number, color:string}>}
 */
export function buildChartDataMes(datos, mesSel, indSel, indInfo, sem, unidadTipoMap) {
  if (!datos?.unidades || !mesSel) return [];
  const factor = indInfo?.semaforo?.Tasa ?? 100;
  let grandNum = 0, grandDen = 0;

  const porUnidad = datos.unidades.map(u => {
    const arr = datos.datos?.[indSel]?.[u] ?? [];
    const reg = arr.find(r => r.mes === mesSel);
    grandNum += reg?.numerador   ?? 0;
    grandDen += reg?.denominador ?? 0;
    return {
      unidad:      u,
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? 0,
      denominador: reg?.denominador ?? 0,
      color:       reg?.color       ?? 'Rojo',
    };
  });

  const grandTasa = grandDen > 0 ? (grandNum / grandDen) * factor : 0;
  return [
    ...porUnidad,
    {
      unidad: TOTAL_KEY, tasa: grandTasa,
      numerador: grandNum, denominador: grandDen,
      color: calcularColorIAAS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
    },
  ];
}
