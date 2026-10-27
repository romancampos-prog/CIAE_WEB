// propios
import type { FichaIndicador, MetasSemaforo, Umbral } from '@/types/api/indicadores/informacion';
import type { TextosSemaforo, TipoReporte } from '@/types/pantallas/generarFtp';

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

/**
 * Filtra los meses disponibles para selección según el año, el rol y la fecha actual.
 * - Visor: disponible hasta el día 30 del mes actual
 * - Tipo final: disponible hasta el día 26 del mes actual
 * - Tipo previo: disponible hasta el mes en curso
 * @param todosLosMeses entradas [clave, nombre] de MESES_LARGOS
 */
export function calcularMesesDisponibles(
  todosLosMeses: [string, string][],
  anoSel: string,
  { anioActual, esVisor, diaActual, mesActualNum, tipo }: ContextoFecha,
): [string, string][] {
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
