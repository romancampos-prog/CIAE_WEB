// Pantalla de Generar Extractor: indicador con su ícono, panel de subida y estados de cada mes.

// propios
import type { IndicadorGenerarExtractor, ResultadoIndicadorExtractor } from '@/types/api/indicadores/extractor';

/** El indicador con la URL de su ícono ya resuelta. */
export interface IndicadorExtractor extends IndicadorGenerarExtractor {
  icono: string | null;
}

/** El archivo y mes elegidos en la tabla, para el panel de subida. */
export interface PanelSubida {
  archivo: string;
  tipo: 'principal' | 'cruce';
  prefijo: string;
  mes: string;
}

// Tipos propios de la pantalla (lo que responde el backend está en src/api/).

export interface ResultadoSubida {
  archivo: string;
  mes: string;
  anio: number;
  porIndicador: Record<string, ResultadoIndicadorExtractor>;
  mensaje: string;
}

export type ClaseEstado = 'ok' | 'parcial' | 'pendiente' | 'bloqueado' | 'previo' | 'futuro';
