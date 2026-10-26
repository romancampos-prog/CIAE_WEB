// Lo que manda el backend en Generar FTP. Copia de BackEnd/indicadores/schemas/model/
// pagina_generar_Model.py, generacion_ftp_Model.py y poblacion_Model.py (si cambian allá, cambiar aquí).

/** GET /Indicadores/ftp/indicadores (modelo IndicadorGenerarFTP). */
export interface IndicadorGenerarFtp {
  indicador: string;
  categoria: string;
  nombreCategoria: string;
  titulo: string;
  periodicidad: string;
  descripcionPeriodicidad?: string | null;
  peridocidadGenerada: Record<string, boolean>;
  previos: boolean;
  imagen: string;
  color: string;
  /** Códigos SIAIS que lee, ej. ["CP02", "CP03"]. */
  reportes: string[];
}

/** Los indicadores agrupados por familia, como los navega la página. */
export interface FamiliaFtp {
  categoriaIndicador: string;
  nombreCategoria: string;
  imagen: string;
  color: string;
  indicadores: string[];
}

/** previo = semanal; final = el mes cerrado. */
export type TipoReporte = 'previo' | 'final';

/** El periodo a generar: mes "01".."12" y semana "1".."5" (solo en previo). */
export interface PeriodoFtp {
  ano: string;
  mes: string;
  semana: string | null;
}

export interface RutaAfectada {
  reportes: string[];
  ruta: string;
}

/** Un tipo de error de extracción (ej. RUTA_INVALIDA) con las unidades y rutas que lo tuvieron. */
export interface ErrorExtraccion {
  nombreError: string;
  descripcionError: string;
  unidades: Record<string, RutaAfectada[]>;
}

/** Las "restricciones" que muestra el modal: un ErrorExtraccion por tipo. */
export type Restricciones = Record<string, ErrorExtraccion>;

export interface ResultadoIndicadorFtp {
  restricciones: Restricciones;
}

export interface ResultadoCategoriaFtp {
  completados: string[];
  errores: Record<string, string | Restricciones>;
  restricciones: Restricciones;
}

/** Textos de los rangos del semáforo para el mes elegido. */
export interface TextosSemaforo {
  txtVerde: string;
  txtAmarillo: string | null;
  txtRojo: string;
}

// ── Población ────────────────────────────────────────────────────────────────

export interface ArchivoPoblacion {
  nombre_sin_ext: string | null;
  mes_detectado: string | null;
  anio_detectado: number | null;
}

export interface ResultadoCargaPoblacion {
  nombre: string;
  nombre_sin_ext: string;
  unidades: number;
  no_encontradas: string[];
  extras: string[];
  celdas_vacias: number;
  errores_datos: { unidad: string; grupo: string; columna: string }[];
  alias_sugeridos: Record<string, string>;
  mes_detectado: string | null;
  anio_detectado: number | null;
  advertencia_titulo: string | null;
}

export interface ResultadoRecalculoPoblacion {
  total: number;
  recalculados: { indicador: string; meses: number; detalle: string }[];
  errores: string[];
  cortes_extractor: { indicador: string; corte: string }[];
}
