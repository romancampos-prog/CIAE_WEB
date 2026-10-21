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
