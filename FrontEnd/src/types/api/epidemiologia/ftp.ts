// Lo que responde src/api/epidemiologia/ftpApi.ts (copia de lo que arma epidemiologia/services/ftp/).

import type { Restricciones } from '@/types/api/indicadores/ftp';

/** Una fila extraída: "Unidad" + las columnas de `seleccionar` del mapeo (mapeo/ftp/AccionesOC30.json). */
export type FilaExtraccion = Record<string, string | null>;

/** Una unidad cuyo reporte no se pudo bajar o leer, tal cual se guardó al extraer (POST); las demás siguen. */
export interface ErrorGuardado {
  /** Id de compartido/ftp_imss/catalogo_errores_ftp.py. */
  tipo: string;
  unidad: string;
  reporte: string;
  /** Ruta del FTP o mensaje del error. */
  detalle: string;
}

export interface ConteoValor {
  valor: string | null;
  cantidad: number;
}

/** epidemiologia/modulos/ftp/estadisticas_extraccion.py */
export interface EstadisticasExtraccion {
  totalRegistros: number;
  unidadesConRegistros: number;
  /** Una por columna del filtro del mapeo (ej. "Clave de la Acción"), de mayor a menor. */
  porColumna: { columna: string; conteos: ConteoValor[] }[];
  porUnidad: ConteoValor[];
}

/** POST /epidemiologia/ftp/extraer/OC30 (dentro de ApiResponse): lo que se acaba de guardar. */
export interface ExtraccionGuardada {
  extraccion: string;
  ano: number;
  /** "09": el mes con dos dígitos. */
  mes: string;
  /** null = definitivo del mes; número = previo de esa semana. */
  semana: number | null;
  filas: FilaExtraccion[];
  errores: ErrorGuardado[];
  /** Unidades que se leyeron bien pero no traen ninguna fila del filtro (no es error). */
  unidadesSinResultados: string[];
}

/** GET /epidemiologia/ftp/extraccion/OC30 (dentro de ApiResponse): errores con la forma de las restricciones de FTP ({} si no es admin) y estadísticas. */
export interface ExtraccionFtp extends Omit<ExtraccionGuardada, 'errores'> {
  errores: Restricciones;
  estadisticas: EstadisticasExtraccion;
  /** El filtroColumna del mapeo: qué columna y qué valores se extraen (ej. Clave de la Acción: UP87, UP407...). */
  filtrosMapeo: { columna: string; valores: string[] }[];
}

/** GET /epidemiologia/ftp/extraccion/OC30/periodos: un mes con extracción guardada. */
export interface PeriodoExtraccion {
  mes: number;
  definitivo: boolean;
  /** Última semana previa guardada; se muestra mientras no hay definitivo. */
  ultimaSemana: number | null;
}
