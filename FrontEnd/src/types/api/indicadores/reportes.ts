// Lo que responde src/api/indicadores/reportesApi.ts (copia de los modelos del backend).

// propios
import type { FichaIndicador } from '@/types/api/indicadores/informacion';

export type Desempeno = 'Esperado' | 'Medio' | 'Bajo' | 'Gris';

/** Una unidad en un mes, tal cual se guardó en BD_CIAE ("%" = resultado). */
export interface UnidadDatos {
  numerador: number | null;
  denominador: number | null;
  desempeno: Desempeno;
  '%': number | null;
}

export interface MesReporte {
  Poblacion?: string | null;
  Reporte: Record<string, UnidadDatos>;
}

export interface ReporteIndicador {
  INDICADOR: string;
  ANIO: number;
  MESES: Record<string, MesReporte>;
  /** Semanal (previo): el mes que todavía no cierra. */
  SEMANA?: { SEMANA: number; MES: Record<string, MesReporte> } | null;
  MENSUAL_ACUMULADO?: Record<string, MesReporte> | null;
}

export interface ResumenMes {
  mes: string;
  /** true = el mes del semanal, aún sin cerrar (datos parciales). */
  parcial: boolean;
  estatal: number | null;
  numerador: number | null;
  denominador: number | null;
  desempenoEstatal: Desempeno;
  meta: string | null;
  /** Qué dirección del resultado es mejor; null en rangos. */
  mejora: 'mas' | 'menos' | null;
  unidades: Record<Desempeno, number>;
  unidadesConDato: number;
}

export interface CeldaMapaCalor {
  resultado: number | null;
  desempeno: Desempeno;
}

export interface EstadisticasGrafica {
  resumenPorMes: ResumenMes[];
  /** Lo mismo con el acumulado (null si el indicador no tiene): se usa con el switch Acumulado. */
  resumenAcumuladoPorMes: ResumenMes[] | null;
  mapaCalor: {
    meses: string[];
    filas: { unidad: string; valores: (CeldaMapaCalor | null)[] }[];
  };
}

/** {texto, valor} si la meta es un límite; {texto, minimo, maximo} si es un rango. */
export interface MetaNumerica {
  texto: string;
  valor?: number;
  minimo?: number;
  maximo?: number;
}

export type TipoMeta = 'mas' | 'menos' | 'rango' | null;

export interface CorteUnidad {
  resultado: number | null;
  desempeno: Desempeno;
  numerador: number | null;
  denominador: number | null;
}

export interface SerieCortes {
  cortes: { mes: string; anio: number; unidades: Record<string, CorteUnidad> }[];
  /** enCurso = ese mes ya cuenta para el siguiente corte. */
  casosPorMes: { mes: string; anio: number; enCurso?: boolean; unidades: Record<string, number | null> }[];
}

/** Un tramo del semáforo en números (services/grafica/franjas_semaforo_Services.py); null = sin límite. */
export interface Franja {
  desde: number | null;
  hasta: number | null;
  nivel: Desempeno;
}

export interface PerfilIndicador {
  tipoMeta: TipoMeta;
  niveles: Desempeno[];
  metaPorMes: Record<string, MetaNumerica | null>;
  metaDeUnidad: Record<string, MetaNumerica | null> | null;
  /** Las franjas del semáforo de cada mes (de abajo hacia arriba): la gráfica se dibuja sobre ellas. */
  franjasPorMes: Record<string, Franja[]>;
  /** Cuando el semáforo va por grupo (IAAS 01): las franjas de cada unidad. */
  franjasDeUnidad: Record<string, Franja[]> | null;
  unidadMedida: '%' | 'por 1,000' | 'por 100,000' | 'promedio' | null;
  etiquetaNumerador: string | null;
  etiquetaDenominador: string | null;
  esCorte: boolean;
  serieCortes: SerieCortes | null;
}

export interface GraficaIndicadorDTO {
  ficha: FichaIndicador | null;
  reporte: ReporteIndicador | null;
  estadisticas: EstadisticasGrafica | null;
  perfil: PerfilIndicador | null;
}
