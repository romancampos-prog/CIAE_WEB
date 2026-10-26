// Lo que manda GET /Indicadores/reportes/{indicador}/grafica. Copia de BackEnd/indicadores/
// schemas/model/reporte_guardado_Model.py y services/grafica/*: si cambia allá, cambiar aquí.

// propios
import type { FichaIndicador } from '@/features/indicadores';

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
  estatal: number | null;
  desempenoEstatal: Desempeno;
  cambio: number | null;
  meta: string | null;
  /** Qué dirección del resultado es mejor; null en rangos. */
  mejora: 'mas' | 'menos' | null;
  brechaAplica: boolean;
  unidades: Record<Desempeno, number>;
  unidadesConDato: number;
  acumulado: number | null;
  desempenoAcumulado: Desempeno | null;
}

export interface BrechaUnidad {
  unidad: string;
  resultado: number | null;
  desempeno: Desempeno;
  meta: string | null;
  sentido: 'faltan' | 'sobran';
  casos: number;
}

export interface CeldaMapaCalor {
  resultado: number | null;
  desempeno: Desempeno;
}

export interface EstadisticasGrafica {
  resumenPorMes: ResumenMes[];
  mapaCalor: {
    meses: string[];
    filas: { unidad: string; valores: (CeldaMapaCalor | null)[] }[];
  };
  brechas: Record<string, BrechaUnidad[]>;
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

export interface PerfilIndicador {
  tipoMeta: TipoMeta;
  niveles: Desempeno[];
  metaPorMes: Record<string, MetaNumerica | null>;
  metaDeUnidad: Record<string, MetaNumerica | null> | null;
  unidadMedida: '%' | 'por 1,000' | 'por 100,000' | 'promedio' | null;
  esCorte: boolean;
  umbralDenominadorChico: number | null;
  serieCortes: SerieCortes | null;
}

export interface GraficaIndicadorDTO {
  ficha: FichaIndicador | null;
  reporte: ReporteIndicador | null;
  estadisticas: EstadisticasGrafica | null;
  perfil: PerfilIndicador | null;
}

/** Una unidad en un mes, ya lista para pintar. */
export interface FilaUnidad {
  unidad: string;
  resultado: number | null;
  numerador: number | null;
  denominador: number | null;
  desempeno: Desempeno;
}

/** Un mes de la tendencia de una unidad. */
export interface PuntoSerie {
  mes: string;
  resultado: number | null;
  desempeno: Desempeno;
  numerador: number | null;
  denominador: number | null;
  estatal: number | null;
  meta: MetaNumerica | null;
  parcial: boolean;
}

export type VistaGrafica = 'tendencia' | 'comparar' | 'mapa';

/** Una columna de ColumnasTendencia (un mes o un corte). */
export interface PuntoColumna {
  clave: string;
  etiqueta: string;
  etiquetaLarga?: string;
  titulo: string;
  valorTexto: string;
  extra: string;
  resultado: number | null;
  desempeno: Desempeno;
  numerador: number | null;
  denominador: number | null;
  meta: MetaNumerica | null;
  estatal: number | null;
  parcial?: boolean;
}
