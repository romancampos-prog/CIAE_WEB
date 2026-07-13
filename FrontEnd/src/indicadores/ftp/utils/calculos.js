import { MESES_CORTOS } from '../../shared/constantes/meses';

/**
 * Construye los puntos de la gráfica de tendencia mensual para una unidad FTP.
 * Soporta datos semanales (campo `semana` en el registro).
 * @param {Object} datos - Datos crudos de la API (meses_con_datos, datos por unidad)
 * @param {string} unidadSel - Clave de la unidad seleccionada
 * @returns {Array<{mes:string, mesNum:number, tasa:number, numerador:number, denominador:number, color:string, esSemana:boolean, semana:number|null}>}
 */
export function buildFTPChartDataUnidad(datos, unidadSel) {
  if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
  const arr = datos.datos?.[unidadSel] ?? [];
  return datos.meses_con_datos.map(mes => {
    const reg      = arr.find(r => r.mes === mes);
    const esSemana = !!reg?.semana;
    const mesCorto = MESES_CORTOS[parseInt(mes) - 1];
    return {
      mes:         esSemana ? `S${reg.semana}·${mesCorto}` : mesCorto,
      mesNum:      parseInt(mes),
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? 0,
      denominador: reg?.denominador ?? 0,
      color:       reg?.color       ?? 'Rojo',
      esSemana,
      semana:      reg?.semana      ?? null,
    };
  });
}

/**
 * Construye los puntos de la gráfica de todas las unidades en un mes específico.
 * Garantiza que TOTAL aparece al final si existe.
 * @param {Object} datos - Datos crudos de la API
 * @param {string} mesSel - Mes seleccionado en formato "MM"
 * @returns {Array<{unidad:string, tasa:number, numerador:number, denominador:number, color:string}>}
 */
export function buildFTPChartDataMes(datos, mesSel) {
  if (!datos?.unidades || !mesSel) return [];
  const rows = datos.unidades.map(u => {
    const arr = datos.datos?.[u] ?? [];
    const reg = arr.find(r => r.mes === mesSel);
    return {
      unidad:      u,
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? 0,
      denominador: reg?.denominador ?? 0,
      color:       reg?.color       ?? 'Rojo',
    };
  });
  const sinTotal = rows.filter(r => r.unidad !== 'TOTAL');
  const total    = rows.find(r => r.unidad === 'TOTAL');
  return total ? [...sinTotal, total] : sinTotal;
}

/**
 * Calcula los rangos de semáforo de un indicador FTP para un mes concreto.
 * Cuando el semáforo tiene umbrales por mes (ej. CACU), los extrae para ese mes;
 * si no, usa los umbrales globales. Determina si el indicador es "descendente" (Alto)
 * o "ascendente" (Bajo) para generar los textos correctos.
 * @param {Object|null} indInfo - Metadatos del indicador (contiene `semaforo`)
 * @param {number} mesParaSem - Número de mes (1–12) para buscar umbrales mensuales
 * @param {string[]} MESES_LARGOS_ARR - Array de nombres de meses en orden (Enero…Diciembre)
 * @returns {{Verde:string, Amarillo:string, Rojo:string, _mes:string}|null}
 */
export function calcularRangosFTP(indInfo, mesParaSem, MESES_LARGOS_ARR) {
  const sem = indInfo?.semaforo;
  if (!sem) return null;
  const nombreMes = MESES_LARGOS_ARR[mesParaSem - 1];
  const limites   = (nombreMes && sem[nombreMes]) ? sem[nombreMes] : sem;
  const esp       = limites?.Esperado;
  if (esp === undefined) return null;
  const tieneAlto = 'Alto' in limites;
  const critico   = tieneAlto ? limites.Alto : limites.Bajo;
  return tieneAlto
    ? { Verde: `≤ ${esp}`, Amarillo: `> ${esp} – < ${critico}`, Rojo: `≥ ${critico}`, _mes: nombreMes }
    : { Verde: `≥ ${esp}`, Amarillo: `> ${critico} – < ${esp}`, Rojo: `≤ ${critico}`, _mes: nombreMes };
}

/**
 * Filtra los meses disponibles para selección según el año, el rol y la fecha actual.
 * - Visor: disponible hasta el día 30 del mes actual
 * - Tipo final: disponible hasta el día 26 del mes actual
 * - Tipo previo: disponible hasta el mes en curso
 * @param {Array<[string, string]>} todosLosMeses - Todas las entradas [clave, nombre] de MESES_LARGOS
 * @param {string} anoSel - Año seleccionado
 * @param {{ anioActual:number, esVisor:boolean, diaActual:number, mesActualNum:number, tipo:string }} ctx
 * @returns {Array<[string, string]>} Meses filtrados
 */
export function calcularMesesDisponibles(todosLosMeses, anoSel, { anioActual, esVisor, diaActual, mesActualNum, tipo }) {
  if (parseInt(anoSel) !== anioActual) return todosLosMeses;
  let limite;
  if (esVisor) {
    limite = diaActual >= 30 ? mesActualNum : mesActualNum - 1;
  } else if (tipo === 'final') {
    limite = diaActual >= 26 ? mesActualNum : mesActualNum - 1;
  } else {
    limite = mesActualNum;
  }
  return todosLosMeses.filter(([k]) => parseInt(k) > 0 && parseInt(k) <= limite);
}

/**
 * Calcula el texto de semáforo (Verde/Amarillo/Rojo) a mostrar para un indicador y mes.
 * Soporta semáforos con umbrales mensuales y semáforos globales, en ambas direcciones.
 * @param {Object|null} infoIndicador - Metadatos del indicador
 * @param {string} mes - Clave de mes en formato "MM" (puede ser vacío)
 * @param {Object<string,string>} MESES_LARGOS - Mapa "MM" → nombre de mes
 * @returns {{txtVerde:string, txtAmarillo:string, txtRojo:string}|null}
 */
export function calcularSemDataFTP(infoIndicador, mes, MESES_LARGOS) {
  if (!infoIndicador?.semaforo) return null;
  const mesTexto = MESES_LARGOS[mes];
  const sem      = (mesTexto && infoIndicador.semaforo[mesTexto])
    ? infoIndicador.semaforo[mesTexto] : infoIndicador.semaforo;
  if (!sem || (sem.Bajo === undefined && sem.Esperado === undefined)) return null;
  const esDesc = sem.Alto !== undefined;
  return {
    txtVerde:    esDesc ? `≤ ${sem.Esperado}%` : `≥ ${sem.Esperado}%`,
    txtAmarillo: esDesc ? `> ${sem.Esperado}% — < ${sem.Alto}%` : `> ${sem.Bajo}% — < ${sem.Esperado}%`,
    txtRojo:     esDesc ? `≥ ${sem.Alto}%`     : `≤ ${sem.Bajo}%`,
  };
}
