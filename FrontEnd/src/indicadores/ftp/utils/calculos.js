import { MESES_CORTOS, MESES_LARGOS_ARR } from '../../shared/constantes/meses';

// Umbrales de semáforo pueden venir en formato legado (número puro, ej. 1.7)
// o explícito (texto con operador, ej. "<= 1.7") -- ver shared/semaforo_service.py.
export function numeroDeUmbral(valor) {
  if (typeof valor === 'number') return valor;
  const m = String(valor).match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : NaN;
}
export function textoDeUmbral(valor, operadorLegado) {
  return typeof valor === 'string' ? valor : `${operadorLegado} ${valor}`;
}

// Indicadores "Trimestral Acumulado" (ej. CACU 04) no reportan mes a mes --
// cada punto que sí tiene dato es un corte acumulado desde enero, así que la
// etiqueta debe decir "Ene - Mar" y no solo "Mar" para no confundirlo con un
// indicador mensual normal.
export function esTrimestralAcumulado(indInfo) {
  return /trimestral/i.test(indInfo?.periodicidad ?? '');
}

function etiquetaMes(mesNum, indInfo) {
  const mesCorto = MESES_CORTOS[mesNum - 1];
  return esTrimestralAcumulado(indInfo) ? `Ene - ${mesCorto}` : mesCorto;
}

/** Igual que etiquetaMes pero con el nombre completo del mes (ej. "Enero - Marzo"). */
export function etiquetaMesLarga(mesNum, indInfo) {
  const larga = MESES_LARGOS_ARR[mesNum - 1];
  return esTrimestralAcumulado(indInfo) ? `Enero - ${larga}` : larga;
}

/** Igual que etiquetaMes pero exportada para usar fuera de calculos.js. */
export function etiquetaMesCorta(mesNum, indInfo) {
  return etiquetaMes(mesNum, indInfo);
}

/**
 * Construye los puntos de la gráfica de tendencia mensual para una unidad FTP.
 * Soporta datos semanales (campo `semana` en el registro) e indicadores
 * trimestrales acumulados (etiqueta "Ene - Mar" en vez de "Mar").
 * @param {Object} datos - Datos crudos de la API (meses_con_datos, datos por unidad)
 * @param {string} unidadSel - Clave de la unidad seleccionada
 * @param {Object|null} [indInfo] - Ficha del indicador (para detectar periodicidad trimestral)
 * @returns {Array<{mes:string, mesNum:number, tasa:number, numerador:number, denominador:number, color:string, esSemana:boolean, semana:number|null}>}
 */
export function buildFTPChartDataUnidad(datos, unidadSel, indInfo) {
  if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
  const arr = datos.datos?.[unidadSel] ?? [];
  return datos.meses_con_datos.map(mes => {
    const reg      = arr.find(r => r.mes === mes);
    const esSemana = !!reg?.semana;
    const mesNum   = parseInt(mes);
    const etiqueta = etiquetaMes(mesNum, indInfo);
    return {
      mes:         esSemana ? `S${reg.semana}·${etiqueta}` : etiqueta,
      mesNum,
      tasa:        reg?.tasa        ?? 0,
      numerador:   reg?.numerador   ?? null,
      denominador: reg?.denominador ?? null,
      color:       reg?.color       ?? 'Gris',
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
      numerador:   reg?.numerador   ?? null,
      denominador: reg?.denominador ?? null,
      color:       reg?.color       ?? 'Gris',
    };
  });
  const sinTotal = rows.filter(r => r.unidad !== 'TOTAL_OOAD');
  const total    = rows.find(r => r.unidad === 'TOTAL_OOAD');
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
 * @returns {{Esperado:string, Medio:string, Bajo:string, _mes:string}|null}
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
  const espNum    = numeroDeUmbral(esp);
  const criticoNum = numeroDeUmbral(critico);
  const sinMedio  = espNum === criticoNum;
  if (sinMedio) {
    return tieneAlto
      ? { Esperado: textoDeUmbral(esp, '≤'), Bajo: textoDeUmbral(critico, '>'), _mes: nombreMes }
      : { Esperado: textoDeUmbral(esp, '≥'), Bajo: textoDeUmbral(critico, '<'), _mes: nombreMes };
  }
  return tieneAlto
    ? { Esperado: textoDeUmbral(esp, '≤'), Medio: `> ${espNum} – < ${criticoNum}`, Bajo: textoDeUmbral(critico, '≥'), _mes: nombreMes }
    : { Esperado: textoDeUmbral(esp, '≥'), Medio: `> ${criticoNum} – < ${espNum}`, Bajo: textoDeUmbral(critico, '≤'), _mes: nombreMes };
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
  const critico = esDesc ? sem.Alto : sem.Bajo;
  const espNum    = numeroDeUmbral(sem.Esperado);
  const criticoNum = numeroDeUmbral(critico);
  const sinMedio  = espNum === criticoNum;
  if (sinMedio) {
    return {
      txtVerde: `${textoDeUmbral(sem.Esperado, '≤')}%`,
      txtAmarillo: null,
      txtRojo: `${textoDeUmbral(critico, esDesc ? '>' : '<')}%`,
    };
  }
  return {
    txtVerde:    `${textoDeUmbral(sem.Esperado, esDesc ? '≤' : '≥')}%`,
    txtAmarillo: esDesc ? `> ${espNum}% — < ${criticoNum}%` : `> ${criticoNum}% — < ${espNum}%`,
    txtRojo:     `${textoDeUmbral(critico, esDesc ? '≥' : '≤')}%`,
  };
}
