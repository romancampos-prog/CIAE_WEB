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
  /** Qué significa cada clave UP del filtro (mapeo/ftp/catalogos/claves_up.json del backend). */
  descripcionClaves: Record<string, DescripcionClave>;
  /** Estatus de seguimiento de cada registro: { "_id" de la fila: clave del catálogo }. */
  estatus: Record<string, string>;
  /** Los estatus posibles (mapeo/ftp/catalogos/estatus_acciones.json), en orden. */
  catalogoEstatus: EstatusAccion[];
  /** Solo admin: los registros que ya tienen su estudio (Excel) guardado, { "_id": estudio }. */
  estudios: Record<string, EstudioAccion>;
  /** Solo admin: Excel que alguien puso en la carpeta de estudios y no son de ningún registro (rutas). */
  estudiosSinRegistro?: string[];
  /** Como se muestra cada columna en el encabezado (del mapeo); "\n" = salto de renglón. Sin etiqueta, su nombre. */
  etiquetasColumna?: Record<string, string>;
  /** Qué ícono lleva cada columna en la tarjeta del registro (del mapeo): unidad, calendario, credencial, etiqueta, persona, clave. */
  iconosColumna?: Record<string, string>;
}

/** El estudio guardado de un registro (BD_CIAE/.../ESTUDIOS/{año}/{unidad}/{mes}/). */
export interface EstudioAccion {
  ruta: string;
  nombreOriginal: string;
  fecha: string;
  usuario: string;
}

/** Un estatus de seguimiento; `nivel` = su color del semáforo (Bajo rojo, Medio dorado, Esperado verde). */
export interface EstatusAccion {
  clave: string;
  nombre: string;
  nivel: 'Esperado' | 'Medio' | 'Bajo';
  /** true en el estatus en que se sube el estudio (Con estudio). */
  permiteEstudio?: boolean;
}

export interface DescripcionClave {
  descripcion: string;
  /** Tema de la clave (ej. "Prevención de VIH/SIDA e ITS"). */
  subgrupo: string | null;
  /** Color de la clave en pantalla (mapeo/ftp/catalogos/colores_claves.json); null = gris. */
  color: string | null;
}

/** GET /epidemiologia/ftp/extraccion/OC30/periodos: un mes con extracción guardada. */
export interface PeriodoExtraccion {
  mes: number;
  definitivo: boolean;
  /** Última semana previa guardada; se muestra mientras no hay definitivo. */
  ultimaSemana: number | null;
}

/** GET /epidemiologia/ftp/excel/OC30 (dentro de ApiResponse): el Excel del rango de fechas en base64. */
export interface ExcelExtraccion {
  archivo_b64: string;
  nombre_archivo: string;
  totalRegistros: number;
}
