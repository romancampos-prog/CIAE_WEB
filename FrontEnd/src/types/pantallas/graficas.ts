// Pantalla de Gráficas: filas, puntos de la tendencia, vista y grupos del selector.

// propios
import type { Desempeno, MetaNumerica } from '@/types/api/indicadores/reportes';

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

// Tipos propios de la pantalla (lo que responde el backend está en src/api/).

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

export interface GrupoIndicadores {
  cat: string;
  color: string;
  icono: string | null;
  inds: string[];
}
