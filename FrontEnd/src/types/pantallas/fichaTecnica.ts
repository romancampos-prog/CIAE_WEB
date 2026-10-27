// Cómo se describe en la ficha técnica el cálculo de un indicador (operacionParser).

// propios
import type { ConfigArchivo } from '@/types/api/indicadores/informacion';

/** Cómo se lee una fuente: la config de un archivo o la lista de grupos de edad (población). */
export type ConfigFuente = ConfigArchivo | string[];

export interface GrupoCols {
  cols: string[];
  prev: string | null;
}

export interface FuenteAgrupada {
  id: string;
  hoja: string;
  cfg: ConfigFuente | null;
  grupos: GrupoCols[];
}

export interface CalculoParseado {
  tipo: 'normal' | 'producto';
  fuentes: FuenteAgrupada[];
  operacion: string;
  resumen: string;
}

/** Texto plano o un grupo de códigos que el front pinta como chips. */
export type Segmento = string | { codigos: (string | number)[] };

export interface DescripcionFiltro {
  hoja?: string;
  condiciones: Segmento[];
  cruce: Segmento[] | null;
}

export type FuenteDescrita =
  | ({ tipo: 'filtro' } & DescripcionFiltro)
  | { tipo: 'formula' }
  | { tipo: 'sin_desglose'; fuente: string };
