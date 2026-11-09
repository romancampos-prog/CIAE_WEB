// propios
import type { FichaIndicador, MetasSemaforo, Umbral } from '@/types/api/indicadores/informacion';
import type { EstadoMes, TextosSemaforo, TipoReporte } from '@/types/pantallas/generarFtp';

// Umbrales de semáforo pueden venir en formato legado (número puro, ej. 1.7)
// o explícito (texto con operador, ej. "<= 1.7") -- ver services/compartido/semaforo/ del backend.
function numeroDeUmbral(valor: Umbral | null | undefined): number {
  if (typeof valor === 'number') return valor;
  const m = String(valor).match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : NaN;
}
function textoDeUmbral(valor: Umbral | null | undefined, operadorLegado: string): string {
  return typeof valor === 'string' ? valor : `${operadorLegado} ${valor}`;
}

interface ContextoFecha {
  anioActual: number;
  esVisor: boolean;
  diaActual: number;
  mesActualNum: number;
  tipo: TipoReporte;
}

// El día del mes en curso desde el que se puede elegir ese mes; null = desde el día 1
const diaDeApertura = (esVisor: boolean, tipo: TipoReporte): number | null => {
  if (esVisor) return 30;
  return tipo === 'final' ? 26 : null;
};

/**
 * Filtra los meses disponibles para selección según el año, el rol y la fecha actual.
 * - Visor: el mes en curso, desde el día 30
 * - Tipo final: el mes en curso, desde el día 26
 * - Tipo previo: el mes en curso, desde el día 1
 * @param todosLosMeses entradas [clave, nombre] de MESES_LARGOS
 */
export function calcularMesesDisponibles(
  todosLosMeses: [string, string][],
  anoSel: string,
  { anioActual, esVisor, diaActual, mesActualNum, tipo }: ContextoFecha,
): [string, string][] {
  if (parseInt(anoSel) !== anioActual) return todosLosMeses;
  const dia = diaDeApertura(esVisor, tipo);
  const limite = dia === null || diaActual >= dia ? mesActualNum : mesActualNum - 1;
  return todosLosMeses.filter(([k]) => parseInt(k) > 0 && parseInt(k) <= limite);
}

/**
 * Los 12 meses en orden con su estado. Se ordenan aquí porque Object.entries pone las claves
 * "10", "11" y "12" antes que "01"..."09".
 * @param disponibles los meses que sí se pueden elegir
 * @param generados   los que ya tienen reporte final
 */
export function calcularEstadoMeses(
  todosLosMeses: [string, string][],
  disponibles: [string, string][],
  anoSel: string,
  { anioActual, esVisor, mesActualNum, tipo }: ContextoFecha,
  generados: string[],
): EstadoMes[] {
  const abiertos = new Set(disponibles.map(([k]) => k));
  const dia = diaDeApertura(esVisor, tipo);

  return [...todosLosMeses].sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([clave, nombre]) => {
    if (abiertos.has(clave)) {
      return generados.includes(clave)
        ? { clave, nombre, disponible: true, tipo: 'generado', estado: 'Generado' }
        : { clave, nombre, disponible: true, tipo: 'disponible', estado: tipo === 'previo' ? 'Sin cerrar' : 'Por generar' };
    }
    if (generados.includes(clave)) return { clave, nombre, disponible: false, tipo: 'cerrado', estado: 'Cerrado' };
    const esMesEnCurso = parseInt(anoSel) === anioActual && parseInt(clave) === mesActualNum;
    return esMesEnCurso && dia !== null
      ? { clave, nombre, disponible: false, tipo: 'espera', estado: `Desde el ${dia}` }
      : { clave, nombre, disponible: false, tipo: 'futuro', estado: 'Aún no' };
  });
}

/** Avisa cuándo se abre el mes en curso; null si ya se puede elegir o se está viendo otro año. */
export function avisoDeApertura(
  anoSel: string,
  { anioActual, esVisor, diaActual, mesActualNum, tipo }: ContextoFecha,
  nombresDeMes: Record<string, string>,
): string | null {
  const dia = diaDeApertura(esVisor, tipo);
  if (dia === null || parseInt(anoSel) !== anioActual || diaActual >= dia) return null;
  const mes = nombresDeMes[String(mesActualNum).padStart(2, '0')];
  return esVisor ? `${mes} se abre el día ${dia}.` : `El Final de ${mes} se abre el día ${dia}. Para verlo antes, usa Previo.`;
}

/**
 * Calcula el texto de semáforo (Verde/Amarillo/Rojo) a mostrar para un indicador y mes.
 * Soporta semáforos con umbrales mensuales y semáforos globales, en ambas direcciones.
 * @param mes clave de mes en formato "MM" (puede ser vacío)
 * @param mesesLargos mapa "MM" → nombre de mes
 */
export function calcularSemDataFTP(
  infoIndicador: FichaIndicador | null,
  mes: string,
  mesesLargos: Record<string, string>,
): TextosSemaforo | null {
  if (!infoIndicador?.semaforo) return null;
  const mesTexto = mesesLargos[mes];
  const porMes   = infoIndicador.semaforo as Record<string, MetasSemaforo>;
  const sem: MetasSemaforo = (mesTexto && porMes[mesTexto])
    ? porMes[mesTexto] : infoIndicador.semaforo as MetasSemaforo;
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
